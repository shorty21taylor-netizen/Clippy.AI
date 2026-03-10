import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/overview?workspaceId=xxx&timeRange=7d|30d|90d
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const timeRange = searchParams.get("timeRange") || "7d";

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const days = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get all social account IDs for this workspace
  const accounts = await db.socialAccount.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, platform: true, username: true, displayName: true },
  });

  const accountIds = accounts.map((a) => a.id);

  // Get latest analytics per publish log (most recent fetchedAt)
  const analytics = await db.analytics.findMany({
    where: {
      socialAccountId: { in: accountIds },
      fetchedAt: { gte: since },
    },
    include: {
      publishLog: {
        select: {
          id: true,
          platform: true,
          clipId: true,
          publishedAt: true,
          clip: { select: { id: true, title: true, viralityScore: true } },
        },
      },
    },
    orderBy: { fetchedAt: "desc" },
  });

  // Aggregate totals
  // Deduplicate: keep latest analytics per publishLogId
  const latestByLog = new Map<string, typeof analytics[0]>();
  for (const a of analytics) {
    if (!latestByLog.has(a.publishLogId)) {
      latestByLog.set(a.publishLogId, a);
    }
  }
  const dedupedAnalytics = Array.from(latestByLog.values());

  const totals = {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    reach: 0,
    impressions: 0,
  };

  const byPlatform: Record<string, typeof totals> = {};
  const byAccount: Record<string, typeof totals & { account: typeof accounts[0] }> = {};

  for (const a of dedupedAnalytics) {
    totals.views += a.views;
    totals.likes += a.likes;
    totals.comments += a.comments;
    totals.shares += a.shares;
    totals.saves += a.saves;
    totals.reach += a.reach;
    totals.impressions += a.impressions;

    const platform = a.publishLog.platform || "UNKNOWN";
    if (!byPlatform[platform]) {
      byPlatform[platform] = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0 };
    }
    byPlatform[platform].views += a.views;
    byPlatform[platform].likes += a.likes;
    byPlatform[platform].comments += a.comments;
    byPlatform[platform].shares += a.shares;
    byPlatform[platform].saves += a.saves;

    if (!byAccount[a.socialAccountId]) {
      const acct = accounts.find((ac) => ac.id === a.socialAccountId)!;
      byAccount[a.socialAccountId] = {
        views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0,
        account: acct,
      };
    }
    byAccount[a.socialAccountId].views += a.views;
    byAccount[a.socialAccountId].likes += a.likes;
    byAccount[a.socialAccountId].comments += a.comments;
    byAccount[a.socialAccountId].shares += a.shares;
    byAccount[a.socialAccountId].saves += a.saves;
  }

  // Top clips by views
  const clipMetrics = new Map<string, { views: number; engagement: number; clip: { id: string; title: string; viralityScore: number } | null }>();
  for (const a of dedupedAnalytics) {
    const clip = a.publishLog.clip;
    if (!clip) continue;
    const existing = clipMetrics.get(clip.id) || { views: 0, engagement: 0, clip };
    existing.views += a.views;
    existing.engagement += a.likes + a.comments + a.shares + a.saves;
    clipMetrics.set(clip.id, existing);
  }

  const topClips = Array.from(clipMetrics.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Daily time series
  const dailyMap = new Map<string, { views: number; likes: number; comments: number }>();
  for (const a of analytics) {
    const day = a.fetchedAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(day) || { views: 0, likes: 0, comments: 0 };
    existing.views += a.views;
    existing.likes += a.likes;
    existing.comments += a.comments;
    dailyMap.set(day, existing);
  }

  const dailyTrends = Array.from(dailyMap.entries())
    .map(([date, metrics]) => ({ date, ...metrics }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    timeRange,
    totals,
    byPlatform,
    byAccount: Object.values(byAccount),
    topClips,
    dailyTrends,
    postsTracked: dedupedAnalytics.length,
  });
}
