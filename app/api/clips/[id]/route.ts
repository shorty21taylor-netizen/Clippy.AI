import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/clips/[id] — fetch a single detection with full clipsJson
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const detection = await db.clipDetection.findUnique({ where: { id } });
  if (!detection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(detection.workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  return NextResponse.json({ detection });
}

// DELETE /api/clips/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const detection = await db.clipDetection.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!detection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(detection.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  await db.clipDetection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
