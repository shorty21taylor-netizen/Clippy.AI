import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

async function getFunnelOrThrow(id: string, workspaceId: string) {
  const funnel = await db.funnel.findFirst({ where: { id, workspaceId } });
  if (!funnel) throw { status: 404, message: "Funnel not found" };
  return funnel;
}

// GET /api/funnels/[id]?workspaceId=xxx
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
    await getFunnelOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const funnel = await db.funnel.findUnique({
    where: { id },
    include: { _count: { select: { leads: true } } },
  });
  return NextResponse.json({ funnel });
}

// PATCH /api/funnels/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    workspaceId: string;
    title?: string;
    blocks?: unknown[];
  };
  const { workspaceId, ...data } = body;

  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
    await getFunnelOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const funnel = await db.funnel.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.blocks !== undefined && { blocks: data.blocks as unknown as import("@prisma/client").Prisma.InputJsonValue }),
    },
  });

  return NextResponse.json({ funnel });
}

// DELETE /api/funnels/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
    await getFunnelOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  await db.funnel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
