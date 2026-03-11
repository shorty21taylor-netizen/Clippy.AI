import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/leads/stats?workspaceId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const now = new Date();

  // Start of current month (UTC)
  const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // Start of last month
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  // End of last month = start of this month
  const endOfLastMonth = startOfThisMonth;

  // Start of current week (Monday UTC)
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfThisWeek = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday)
  );
  // Start of last week = startOfThisWeek - 7 days
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
  // End of last week = start of this week
  const endOfLastWeek = startOfThisWeek;

  // Last 30 days for daily trend
  const thirtyDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29)
  );

  const [total, thisMonth, lastMonth, thisWeek, lastWeek, recentLeads] = await Promise.all([
    db.lead.count({ where: { workspaceId } }),
    db.lead.count({
      where: { workspaceId, submittedAt: { gte: startOfThisMonth } },
    }),
    db.lead.count({
      where: { workspaceId, submittedAt: { gte: startOfLastMonth, lt: endOfLastMonth } },
    }),
    db.lead.count({
      where: { workspaceId, submittedAt: { gte: startOfThisWeek } },
    }),
    db.lead.count({
      where: { workspaceId, submittedAt: { gte: startOfLastWeek, lt: endOfLastWeek } },
    }),
    db.lead.findMany({
      where: { workspaceId, submittedAt: { gte: thirtyDaysAgo } },
      select: { submittedAt: true },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  // Build daily counts array (last 30 days, oldest first)
  const dailyTrend: number[] = new Array(30).fill(0);
  for (const lead of recentLeads) {
    const leadDate = new Date(lead.submittedAt);
    const leadDayUTC = new Date(
      Date.UTC(leadDate.getUTCFullYear(), leadDate.getUTCMonth(), leadDate.getUTCDate())
    );
    const diffMs = leadDayUTC.getTime() - thirtyDaysAgo.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 30) {
      dailyTrend[diffDays]++;
    }
  }

  // Percentage change helpers (avoid divide-by-zero)
  const pctChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const monthlyChange = pctChange(thisMonth, lastMonth);
  const weeklyChange = pctChange(thisWeek, lastWeek);

  return NextResponse.json({
    total,
    thisMonth,
    lastMonth,
    thisWeek,
    lastWeek,
    conversionRate: 0,
    dailyTrend,
    monthlyChange,
    weeklyChange,
  });
}
