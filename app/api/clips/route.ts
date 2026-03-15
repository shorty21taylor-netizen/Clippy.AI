import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/clips?workspaceId=xxx — list clip detections
// GET /api/clips?sourceVideoId=xxx — list clips for a source video
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const sourceVideoId = searchParams.get("sourceVideoId");

  // Mode 1: List clips for a source video
  if (sourceVideoId) {
    const video = await db.sourceVideo.findUnique({
      where: { id: sourceVideoId },
      select: { workspaceId: true },
    });
    if (!video) {
      return NextResponse.json({ error: "Source video not found" }, { status: 404 });
    }

    try {
      await requireWorkspaceMember(video.workspaceId);
    } catch (err: unknown) {
      const e = err as { status: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }

    const clips = await db.clip.findMany({
      where: { sourceVideoId },
      orderBy: { viralityScore: "desc" },
    });

    return NextResponse.json({ clips });
  }

  // Mode 2: List Clip records for workspace (joined through sourceVideo)
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId or sourceVideoId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const status = searchParams.get("status") as string | null;
  const sort = searchParams.get("sort") ?? "viralityScore";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  const orderBy =
    sort === "createdAt"
      ? { createdAt: "desc" as const }
      : { viralityScore: "desc" as const };

  // Build where clause for clips joined through sourceVideo.workspaceId
  const clips = await db.clip.findMany({
    where: {
      sourceVideo: { workspaceId },
      ...(status && status !== "ALL"
        ? { status: status as "GENERATED" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "REJECTED" }
        : {}),
    },
    orderBy,
    take: limit,
    include: {
      sourceVideo: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ clips });
}
