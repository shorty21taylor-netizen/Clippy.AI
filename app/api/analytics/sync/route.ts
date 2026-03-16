import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { decrypt } from "@/lib/encryption";

// POST /api/analytics/sync
// Body: { workspaceId }
// Triggers a real analytics sync for all active accounts in this workspace,
// calling the TikTok and Instagram platform APIs.
export async function POST(req: Request) {
  let body: { workspaceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { workspaceId } = body;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const accounts = await db.socialAccount.findMany({
    where: {
      workspaceId,
      isActive: true,
      accessToken: { not: null },
    },
    select: {
      id: true,
      platform: true,
      username: true,
      accessToken: true,
      platformAccountId: true,
    },
  });

  let totalSynced = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    if (!account.accessToken) continue;

    try {
      const token = decrypt(account.accessToken);

      const publishLogs = await db.publishLog.findMany({
        where: {
          socialAccountId: account.id,
          publishStatus: "PUBLISHED",
          platformPostId: { not: null },
        },
        select: { id: true, platformPostId: true },
      });

      if (publishLogs.length === 0) continue;

      let synced = 0;

      if (account.platform === "TIKTOK") {
        for (let i = 0; i < publishLogs.length; i += 20) {
          const batch = publishLogs.slice(i, i + 20);
          const videoIds = batch.map((l) => l.platformPostId!);

          try {
            const res = await fetch(
              "https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ filters: { video_ids: videoIds } }),
              }
            );

            if (res.status === 429) break;
            if (!res.ok) continue;

            const data = (await res.json()) as {
              data?: {
                videos?: Array<{
                  id: string;
                  like_count: number;
                  comment_count: number;
                  share_count: number;
                  view_count: number;
                }>;
              };
            };

            if (data.data?.videos) {
              for (const video of data.data.videos) {
                const log = batch.find((l) => l.platformPostId === video.id);
                if (!log) continue;
                const engagement =
                  video.like_count + video.comment_count + video.share_count;
                await db.analytics.create({
                  data: {
                    publishLogId: log.id,
                    socialAccountId: account.id,
                    views: video.view_count,
                    likes: video.like_count,
                    comments: video.comment_count,
                    shares: video.share_count,
                    engagementRate:
                      video.view_count > 0
                        ? Math.round((engagement / video.view_count) * 10000) / 100
                        : 0,
                    rawData: video as object,
                  },
                });
                synced++;
              }
            }
          } catch {
            // continue with next batch
          }
        }
      } else if (account.platform === "INSTAGRAM") {
        for (const log of publishLogs) {
          try {
            const res = await fetch(
              `https://graph.facebook.com/v21.0/${log.platformPostId}/insights?metric=impressions,reach,likes,comments,shares,saved,plays&access_token=${token}`
            );

            if (res.status === 429) break;
            if (!res.ok) continue;

            const data = (await res.json()) as {
              data?: Array<{ name: string; values: Array<{ value: number }> }>;
            };

            if (data.data) {
              const metrics: Record<string, number> = {};
              for (const m of data.data) {
                metrics[m.name] = m.values[0]?.value ?? 0;
              }
              const views = metrics.plays || metrics.impressions || 0;
              const engagement =
                (metrics.likes || 0) +
                (metrics.comments || 0) +
                (metrics.shares || 0) +
                (metrics.saved || 0);

              await db.analytics.create({
                data: {
                  publishLogId: log.id,
                  socialAccountId: account.id,
                  views,
                  likes: metrics.likes || 0,
                  comments: metrics.comments || 0,
                  shares: metrics.shares || 0,
                  saves: metrics.saved || 0,
                  reach: metrics.reach || 0,
                  impressions: metrics.impressions || 0,
                  engagementRate:
                    views > 0
                      ? Math.round((engagement / views) * 10000) / 100
                      : 0,
                  rawData: metrics as object,
                },
              });
              synced++;
            }
          } catch {
            // continue with next post
          }
        }
      }

      await db.socialAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });

      totalSynced += synced;
    } catch (err) {
      errors.push(
        `${account.username}: ${err instanceof Error ? err.message : "Sync failed"}`
      );
    }
  }

  return NextResponse.json({
    success: true,
    synced: totalSynced,
    accountsProcessed: accounts.length,
    errors,
    message:
      totalSynced > 0
        ? `Synced ${totalSynced} posts across ${accounts.length} accounts.`
        : accounts.length === 0
          ? "No active accounts with tokens found."
          : "No new analytics data to sync.",
  });
}
