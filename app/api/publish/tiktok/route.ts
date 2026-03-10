import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { requireWorkspaceMember } from "@/lib/workspace";
import { readStoredFile } from "@/lib/storage";

const bodySchema = z.object({
  clipId: z.string().min(1),
  socialAccountIds: z.array(z.string().min(1)).min(1),
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).default([]),
});

// POST /api/publish/tiktok
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { clipId, socialAccountIds, caption, hashtags } = parsed.data;

  // Fetch clip and verify
  const clip = await db.clip.findUnique({
    where: { id: clipId },
    include: { sourceVideo: { select: { workspaceId: true } } },
  });
  if (!clip || !clip.videoPath) {
    return NextResponse.json({ error: "Clip not found or not generated" }, { status: 404 });
  }

  const workspaceId = clip.sourceVideo.workspaceId;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Verify accounts
  const accounts = await db.socialAccount.findMany({
    where: { id: { in: socialAccountIds }, workspaceId, platform: "TIKTOK", isActive: true },
  });
  if (accounts.length === 0) {
    return NextResponse.json({ error: "No valid TikTok accounts found" }, { status: 404 });
  }

  const fullCaption = [caption || clip.suggestedCaption || "", ...hashtags.map((h) => `#${h}`)].join(" ").trim();

  // Create publish logs
  const logs = await db.$transaction(
    accounts.map((account) =>
      db.publishLog.create({
        data: {
          workspaceId,
          clipId,
          socialAccountId: account.id,
          platform: "TIKTOK",
          caption: fullCaption,
          hashtags,
          publishStatus: "QUEUED",
          status: "PENDING",
        },
      })
    )
  );

  // Process each account
  const results: Array<{ logId: string; accountId: string; status: string; error?: string }> = [];

  for (const log of logs) {
    const account = accounts.find((a) => a.id === log.socialAccountId)!;
    try {
      const token = decrypt(account.accessToken!);
      const videoBuffer = await readStoredFile(clip.videoPath);

      // Step 1: Initialize upload
      await db.publishLog.update({
        where: { id: log.id },
        data: { publishStatus: "UPLOADING", status: "IN_PROGRESS" },
      });

      const initRes = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({
            post_info: {
              title: fullCaption.slice(0, 150),
              privacy_level: "SELF_ONLY", // Unaudited apps must post as private
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: "FILE_UPLOAD",
              video_size: videoBuffer.length,
              chunk_size: videoBuffer.length,
              total_chunk_count: 1,
            },
          }),
        }
      );

      const initData = (await initRes.json()) as {
        data?: { publish_id: string; upload_url: string };
        error?: { code: string; message: string };
      };

      if (initData.error || !initData.data) {
        throw new Error(initData.error?.message || "TikTok upload init failed");
      }

      // Step 2: Upload video
      const uploadRes = await fetch(initData.data.upload_url, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
          "Content-Type": "video/mp4",
        },
        body: new Uint8Array(videoBuffer),
      });

      if (!uploadRes.ok) {
        throw new Error(`TikTok upload failed: ${uploadRes.status}`);
      }

      // Step 3: Check status
      await db.publishLog.update({
        where: { id: log.id },
        data: { publishStatus: "PROCESSING" },
      });

      // Poll for completion (up to 2 minutes)
      let published = false;
      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));

        const statusRes = await fetch(
          "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ publish_id: initData.data.publish_id }),
          }
        );

        const statusData = (await statusRes.json()) as {
          data?: { status: string; publicaly_available_post_id?: string[] };
        };

        if (statusData.data?.status === "PUBLISH_COMPLETE") {
          const postId = statusData.data.publicaly_available_post_id?.[0];
          await db.publishLog.update({
            where: { id: log.id },
            data: {
              publishStatus: "PUBLISHED",
              status: "SUCCESS",
              platformPostId: postId || initData.data.publish_id,
              publishedAt: new Date(),
              executedAt: new Date(),
            },
          });
          await db.socialAccount.update({
            where: { id: account.id },
            data: { lastPostedAt: new Date() },
          });
          published = true;
          break;
        }

        if (statusData.data?.status === "FAILED") {
          throw new Error("TikTok reported publish failed");
        }
      }

      if (!published) {
        throw new Error("TikTok publish timed out");
      }

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
