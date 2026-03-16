import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/accounts/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const account = await db.socialAccount.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      platform: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      followerCount: true,
      lastSyncedAt: true,
      lastPostedAt: true,
      isActive: true,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(account.workspaceId);
  } catch (err: unknown) {
    const status = (err as {status?: number}).status ?? 500;
    const message = (err as {message?: string}).message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status });
  }

  // Get recent posts with metrics
  const publishLogs = await db.publishLog.findMany({
    where: {
      socialAccountId: id,
      publishStatus: "PUBLISHED",
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
    include: {
      clip: { select: { id: true, title: true, viralityScore: true } },
      analytics: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
  });

  const posts = publishLogs.map((log) => {
    const latest = log.analytics[0];
    return {
      publishLogId: log.id,
      clip: log.clip,
      publishedAt: log.publishedAt,
      platformPostId: log.platformPostId,
      metrics: latest
        ? {
            views: latest.views,
            likes: latest.likes,
            comments: latest.comments,
            shares: latest.shares,
            saves: latest.saves,
            engagementRate: latest.engagementRate,
          }
        : null,
    };
  });

  // Aggregate totals
  const totals = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, posts: posts.length };
  for (const post of posts) {
    if (post.metrics) {
      totals.views += post.metrics.views;
      totals.likes += post.metrics.likes;
      totals.comments += post.metrics.comments;
      totals.shares += post.metrics.shares;
      totals.saves += post.metrics.saves;
    }
  }

  return NextResponse.json({ account, totals, posts });
}

