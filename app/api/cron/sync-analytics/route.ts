import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

// GET /api/cron/sync-analytics
// Protected by CRON_SECRET — called by Railway cron or external scheduler
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const secret = searchParams.get("secret") || authHeader?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Array<{
    accountId: string;
    platform: string;
    username: string;
    synced: number;
    error?: string;
  }> = [];

  // Get all active social accounts across all workspaces
  const accounts = await db.socialAccount.findMany({
    where: { isActive: true, accessToken: { not: null } },
    select: {
      id: true,
      platform: true,
      username: true,
      accessToken: true,
      platformAccountId: true,
    },
  });

  for (const account of accounts) {
    if (!account.accessToken) continue;

    try {
      const token = decrypt(account.accessToken);

      // Get published logs for this account
      const publishLogs = await db.publishLog.findMany({
        where: {
          socialAccountId: account.id,
          publishStatus: "PUBLISHED",
          platformPostId: { not: null },
        },
        select: { id: true, platformPostId: true, platform: true },
      });

      if (publishLogs.length === 0) {
        results.push({ accountId: account.id, platform: account.platform, username: account.username, synced: 0 });
        continue;
      }

      let synced = 0;

      if (account.platform === "TIKTOK") {
        // TikTok: batch query video stats
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

            const data = (await res.json()) as {
              data?: { videos?: Array<{ id: string; like_count: number; comment_count: number; share_count: number; view_count: number }> };
            };

            if (data.data?.videos) {
              for (const video of data.data.videos) {
                const log = batch.find((l) => l.platformPostId === video.id);
                if (!log) continue;
                const engagement = video.like_count + video.comment_count + video.share_count;
                await db.analytics.create({
                  data: {
                    publishLogId: log.id,
                    socialAccountId: account.id,
                    views: video.view_count,
                    likes: video.like_count,
                    comments: video.comment_count,
                    shares: video.share_count,
                    engagementRate: video.view_count > 0 ? Math.round((engagement / video.view_count) * 10000) / 100 : 0,
                    rawData: video as object,
                  },
                });
                synced++;
              }
            }
          } catch {
            // Continue with next batch
          }
        }
      } else if (account.platform === "INSTAGRAM") {
        // Instagram: query individual media insights
        for (const log of publishLogs) {
          try {
            const res = await fetch(
              `https://graph.facebook.com/v21.0/${log.platformPostId}/insights?metric=impressions,reach,likes,comments,shares,saved,plays&access_token=${token}`
            );

            if (res.status === 429) break;

            const data = (await res.json()) as {
              data?: Array<{ name: string; values: Array<{ value: number }> }>;
            };

            if (data.data) {
              const metrics: Record<string, number> = {};
              for (const m of data.data) {
                metrics[m.name] = m.values[0]?.value ?? 0;
              }
              const views = metrics.plays || metrics.impressions || 0;
              const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0) + (metrics.saved || 0);

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
                  engagementRate: views > 0 ? Math.round((engagement / views) * 10000) / 100 : 0,
                  rawData: metrics as object,
                },
              });
              synced++;
            }
          } catch {
            // Continue
          }
        }
      }

      await db.socialAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });

      results.push({ accountId: account.id, platform: account.platform, username: account.username, synced });
    } catch (err) {
      results.push({
        accountId: account.id,
        platform: account.platform,
        username: account.username,
        synced: 0,
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  const elapsed = Date.now() - startTime;

  return NextResponse.json({
    ok: true,
    accountsProcessed: accounts.length,
    totalSynced: results.reduce((sum, r) => sum + r.synced, 0),
    elapsedMs: elapsed,
    results,
  });
}
