import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
});

// POST /api/analytics/sync/instagram
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { workspaceId } = parsed.data;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const accounts = await db.socialAccount.findMany({
    where: { workspaceId, platform: "INSTAGRAM", isActive: true },
  });

  const results: Array<{ accountId: string; synced: number; error?: string }> = [];

  for (const account of accounts) {
    if (!account.accessToken || !account.platformAccountId) {
      results.push({ accountId: account.id, synced: 0, error: "Missing token or account ID" });
      continue;
    }

    try {
      const token = decrypt(account.accessToken);
      const igUserId = account.platformAccountId;

      // Get publish logs with Instagram platform post IDs
      const publishLogs = await db.publishLog.findMany({
        where: {
          socialAccountId: account.id,
          publishStatus: "PUBLISHED",
          platformPostId: { not: null },
        },
        select: { id: true, platformPostId: true },
      });

      let synced = 0;

      for (const log of publishLogs) {
        try {
          // Get media insights
          const insightsRes = await fetch(
            `https://graph.facebook.com/v21.0/${log.platformPostId}/insights?metric=impressions,reach,likes,comments,shares,saved,plays&access_token=${token}`
          );

          if (insightsRes.status === 429) break; // Rate limited

          const insightsData = (await insightsRes.json()) as {
            data?: Array<{ name: string; values: Array<{ value: number }> }>;
            error?: { message: string };
          };

          if (insightsData.error) continue;

          const metrics: Record<string, number> = {};
          if (insightsData.data) {
            for (const metric of insightsData.data) {
              metrics[metric.name] = metric.values[0]?.value ?? 0;
            }
          }

          const totalEngagement =
            (metrics.likes || 0) +
            (metrics.comments || 0) +
            (metrics.shares || 0) +
            (metrics.saved || 0);
          const views = metrics.plays || metrics.impressions || 0;
          const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0;

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
              engagementRate: Math.round(engagementRate * 100) / 100,
              rawData: metrics as object,
            },
          });
          synced++;
        } catch {
          // Skip individual post errors, continue with others
        }
      }

      // Pull account-level insights
      try {
        await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/insights?metric=impressions,reach,follower_count&period=day&access_token=${token}`
        );
        // Store account-level data in the last analytics record or ignore for now
      } catch {
        // Non-critical
      }

      await db.socialAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });

      results.push({ accountId: account.id, synced });
    } catch (err) {
      results.push({
        accountId: account.id,
        synced: 0,
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  return NextResponse.json({ results });
}
