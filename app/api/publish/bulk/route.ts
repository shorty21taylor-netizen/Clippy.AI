import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  clipId: z.string().min(1),
  socialAccountIds: z.array(z.string().min(1)).min(1),
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).default([]),
  videoUrl: z.string().url().optional(), // Required for Instagram accounts
});

// POST /api/publish/bulk — cross-platform staggered posting
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

  const accounts = await db.socialAccount.findMany({
    where: { id: { in: socialAccountIds }, workspaceId, isActive: true },
  });
  if (accounts.length === 0) {
    return NextResponse.json({ error: "No valid accounts found" }, { status: 404 });
  }

  // Check: Instagram accounts require a public videoUrl
  const igAccounts = accounts.filter((a) => a.platform === "INSTAGRAM");
  if (igAccounts.length > 0 && !videoUrl) {
    return NextResponse.json(
      { error: "videoUrl is required for Instagram accounts" },
      { status: 400 }
    );
  }

  const fullCaption = [
    caption || clip.suggestedCaption || "",
    "",
    ...hashtags.map((h) => `#${h}`),
  ].join(" ").trim();

  // Create all publish logs as QUEUED with staggered scheduledAt
  const now = Date.now();
  const logs = await db.$transaction(
    accounts.map((account, i) => {
      // First post immediately, then stagger 5-15 mins apart
      const delayMs = i === 0 ? 0 : (5 + Math.random() * 10) * 60 * 1000 * i;
      return db.publishLog.create({
        data: {
          workspaceId,
          clipId,
          socialAccountId: account.id,
          platform: account.platform,
          caption: fullCaption,
          hashtags,
          publishStatus: "QUEUED",
          status: "PENDING",
          scheduledAt: new Date(now + delayMs),
        },
        include: {
          socialAccount: {
            select: { id: true, platform: true, username: true, displayName: true },
          },
        },
      });
    })
  );

  return NextResponse.json({
    logs,
    publishLogIds: logs.map((l) => l.id),
    message: `Queued ${logs.length} posts across ${new Set(accounts.map((a) => a.platform)).size} platforms`,
  }, { status: 201 });
}
