import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { LeadStatus, Prisma } from "@prisma/client";

function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/leads/export?workspaceId=xxx&format=csv&[same filters as list]
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

  // Filters (same as list endpoint)
  const funnelId = searchParams.get("funnelId");
  const search = searchParams.get("search")?.trim();
  const statusParam = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const tagsParam = searchParams.get("tags");

  // Build where clause
  const where: Prisma.LeadWhereInput = { workspaceId };

  if (funnelId) {
    where.funnelId = funnelId;
  }

  if (statusParam) {
    const statuses = statusParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is LeadStatus => Object.values(LeadStatus).includes(s as LeadStatus));
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (dateFrom || dateTo) {
    where.submittedAt = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        where.submittedAt.gte = from;
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        to.setUTCHours(23, 59, 59, 999);
        where.submittedAt.lte = to;
      }
    }
  }

  if (tagsParam) {
    const tags = tagsParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }
  }

  const leads = await db.lead.findMany({
    where,
    include: {
      funnel: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Build CSV
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Funnel",
    "Status",
    "Tags",
    "UTM Source",
    "UTM Campaign",
    "Date",
  ];

  const rows = leads.map((lead) => [
    escapeCsv(lead.name),
    escapeCsv(lead.email),
    escapeCsv(lead.phone),
    escapeCsv(lead.funnel?.title),
    escapeCsv(lead.status),
    escapeCsv(lead.tags.join("; ")),
    escapeCsv(lead.utmSource),
    escapeCsv(lead.utmCampaign),
    escapeCsv(lead.submittedAt.toISOString()),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `leads-export-${timestamp}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
