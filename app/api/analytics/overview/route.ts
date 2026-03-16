import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/overview?workspaceId=xxx&timeRange=7d|30d|90d|all
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const timeRange = searchParams.get("timeRange") || "30d";

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

  // ─── DB queries wrapped in try/catch so DB errors return empty-but-valid data ──
  try {
  // Determine date ranges
  const now = new Date();
  let daysBack = 0;
  let currentPeriodStart: Date | null = null;
  let previousPeriodStart: Date | null = null;
  let previousPeriodEnd: Date | null = null;

  if (timeRange !== "all") {
    daysBack = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;
    currentPeriodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    previousPeriodEnd = new Date(currentPeriodStart.getTime());
    previousPeriodStart = new Date(currentPeriodStart.getTime() - daysBack * 24 * 60 * 60 * 1000);
  }

  // Fetch current period PublishLogs with PUBLISHED status
  const publishLogs = await db.publishLog.findMany({
    where: {
      workspaceId,
      publishStatus: "PUBLISHED",
      ...(currentPeriodStart ? { publishedAt: { gte: currentPeriodStart } } : {}),
    },
    select: {
      id: true,
      platform: true,
      clipId: true,
      publishedAt: true,
      socialAccountId: true,
      clip: {
        select: {
          id: true,
          title: true,
          viralityScore: true,
          thumbnailPath: true,
        },
      },
      analytics: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  // Fetch previous period for trend calculation
  let prevPublishLogs: typeof publishLogs = [];
  if (previousPeriodStart && previousPeriodEnd) {
    prevPublishLogs = await db.publishLog.findMany({
      where: {
        workspaceId,
        publishStatus: "PUBLISHED",
        publishedAt: { gte: previousPeriodStart, lt: previousPeriodEnd },
      },
      select: {
        id: true,
        platform: true,
        clipId: true,
        publishedAt: true,
        socialAccountId: true,
        clip: {
          select: {
            id: true,
            title: true,
            viralityScore: true,
            thumbnailPath: true,
          },
        },
        analytics: {
          orderBy: { fetchedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  // Aggregate helper
  function aggregateLogs(logs: typeof publishLogs) {
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;
    let totalEngagementRate = 0;
    let engagementCount = 0;

    for (const log of logs) {
      const latest = log.analytics[0];
      if (latest) {
        totalViews += latest.views;
        totalLikes += latest.likes;
        totalComments += latest.comments;
        totalShares += latest.shares;
        totalSaves += latest.saves;
        if (latest.engagementRate > 0) {
          totalEngagementRate += latest.engagementRate;
          engagementCount++;
        }
      }
    }

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      engagementRate: engagementCount > 0 ? parseFloat((totalEngagementRate / engagementCount).toFixed(2)) : 0,
      totalClipsPosted: logs.length,
    };
  }

  const currentStats = aggregateLogs(publishLogs);
  const prevStats = aggregateLogs(prevPublishLogs);

  // Trend percentage helper
  function trendPct(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  const trends = {
    views: trendPct(currentStats.totalViews, prevStats.totalViews),
    likes: trendPct(currentStats.totalLikes, prevStats.totalLikes),
    comments: trendPct(currentStats.totalComments, prevStats.totalComments),
    shares: trendPct(currentStats.totalShares, prevStats.totalShares),
    engagementRate: trendPct(currentStats.engagementRate, prevStats.engagementRate),
    clipsPosted: trendPct(currentStats.totalClipsPosted, prevStats.totalClipsPosted),
  };

  // Views over time — daily for 7d/30d, weekly for 90d/all
  const useWeekly = daysBack >= 90 || timeRange === "all";
  const viewsMapTiktok = new Map<string, number>();
  const viewsMapInstagram = new Map<string, number>();

  for (const log of publishLogs) {
    const latest = log.analytics[0];
    if (!latest || !log.publishedAt) continue;

    let key: string;
    if (useWeekly) {
      const d = log.publishedAt;
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    } else {
      key = log.publishedAt.toISOString().slice(0, 10);
    }

    if (log.platform === "TIKTOK") {
      viewsMapTiktok.set(key, (viewsMapTiktok.get(key) || 0) + latest.views);
    } else if (log.platform === "INSTAGRAM") {
      viewsMapInstagram.set(key, (viewsMapInstagram.get(key) || 0) + latest.views);
    }
  }

  const allDates = new Set([...viewsMapTiktok.keys(), ...viewsMapInstagram.keys()]);
  const viewsOverTime = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      tiktokViews: viewsMapTiktok.get(date) || 0,
      instagramViews: viewsMapInstagram.get(date) || 0,
    }));

  // Engagement breakdown totals
  const engagementBreakdown = {
    views: currentStats.totalViews,
    likes: currentStats.totalLikes,
    comments: currentStats.totalComments,
    shares: currentStats.totalShares,
    saves: currentStats.totalSaves,
  };

  // Platform split by views
  let tiktokViews = 0;
  let instagramViews = 0;
  for (const log of publishLogs) {
    const latest = log.analytics[0];
    if (!latest) continue;
    if (log.platform === "TIKTOK") tiktokViews += latest.views;
    else if (log.platform === "INSTAGRAM") instagramViews += latest.views;
  }
  const totalPlatformViews = tiktokViews + instagramViews;
  const platformSplit = {
    tiktok: {
      views: tiktokViews,
      percentage: totalPlatformViews > 0 ? Math.round((tiktokViews / totalPlatformViews) * 100) : 0,
    },
    instagram: {
      views: instagramViews,
      percentage: totalPlatformViews > 0 ? Math.round((instagramViews / totalPlatformViews) * 100) : 0,
    },
  };

  // Top clips by total views
  const clipMap = new Map<
    string,
    {
      clipId: string;
      title: string;
      viralityScore: number;
      thumbnailPath: string | null;
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalSaves: number;
      engagementRate: number;
      engagementCount: number;
      platforms: string[];
      publishedAt: Date | null;
      platformBreakdown: Record<string, { views: number; likes: number; comments: number; shares: number }>;
    }
  >();

  for (const log of publishLogs) {
    if (!log.clip) continue;
    const latest = log.analytics[0];
    const existing = clipMap.get(log.clip.id) || {
      clipId: log.clip.id,
      title: log.clip.title,
      viralityScore: log.clip.viralityScore,
      thumbnailPath: log.clip.thumbnailPath,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalSaves: 0,
      engagementRate: 0,
      engagementCount: 0,
      platforms: [],
      publishedAt: log.publishedAt,
      platformBreakdown: {},
    };

    if (latest) {
      existing.totalViews += latest.views;
      existing.totalLikes += latest.likes;
      existing.totalComments += latest.comments;
      existing.totalShares += latest.shares;
      existing.totalSaves += latest.saves;
      if (latest.engagementRate > 0) {
        existing.engagementRate += latest.engagementRate;
        existing.engagementCount++;
      }
    }

    if (log.platform && !existing.platforms.includes(log.platform)) {
      existing.platforms.push(log.platform);
    }

    if (log.platform && latest) {
      const pb = existing.platformBreakdown[log.platform] || { views: 0, likes: 0, comments: 0, shares: 0 };
      pb.views += latest.views;
      pb.likes += latest.likes;
      pb.comments += latest.comments;
      pb.shares += latest.shares;
      existing.platformBreakdown[log.platform] = pb;
    }

    clipMap.set(log.clip.id, existing);
  }

  const topClips = Array.from(clipMap.values())
    .map((c) => ({
      ...c,
      engagementRate: c.engagementCount > 0
        ? parseFloat((c.engagementRate / c.engagementCount).toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);

  return NextResponse.json({
    timeRange,
    ...currentStats,
    previousPeriod: {
      totalViews: prevStats.totalViews,
      totalLikes: prevStats.totalLikes,
      totalComments: prevStats.totalComments,
      totalShares: prevStats.totalShares,
      engagementRate: prevStats.engagementRate,
      totalClipsPosted: prevStats.totalClipsPosted,
    },
    trends,
    viewsOverTime,
    engagementBreakdown,
    platformSplit,
    topClips,
    postingHeatmap: buildHeatmap(publishLogs),
  });
  } catch (dbError) {
    console.error("Analytics overview DB error:", dbError);
    // Return empty-but-valid data so the frontend can render gracefully
    return NextResponse.json({
      timeRange,
      totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, totalSaves: 0,
      engagementRate: 0, totalClipsPosted: 0,
      previousPeriod: { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, engagementRate: 0, totalClipsPosted: 0 },
      trends: { views: 0, likes: 0, comments: 0, shares: 0, engagementRate: 0, clipsPosted: 0 },
      viewsOverTime: [],
      engagementBreakdown: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
      platformSplit: { tiktok: { views: 0, percentage: 0 }, instagram: { views: 0, percentage: 0 } },
      topClips: [],
      postingHeatmap: [],
    });
  }
}

// Build 7×24 posting heatmap from publish logs
function buildHeatmap(
  logs: Array<{ publishedAt: Date | null; analytics: Array<{ engagementRate: number }> }>
): Array<{ day: number; hour: number; count: number; avgEngagement: number }> {
  const map = new Map<string, { count: number; engSum: number }>();
  for (const log of logs) {
    if (!log.publishedAt) continue;
    const d = log.publishedAt;
    const day = d.getDay(); // 0=Sun..6=Sat
    const hour = d.getHours();
    const key = `${day}-${hour}`;
    const entry = map.get(key) || { count: 0, engSum: 0 };
    entry.count++;
    entry.engSum += log.analytics[0]?.engagementRate ?? 0;
    map.set(key, entry);
  }
  return Array.from(map.entries()).map(([key, { count, engSum }]) => {
    const [day, hour] = key.split("-").map(Number);
    return { day, hour, count, avgEngagement: count > 0 ? parseFloat((engSum / count).toFixed(2)) : 0 };
  });
}

