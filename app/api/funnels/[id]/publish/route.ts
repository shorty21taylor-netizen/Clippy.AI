import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// POST /api/funnels/[id]/publish — toggle published state
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspaceId } = await req.json() as { workspaceId: string };
  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const existing = await db.funnel.findFirst({ where: { id, workspaceId } });
  if (!existing)
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });

  const funnel = await db.funnel.update({
    where: { id },
    data: {
      publishedAt: existing.publishedAt ? null : new Date(),
    },
  });

  return NextResponse.json({ funnel, published: Boolean(funnel.publishedAt) });
}
