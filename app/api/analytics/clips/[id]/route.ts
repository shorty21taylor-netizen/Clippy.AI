import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/clips/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clip = await db.clip.findUnique({
    where: { id },
    include: {
      sourceVideo: { select: { workspaceId: true, title: true } },
      publishLogs: {
        where: { publishStatus: "PUBLISHED" },
        include: {
          socialAccount: {
            select: { id: true, platform: true, username: true, displayName: true },
          },
          analytics: {
            orderBy: { fetchedAt: "desc" },
            take: 1, // Latest metrics per publish log
          },
        },
      },
    },
  });

  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(clip.sourceVideo.workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Aggregate across all platforms
  const totals = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  const perAccount: Array<{
    account: { id: string; platform: string; username: string; displayName: string | null };
    metrics: typeof totals;
    publishedAt: Date | null;
    platformPostId: string | null;
  }> = [];

  for (const log of clip.publishLogs) {
    const latest = log.analytics[0];
    const metrics = {
      views: latest?.views || 0,
      likes: latest?.likes || 0,
      comments: latest?.comments || 0,
      shares: latest?.shares || 0,
      saves: latest?.saves || 0,
    };

    totals.views += metrics.views;
    totals.likes += metrics.likes;
    totals.comments += metrics.comments;
    totals.shares += metrics.shares;
    totals.saves += metrics.saves;

    perAccount.push({
      account: log.socialAccount,
      metrics,
      publishedAt: log.publishedAt,
      platformPostId: log.platformPostId,
    });
  }

  return NextResponse.json({
    clip: {
      id: clip.id,
      title: clip.title,
      viralityScore: clip.viralityScore,
      clipType: clip.clipType,
      duration: clip.duration,
    },
    totals,
    perAccount,
    publishedCount: clip.publishLogs.length,
  });
}
