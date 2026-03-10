import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const funnel = await db.funnel.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!funnel) return NextResponse.json({ error: "Funnel not found" }, { status: 404 });

  const leads = await db.lead.findMany({
    where: { funnelId: id },
    select: { id: true, name: true, email: true, phone: true, submittedAt: true },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ leads });
}
