import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/analytics/leads?workspaceId=xxx&timeRange=30d
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
    const status = (err as {status?: number}).status ?? 500;
    const message = (err as {message?: string}).message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status });
  }

  const now = new Date();
  let periodStart: Date | null = null;
  let days = 30;
  if (timeRange !== "all") {
    days = timeRange === "90d" ? 90 : timeRange === "14d" ? 14 : timeRange === "7d" ? 7 : 30;
    periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  try {
  const leads = await db.lead.findMany({
    where: {
      workspaceId,
      ...(periodStart ? { submittedAt: { gte: periodStart } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      submittedAt: true,
      funnel: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const totalLeads = leads.length;
  const leadsPerDay = days > 0 ? parseFloat((totalLeads / days).toFixed(1)) : 0;

  // Leads over time (daily)
  const leadsDateMap = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.submittedAt.toISOString().slice(0, 10);
    leadsDateMap.set(key, (leadsDateMap.get(key) || 0) + 1);
  }
  const leadsOverTime = Array.from(leadsDateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Leads by funnel
  const funnelMap = new Map<string, { funnelId: string; funnelName: string; count: number }>();
  for (const lead of leads) {
    if (!lead.funnel) continue;
    const existing = funnelMap.get(lead.funnel.id) || {
      funnelId: lead.funnel.id,
      funnelName: lead.funnel.title,
      count: 0,
    };
    existing.count++;
    funnelMap.set(lead.funnel.id, existing);
  }
  const leadsByFunnel = Array.from(funnelMap.values()).sort((a, b) => b.count - a.count);

  // Top source
  const topSource = leadsByFunnel[0]?.funnelName ?? "—";

  // Source breakdown by UTM
  const sourceBreakdown = { direct: 0, tiktok: 0, instagram: 0, other: 0 };
  for (const lead of leads) {
    const src = lead.utmSource?.toLowerCase() ?? "";
    if (!src) sourceBreakdown.direct++;
    else if (src.includes("tiktok")) sourceBreakdown.tiktok++;
    else if (src.includes("instagram") || src.includes("ig")) sourceBreakdown.instagram++;
    else sourceBreakdown.other++;
  }

  // Status pipeline
  const statusPipeline = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
  for (const lead of leads) {
    const s = lead.status.toLowerCase() as keyof typeof statusPipeline;
    if (s in statusPipeline) statusPipeline[s]++;
  }

  const converted = statusPipeline.converted;
  const leadToSaleRate =
    totalLeads > 0 ? parseFloat(((converted / totalLeads) * 100).toFixed(1)) : 0;

  // Recent leads with days since created
  const recentLeads = leads.slice(0, 50).map((lead) => {
    const daysSince = Math.floor(
      (now.getTime() - lead.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      funnel: lead.funnel?.title ?? "—",
      funnelId: lead.funnel?.id,
      source: lead.utmSource ?? "direct",
      status: lead.status,
      createdAt: lead.submittedAt,
      daysSince,
    };
  });

  return NextResponse.json({
    stats: { totalLeads, leadsPerDay, topSource, leadToSaleRate },
    leadsOverTime,
    leadsByFunnel,
    leadsBySource: sourceBreakdown,
    statusPipeline,
    recentLeads,
  });
  } catch (dbError) {
    console.error("Analytics leads DB error:", dbError);
    return NextResponse.json({
      stats: { totalLeads: 0, leadsPerDay: 0, topSource: "—", leadToSaleRate: 0 },
      leadsOverTime: [],
      leadsByFunnel: [],
      leadsBySource: { direct: 0, tiktok: 0, instagram: 0, other: 0 },
      statusPipeline: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
      recentLeads: [],
    });
  }
}

