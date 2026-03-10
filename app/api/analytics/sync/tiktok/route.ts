import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
});

// POST /api/analytics/sync/tiktok
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
    where: { workspaceId, platform: "TIKTOK", isActive: true },
  });

  const results: Array<{ accountId: string; synced: number; error?: string }> = [];

  for (const account of accounts) {
    if (!account.accessToken) {
      results.push({ accountId: account.id, synced: 0, error: "No access token" });
      continue;
    }

    try {
      const token = decrypt(account.accessToken);

      // Get publish logs with TikTok platform post IDs
      const publishLogs = await db.publishLog.findMany({
        where: {
          socialAccountId: account.id,
          publishStatus: "PUBLISHED",
          platformPostId: { not: null },
        },
        select: { id: true, platformPostId: true },
      });

      if (publishLogs.length === 0) {
        results.push({ accountId: account.id, synced: 0 });
        continue;
      }

      // Query video stats in batches of 20
      let synced = 0;
      for (let i = 0; i < publishLogs.length; i += 20) {
        const batch = publishLogs.slice(i, i + 20);
        const videoIds = batch.map((l) => l.platformPostId!).filter(Boolean);

        if (videoIds.length === 0) continue;

        const res = await fetch(
          "https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filters: { video_ids: videoIds },
            }),
          }
        );

        if (res.status === 429) {
          // Rate limited, stop
          break;
        }

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

            const totalEngagement = video.like_count + video.comment_count + video.share_count;
            const engagementRate = video.view_count > 0
              ? (totalEngagement / video.view_count) * 100
              : 0;

            await db.analytics.create({
              data: {
                publishLogId: log.id,
                socialAccountId: account.id,
                views: video.view_count,
                likes: video.like_count,
                comments: video.comment_count,
                shares: video.share_count,
                engagementRate: Math.round(engagementRate * 100) / 100,
                rawData: video as object,
              },
            });
            synced++;
          }
        }
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
