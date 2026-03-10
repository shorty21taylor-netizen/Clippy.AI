import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

const patchSchema = z.object({
  status: z.enum(["GENERATED", "APPROVED", "SCHEDULED", "PUBLISHED", "REJECTED"]).optional(),
  suggestedCaption: z.string().optional(),
  suggestedHashtags: z.array(z.string()).optional(),
  title: z.string().max(200).optional(),
});

// GET /api/clips/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "detection" for ClipDetection

  if (type === "detection") {
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

  // Default: Clip model
  const clip = await db.clip.findUnique({
    where: { id },
    include: {
      sourceVideo: { select: { workspaceId: true, title: true } },
      publishLogs: {
        select: { id: true, status: true, publishStatus: true, platformPostId: true },
      },
    },
  });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(clip.sourceVideo.workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  return NextResponse.json({ clip });
}

// PATCH /api/clips/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const clip = await db.clip.findUnique({
    where: { id },
    include: { sourceVideo: { select: { workspaceId: true } } },
  });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(clip.sourceVideo.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const updated = await db.clip.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ clip: updated });
}

// DELETE /api/clips/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "detection") {
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

  const clip = await db.clip.findUnique({
    where: { id },
    include: { sourceVideo: { select: { workspaceId: true } } },
  });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(clip.sourceVideo.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Delete the video file if it exists
  if (clip.videoPath) {
    const { deleteFile } = await import("@/lib/storage");
    await deleteFile(clip.videoPath);
  }

  await db.clip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
