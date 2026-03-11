import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { LeadStatus, Prisma } from "@prisma/client";

const VALID_SORT_FIELDS = ["submittedAt", "name", "email", "status"] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

const VALID_LIMITS = [10, 25, 50, 100] as const;

// GET /api/leads?workspaceId=xxx&funnelId=xxx&status=NEW,CONTACTED&search=xxx&page=1&limit=25&sortBy=submittedAt&sortOrder=desc&dateFrom=2025-01-01&dateTo=2025-12-31&tags=hot,vip
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

  // Filters
  const funnelId = searchParams.get("funnelId");
  const search = searchParams.get("search")?.trim();
  const statusParam = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const tagsParam = searchParams.get("tags");

  // Sorting
  const sortByRaw = searchParams.get("sortBy") ?? "submittedAt";
  const sortBy: SortField = VALID_SORT_FIELDS.includes(sortByRaw as SortField)
    ? (sortByRaw as SortField)
    : "submittedAt";
  const sortOrderRaw = searchParams.get("sortOrder") ?? "desc";
  const sortOrder: "asc" | "desc" = sortOrderRaw === "asc" ? "asc" : "desc";

  // Pagination
  const pageRaw = parseInt(searchParams.get("page") ?? "1", 10);
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const limitRaw = parseInt(searchParams.get("limit") ?? "25", 10);
  const limit = VALID_LIMITS.includes(limitRaw as (typeof VALID_LIMITS)[number])
    ? limitRaw
    : 25;

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
        // Include entire dateTo day
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

  const orderBy: Prisma.LeadOrderByWithRelationInput = { [sortBy]: sortOrder };

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: {
        funnel: { select: { id: true, title: true, slug: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.lead.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ leads, total, page, totalPages, totalFiltered: total });
}

// POST /api/leads — create a new lead
export async function POST(req: Request) {
  const body = await req.json() as {
    workspaceId: string;
    funnelId: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    tags?: string[];
    notes?: string;
    customFields?: Record<string, unknown>;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    referrer?: string;
    ipAddress?: string;
    userAgent?: string;
    pageUrl?: string;
  };

  const { workspaceId, funnelId } = body;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  if (!funnelId) {
    return NextResponse.json({ error: "funnelId required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Verify funnel belongs to this workspace
  const funnel = await db.funnel.findFirst({ where: { id: funnelId, workspaceId } });
  if (!funnel) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }

  let status: LeadStatus = LeadStatus.NEW;
  if (body.status) {
    const s = body.status.toUpperCase();
    if (Object.values(LeadStatus).includes(s as LeadStatus)) {
      status = s as LeadStatus;
    }
  }

  const lead = await db.lead.create({
    data: {
      workspaceId,
      funnelId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      status,
      tags: body.tags ?? [],
      notes: body.notes,
      customFields: body.customFields as Prisma.InputJsonValue,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      utmTerm: body.utmTerm,
      referrer: body.referrer,
      ipAddress: body.ipAddress,
      userAgent: body.userAgent,
      pageUrl: body.pageUrl,
    },
    include: {
      funnel: { select: { id: true, title: true, slug: true } },
    },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
