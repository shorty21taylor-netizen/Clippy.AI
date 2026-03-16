import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/accounts?workspaceId=xxx&timeRange=30d
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
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const now = new Date();
  let periodStart: Date | null = null;
  if (timeRange !== "all") {
    const days = timeRange === "90d" ? 90 : timeRange === "14d" ? 14 : timeRange === "7d" ? 7 : 30;
    periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  const socialAccounts = await db.socialAccount.findMany({
    where: { workspaceId, isActive: true },
    select: {
      id: true,
      platform: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      followerCount: true,
      status: true,
      lastSyncedAt: true,
      publishLogs: {
        where: {
          publishStatus: "PUBLISHED",
          ...(periodStart ? { publishedAt: { gte: periodStart } } : {}),
        },
        select: {
          id: true,
          publishedAt: true,
          analytics: {
            orderBy: { fetchedAt: "desc" },
            take: 1,
            select: {
              views: true,
              engagementRate: true,
              fetchedAt: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
      },
    },
  });

  const accounts = socialAccounts.map((account) => {
    const publishedLogs = account.publishLogs;
    const publishedPostsCount = publishedLogs.length;

    // Collect analytics data
    const analyticsData = publishedLogs
      .map((log) => log.analytics[0])
      .filter(Boolean) as { views: number; engagementRate: number; fetchedAt: Date }[];

    const avgViews =
      analyticsData.length > 0
        ? Math.round(analyticsData.reduce((sum, a) => sum + a.views, 0) / analyticsData.length)
        : 0;

    const engagementRates = analyticsData.filter((a) => a.engagementRate > 0);
    const avgEngagement =
      engagementRates.length > 0
        ? parseFloat(
            (engagementRates.reduce((sum, a) => sum + a.engagementRate, 0) / engagementRates.length).toFixed(2)
          )
        : 0;

    // Last 10 posts view counts for sparkline
    const recentViews = publishedLogs
      .slice(0, 10)
      .map((log) => (log.analytics[0]?.views ?? 0));

    const totalViews = analyticsData.reduce((sum, a) => sum + a.views, 0);

    return {
      id: account.id,
      platform: account.platform,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      followerCount: account.followerCount ?? 0,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt,
      publishedPostsCount,
      avgViews,
      avgEngagement,
      totalViews,
      recentViews,
    };
  });

  return NextResponse.json({ accounts });
}
