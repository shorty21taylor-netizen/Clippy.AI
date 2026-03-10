import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/f/[slug]/submit — PUBLIC endpoint, no auth required
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const funnel = await db.funnel.findUnique({
    where: { slug },
    select: { id: true, workspaceId: true, publishedAt: true },
  });

  if (!funnel)
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });

  if (!funnel.publishedAt)
    return NextResponse.json({ error: "This funnel is not published" }, { status: 403 });

  const body = await req.json() as {
    name?: string;
    email?: string;
    phone?: string;
  };

  // Require at least one contact field
  if (!body.name?.trim() && !body.email?.trim() && !body.phone?.trim())
    return NextResponse.json({ error: "Please provide at least one contact field" }, { status: 400 });

  // Basic email format check
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

  const lead = await db.lead.create({
    data: {
      workspaceId: funnel.workspaceId,
      funnelId: funnel.id,
      name: body.name?.trim() || null,
      email: body.email?.trim().toLowerCase() || null,
      phone: body.phone?.trim() || null,
    },
  });

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
}
