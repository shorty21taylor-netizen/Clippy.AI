import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/clips?workspaceId=xxx&timeRange=30d&sortBy=totalViews&clipType=HOT_TAKE&contentPieceId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const timeRange = searchParams.get("timeRange") || "30d";
  const sortBy = searchParams.get("sortBy") || "totalViews";
  const clipType = searchParams.get("clipType");
  const sourceVideoId = searchParams.get("sourceVideoId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const status = (err as {status?: number}).status ?? 500;
    const message = (err as {message?: string}).message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status });
  }

  const now = new Date();
  let periodStart: Date | null = null;
  if (timeRange !== "all") {
    const days = timeRange === "90d" ? 90 : timeRange === "14d" ? 14 : timeRange === "7d" ? 7 : 30;
    periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  // Fetch clips through sourceVideos belonging to this workspace
  try {
  const clips = await db.clip.findMany({
    where: {
      sourceVideo: { workspaceId },
      ...(clipType ? { clipType: clipType as never } : {}),
      ...(sourceVideoId ? { sourceVideoId } : {}),
    },
    select: {
      id: true,
      title: true,
      thumbnailPath: true,
      viralityScore: true,
      clipType: true,
      status: true,
      createdAt: true,
      sourceVideo: {
        select: { id: true, title: true },
      },
      publishLogs: {
        where: {
          publishStatus: "PUBLISHED",
          workspaceId,
          ...(periodStart ? { publishedAt: { gte: periodStart } } : {}),
        },
        select: {
          id: true,
          platform: true,
          publishedAt: true,
          socialAccountId: true,
          socialAccount: {
            select: { id: true, username: true, displayName: true, platform: true },
          },
          analytics: {
            orderBy: { fetchedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Aggregate per-clip stats
  const result = clips.map((clip) => {
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;
    let engagementRateSum = 0;
    let engagementCount = 0;
    const tiktokAccounts = new Set<string>();
    const instagramAccounts = new Set<string>();

    const perAccountBreakdown = clip.publishLogs.map((log) => {
      const latest = log.analytics[0];
      const views = latest?.views ?? 0;
      const likes = latest?.likes ?? 0;
      const comments = latest?.comments ?? 0;
      const shares = latest?.shares ?? 0;
      const saves = latest?.saves ?? 0;
      const engRate = latest?.engagementRate ?? 0;

      totalViews += views;
      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;
      totalSaves += saves;
      if (engRate > 0) {
        engagementRateSum += engRate;
        engagementCount++;
      }

      if (log.platform === "TIKTOK") tiktokAccounts.add(log.socialAccountId);
      else if (log.platform === "INSTAGRAM") instagramAccounts.add(log.socialAccountId);

      return {
        accountId: log.socialAccountId,
        handle: log.socialAccount.username,
        displayName: log.socialAccount.displayName,
        platform: log.platform,
        views,
        likes,
        comments,
        shares,
        saves,
        engRate,
        postedAt: log.publishedAt,
      };
    });

    const avgEngRate =
      engagementCount > 0
        ? parseFloat((engagementRateSum / engagementCount).toFixed(2))
        : 0;

    const accountsPostedTo = {
      tiktok: tiktokAccounts.size,
      instagram: instagramAccounts.size,
      total: clip.publishLogs.length,
    };

    return {
      id: clip.id,
      title: clip.title,
      thumbnailPath: clip.thumbnailPath,
      viralityScore: clip.viralityScore,
      clipType: clip.clipType,
      status: clip.status,
      sourceVideoId: clip.sourceVideo.id,
      sourceVideoTitle: clip.sourceVideo.title,
      accountsPostedTo,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      avgEngRate,
      perAccountBreakdown,
    };
  });

  // Sort
  const sorted = result.sort((a, b) => {
    if (sortBy === "engagementRate") return b.avgEngRate - a.avgEngRate;
    if (sortBy === "viralityScore") return b.viralityScore - a.viralityScore;
    return b.totalViews - a.totalViews;
  });

  return NextResponse.json({ clips: sorted });
  } catch (dbError) {
    console.error("Analytics clips DB error:", dbError);
    return NextResponse.json({ clips: [] });
  }
}

