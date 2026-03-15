import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshInstagramToken, refreshTikTokToken } from "@/lib/token-refresh";

// GET /api/cron/refresh-tokens
// Protected by CRON_SECRET — called by Railway cron or external scheduler.
// Refreshes tokens that are expiring within 7 days (TikTok: 24h, Instagram: ~60d).
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || authHeader?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  // Find accounts whose tokens expire within 7 days (or already expired)
  const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accounts = await db.socialAccount.findMany({
    where: {
      isActive: true,
      platform: { in: ["INSTAGRAM", "TIKTOK"] },
      OR: [
        { tokenExpiresAt: { lte: cutoff } },
        // Also refresh TikTok accounts daily (expires in 24h)
        {
          platform: "TIKTOK",
          tokenExpiresAt: { lte: new Date(Date.now() + 25 * 60 * 60 * 1000) },
        },
      ],
    },
    select: { id: true, platform: true, username: true },
  });

  const results: Array<{
    accountId: string;
    platform: string;
    username: string;
    refreshed: boolean;
    error?: string;
  }> = [];

  for (const account of accounts) {
    try {
      let refreshed = false;

      if (account.platform === "INSTAGRAM") {
        refreshed = await refreshInstagramToken(account.id);
      } else if (account.platform === "TIKTOK") {
        refreshed = await refreshTikTokToken(account.id);
      }

      results.push({
        accountId: account.id,
        platform: account.platform,
        username: account.username,
        refreshed,
      });
    } catch (err) {
      results.push({
        accountId: account.id,
        platform: account.platform,
        username: account.username,
        refreshed: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const elapsed = Date.now() - startTime;
  const refreshedCount = results.filter((r) => r.refreshed).length;
  const failedCount = results.filter((r) => !r.refreshed).length;

  return NextResponse.json({
    ok: true,
    accountsChecked: accounts.length,
    refreshed: refreshedCount,
    failed: failedCount,
    elapsedMs: elapsed,
    results,
  });
}
