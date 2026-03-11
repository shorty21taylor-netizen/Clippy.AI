import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { LeadStatus } from "@prisma/client";

// GET /api/leads/[id]?workspaceId=xxx
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const lead = await db.lead.findFirst({
    where: { id, workspaceId },
    include: {
      funnel: { select: { id: true, title: true, slug: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

// PATCH /api/leads/[id]?workspaceId=xxx
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const lead = await db.lead.findFirst({ where: { id, workspaceId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const body = await req.json() as {
    status?: string;
    tags?: string[];
    notes?: string;
  };

  const updateData: {
    status?: LeadStatus;
    tags?: string[];
    notes?: string;
    notesUpdatedAt?: Date;
  } = {};

  let statusChanged = false;
  let previousStatus: string | undefined;

  if (body.status !== undefined) {
    const newStatus = body.status.toUpperCase();
    if (!Object.values(LeadStatus).includes(newStatus as LeadStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (newStatus !== lead.status) {
      previousStatus = lead.status;
      updateData.status = newStatus as LeadStatus;
      statusChanged = true;
    }
  }

  if (body.tags !== undefined) {
    updateData.tags = body.tags;
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes;
    updateData.notesUpdatedAt = new Date();
  }

  const updatedLead = await db.lead.update({
    where: { id },
    data: updateData,
    include: {
      funnel: { select: { id: true, title: true, slug: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  // Create status_changed event if status changed
  if (statusChanged && previousStatus !== undefined) {
    await db.leadEvent.create({
      data: {
        leadId: id,
        type: "status_changed",
        description: `Status changed from ${previousStatus} to ${updateData.status}`,
        metadata: {
          from: previousStatus,
          to: updateData.status,
        },
      },
    });

    // Re-fetch with updated events
    const refreshed = await db.lead.findUnique({
      where: { id },
      include: {
        funnel: { select: { id: true, title: true, slug: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ lead: refreshed });
  }

  return NextResponse.json({ lead: updatedLead });
}

// DELETE /api/leads/[id]?workspaceId=xxx
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const lead = await db.lead.findFirst({ where: { id, workspaceId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await db.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
