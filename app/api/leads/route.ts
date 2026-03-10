import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/leads?workspaceId=xxx[&funnelId=xxx][&search=xxx]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const funnelId = searchParams.get("funnelId");
  const search = searchParams.get("search");

  const leads = await db.lead.findMany({
    where: {
      workspaceId,
      ...(funnelId && { funnelId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      funnel: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ leads });
}
