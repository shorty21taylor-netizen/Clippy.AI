import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id, leadId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, funnelId: id, workspaceId },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  await db.lead.delete({ where: { id: leadId } });
  return NextResponse.json({ success: true });
}
