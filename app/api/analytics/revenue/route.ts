import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/revenue?workspaceId=xxx&timeRange=90d
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const timeRange = searchParams.get("timeRange") || "90d";

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Get workspace settings for deal values
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      challengeTicketPrice: true,
      coachingProgramPrice: true,
    },
  });

  const challengePrice = workspace?.challengeTicketPrice ?? 197;
  const coachingPrice = workspace?.coachingProgramPrice ?? 6000;

  const now = new Date();
  let periodStart: Date | null = null;
  let days = 90;
  if (timeRange !== "all") {
    days = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : timeRange === "14d" ? 14 : 7;
    periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  // Fetch converted leads in period
  const convertedLeads = await db.lead.findMany({
    where: {
      workspaceId,
      status: "CONVERTED",
      ...(periodStart ? { submittedAt: { gte: periodStart } } : {}),
    },
    select: {
      id: true,
      utmCampaign: true,
      utmSource: true,
      utmMedium: true,
      submittedAt: true,
      funnel: { select: { id: true, title: true, slug: true } },
    },
  });

  // All leads for conversion rate
  const allLeads = await db.lead.findMany({
    where: {
      workspaceId,
      ...(periodStart ? { submittedAt: { gte: periodStart } } : {}),
    },
    select: { id: true, status: true, submittedAt: true, funnelId: true },
  });

  // Determine product type by funnel name (coaching vs challenge heuristic)
  function guessProductType(funnelTitle: string | undefined): "challenge" | "coaching" {
    const lower = (funnelTitle ?? "").toLowerCase();
    if (lower.includes("challenge") || lower.includes("ticket") || lower.includes("bootcamp")) {
      return "challenge";
    }
    return "coaching";
  }

  let challengeRevenue = 0;
  let coachingRevenue = 0;

  for (const lead of convertedLeads) {
    const type = guessProductType(lead.funnel?.title);
    if (type === "challenge") challengeRevenue += challengePrice;
    else coachingRevenue += coachingPrice;
  }

  const totalRevenue = challengeRevenue + coachingRevenue;

  // Revenue over time (monthly)
  const monthMap = new Map<string, { month: string; challengeRevenue: number; coachingRevenue: number }>();
  for (const lead of convertedLeads) {
    const d = lead.submittedAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const type = guessProductType(lead.funnel?.title);
    const existing = monthMap.get(key) || { month: key, challengeRevenue: 0, coachingRevenue: 0 };
    if (type === "challenge") existing.challengeRevenue += challengePrice;
    else existing.coachingRevenue += coachingPrice;
    monthMap.set(key, existing);
  }
  const revenueOverTime = Array.from(monthMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  // Revenue by funnel
  const funnelRevenueMap = new Map<
    string,
    { funnelId: string; name: string; type: string; leads: number; conversions: number; revenue: number }
  >();

  for (const lead of allLeads) {
    const funnelId = lead.funnelId;
    const existing = funnelRevenueMap.get(funnelId) || {
      funnelId,
      name: funnelId,
      type: "coaching",
      leads: 0,
      conversions: 0,
      revenue: 0,
    };
    existing.leads++;
    funnelRevenueMap.set(funnelId, existing);
  }

  for (const lead of convertedLeads) {
    const funnelId = lead.funnel?.id ?? lead.utmCampaign ?? "unknown";
    const existing = funnelRevenueMap.get(funnelId);
    if (existing) {
      const type = guessProductType(lead.funnel?.title);
      existing.name = lead.funnel?.title ?? funnelId;
      existing.type = type;
      existing.conversions++;
      existing.revenue += type === "challenge" ? challengePrice : coachingPrice;
    }
  }

  const revenueByFunnel = Array.from(funnelRevenueMap.values())
    .map((f) => ({
      ...f,
      convRate: f.leads > 0 ? parseFloat(((f.conversions / f.leads) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Clip attribution: find clips whose UTM campaign matches clip IDs in convert leads
  const clipAttrMap = new Map<
    string,
    { clipId: string; title: string; views: number; leadsGenerated: number; conversions: number; revenue: number }
  >();

  // Match leads with UTM campaign = clip_<id>
  for (const lead of allLeads) {
    const campaign = (lead as { utmCampaign?: string | null }).utmCampaign ?? "";
    const match = campaign.match(/^clip_(.+)$/);
    if (!match) continue;
    const clipId = match[1];
    const existing = clipAttrMap.get(clipId) || {
      clipId,
      title: "",
      views: 0,
      leadsGenerated: 0,
      conversions: 0,
      revenue: 0,
    };
    existing.leadsGenerated++;
    if (lead.status === "CONVERTED") {
      existing.conversions++;
      existing.revenue += coachingPrice; // default; could refine by funnel
    }
    clipAttrMap.set(clipId, existing);
  }

  // Fill in clip titles and view counts
  if (clipAttrMap.size > 0) {
    const clipIds = Array.from(clipAttrMap.keys());
    const clips = await db.clip.findMany({
      where: { id: { in: clipIds } },
      select: {
        id: true,
        title: true,
        publishLogs: {
          where: { publishStatus: "PUBLISHED" },
          select: {
            analytics: { orderBy: { fetchedAt: "desc" }, take: 1, select: { views: true } },
          },
        },
      },
    });
    for (const clip of clips) {
      const entry = clipAttrMap.get(clip.id);
      if (entry) {
        entry.title = clip.title;
        entry.views = clip.publishLogs.reduce(
          (sum, log) => sum + (log.analytics[0]?.views ?? 0),
          0
        );
      }
    }
  }

  const clipAttribution = Array.from(clipAttrMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Projection: last 30 days leads → projected monthly
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentLeads = allLeads.filter((l) => l.submittedAt >= thirtyDaysAgo);
  const recentConverted = recentLeads.filter((l) => l.status === "CONVERTED").length;
  const monthlyRate = recentLeads.length;
  const convRate = recentLeads.length > 0 ? recentConverted / recentLeads.length : 0;
  const projectedMonthly = Math.round(monthlyRate * convRate * coachingPrice);

  return NextResponse.json({
    totalRevenue,
    revenueByProduct: { challenge: challengeRevenue, coaching: coachingRevenue },
    challengePrice,
    coachingPrice,
    revenueOverTime,
    revenueByFunnel,
    clipAttribution,
    projection: {
      monthlyLeads: monthlyRate,
      convRate: parseFloat((convRate * 100).toFixed(1)),
      projectedMonthly,
    },
    hasData: convertedLeads.length > 0,
  });
}
