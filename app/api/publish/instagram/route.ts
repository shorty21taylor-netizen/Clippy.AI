import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  clipId: z.string().min(1),
  socialAccountIds: z.array(z.string().min(1)).min(1),
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).default([]),
  videoUrl: z.string().url({ message: "A publicly accessible video URL is required for Instagram" }),
});

// POST /api/publish/instagram
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { clipId, socialAccountIds, caption, hashtags, videoUrl } = parsed.data;

  const clip = await db.clip.findUnique({
    where: { id: clipId },
    include: { sourceVideo: { select: { workspaceId: true } } },
  });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const workspaceId = clip.sourceVideo.workspaceId;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const accounts = await db.socialAccount.findMany({
    where: { id: { in: socialAccountIds }, workspaceId, platform: "INSTAGRAM", isActive: true },
  });
  if (accounts.length === 0) {
    return NextResponse.json({ error: "No valid Instagram accounts found" }, { status: 404 });
  }

  const fullCaption = [
    caption || clip.suggestedCaption || "",
    "",
    ...hashtags.map((h) => `#${h}`),
  ].join(" ").trim();

  const logs = await db.$transaction(
    accounts.map((account) =>
      db.publishLog.create({
        data: {
          workspaceId,
          clipId,
          socialAccountId: account.id,
          platform: "INSTAGRAM",
          caption: fullCaption,
          hashtags,
          publishStatus: "QUEUED",
          status: "PENDING",
        },
      })
    )
  );

  const results: Array<{ logId: string; accountId: string; status: string; error?: string }> = [];

  for (const log of logs) {
    const account = accounts.find((a) => a.id === log.socialAccountId)!;
    try {
      const token = decrypt(account.accessToken!);
      const igUserId = account.platformAccountId;
      if (!igUserId) throw new Error("No Instagram account ID");

      await db.publishLog.update({
        where: { id: log.id },
        data: { publishStatus: "UPLOADING", status: "IN_PROGRESS" },
      });

      // Step 1: Create media container
      const containerRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "REELS",
            video_url: videoUrl,
            caption: fullCaption,
            share_to_feed: true,
            access_token: token,
          }),
        }
      );

      const containerData = (await containerRes.json()) as {
        id?: string;
        error?: { message: string };
      };

      if (!containerData.id) {
        throw new Error(containerData.error?.message || "Failed to create media container");
      }

      const containerId = containerData.id;

      // Step 2: Poll container status (up to 5 minutes)
      await db.publishLog.update({
        where: { id: log.id },
        data: { publishStatus: "PROCESSING" },
      });

      let containerReady = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));

        const statusRes = await fetch(
          `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${token}`
        );
        const statusData = (await statusRes.json()) as {
          status_code: string;
        };

        if (statusData.status_code === "FINISHED") {
          containerReady = true;
          break;
        }
        if (statusData.status_code === "ERROR") {
          throw new Error("Instagram media processing failed");
        }
      }

      if (!containerReady) {
        throw new Error("Instagram media processing timed out");
      }

      // Step 3: Publish
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: token,
          }),
        }
      );

      const publishData = (await publishRes.json()) as {
        id?: string;
        error?: { message: string };
      };

      if (!publishData.id) {
        throw new Error(publishData.error?.message || "Failed to publish");
      }

      await db.publishLog.update({
        where: { id: log.id },
        data: {
          publishStatus: "PUBLISHED",
          status: "SUCCESS",
          platformPostId: publishData.id,
          publishedAt: new Date(),
          executedAt: new Date(),
        },
      });
      await db.socialAccount.update({
        where: { id: account.id },
        data: { lastPostedAt: new Date() },
      });

      results.push({ logId: log.id, accountId: account.id, status: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Publish failed";
      await db.publishLog.update({
        where: { id: log.id },
        data: {
          publishStatus: "FAILED",
          status: "FAILED",
          errorMessage: msg,
          executedAt: new Date(),
        },
      });
      results.push({ logId: log.id, accountId: account.id, status: "error", error: msg });
    }
  }

  return NextResponse.json({ results });
}
