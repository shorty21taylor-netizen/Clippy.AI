import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

async function getLogOrThrow(id: string, workspaceId: string) {
  const log = await db.publishLog.findFirst({ where: { id, workspaceId } });
  if (!log) throw { status: 404, message: "Publish log not found" };
  return log;
}

// PATCH /api/publish-logs/[id]
// Supports: status updates, retry (PENDING), simulate publish
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    workspaceId: string;
    status?: "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED";
    scheduledAt?: string | null;
    errorMessage?: string | null;
    platformPostId?: string | null;
    executedAt?: string | null;
  };

  const { workspaceId, ...data } = body;

  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
    await getLogOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const log = await db.publishLog.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.scheduledAt !== undefined && {
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      }),
      ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
      ...(data.platformPostId !== undefined && { platformPostId: data.platformPostId }),
      ...(data.executedAt !== undefined && {
        executedAt: data.executedAt ? new Date(data.executedAt) : null,
      }),
    },
    include: {
      contentPiece: {
        select: { id: true, platform: true, title: true, hook: true, youtubeTitle: true, status: true },
      },
      socialAccount: {
        select: { id: true, platform: true, username: true, displayName: true, avatarUrl: true, status: true },
      },
    },
  });

  return NextResponse.json({ log });
}

// DELETE /api/publish-logs/[id] — cancel/remove a scheduled post
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
    await getLogOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  await db.publishLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
