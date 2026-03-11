import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { LeadStatus } from "@prisma/client";

// POST /api/leads/bulk-action
// Body: { workspaceId, ids: string[], action: "status" | "delete" | "add_tag", value?: string }
export async function POST(req: Request) {
  const body = await req.json() as {
    workspaceId: string;
    ids: string[];
    action: "status" | "delete" | "add_tag" | "tag";
    value?: string;
  };

  const { workspaceId, ids, action, value } = body;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const validActions = ["status", "delete", "add_tag", "tag"];
  if (!action || !validActions.includes(action)) {
    return NextResponse.json({ error: "action must be status, delete, or add_tag" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Verify all leads belong to this workspace
  const count = await db.lead.count({
    where: { id: { in: ids }, workspaceId },
  });

  if (count !== ids.length) {
    return NextResponse.json({ error: "One or more leads not found in this workspace" }, { status: 404 });
  }

  if (action === "delete") {
    await db.lead.deleteMany({
      where: { id: { in: ids }, workspaceId },
    });
    return NextResponse.json({ success: true, affected: ids.length });
  }

  if (action === "status") {
    if (!value) {
      return NextResponse.json({ error: "value required for status action" }, { status: 400 });
    }
    const newStatus = value.toUpperCase();
    if (!Object.values(LeadStatus).includes(newStatus as LeadStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    await db.lead.updateMany({
      where: { id: { in: ids }, workspaceId },
      data: { status: newStatus as LeadStatus },
    });

    return NextResponse.json({ success: true, affected: ids.length });
  }

  // "add_tag" or legacy "tag"
  if (action === "add_tag" || action === "tag") {
    if (!value || !value.trim()) {
      return NextResponse.json({ error: "value required for add_tag action" }, { status: 400 });
    }
    const tag = value.trim();

    // Add tag to each lead individually (to avoid duplicates)
    const leads = await db.lead.findMany({
      where: { id: { in: ids }, workspaceId },
      select: { id: true, tags: true },
    });

    await Promise.all(
      leads.map((lead) => {
        if (lead.tags.includes(tag)) return Promise.resolve();
        return db.lead.update({
          where: { id: lead.id },
          data: { tags: { push: tag } },
        });
      })
    );

    return NextResponse.json({ success: true, affected: ids.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
