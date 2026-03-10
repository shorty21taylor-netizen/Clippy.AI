import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

const updateSchema = z.object({
  title: z.string().optional().nullable(),
  hook: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  cta: z.string().optional().nullable(),
  scriptShort: z.string().optional().nullable(),
  youtubeTitle: z.string().optional().nullable(),
  thumbnailText: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "APPROVED", "SCHEDULED", "POSTED"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

async function getContentOrThrow(id: string, workspaceId: string) {
  const piece = await db.contentPiece.findFirst({ where: { id, workspaceId } });
  if (!piece) throw { status: 404, message: "Content piece not found" };
  return piece;
}

// GET /api/content/[id]?workspaceId=xxx
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
    await getContentOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const piece = await db.contentPiece.findUnique({ where: { id } });
  return NextResponse.json({ piece });
}

// PATCH /api/content/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { workspaceId, ...rest } = body as { workspaceId: string } & Record<string, unknown>;

  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
    await getContentOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const parsed = updateSchema.safeParse(rest);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const piece = await db.contentPiece.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.scheduledAt !== undefined && {
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      }),
    },
  });

  return NextResponse.json({ piece });
}

// DELETE /api/content/[id]
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
    await getContentOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  await db.contentPiece.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
