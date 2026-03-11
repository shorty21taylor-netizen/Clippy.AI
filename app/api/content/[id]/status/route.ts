import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/content/[id]/status?workspaceId=xxx
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const sourceVideo = await db.sourceVideo.findUnique({
    where: { id },
    include: {
      clips: {
        orderBy: { viralityScore: "desc" },
      },
    },
  });

  if (!sourceVideo) {
    return NextResponse.json({ error: "Source video not found" }, { status: 404 });
  }

  if (sourceVideo.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    sourceVideo: {
      id: sourceVideo.id,
      title: sourceVideo.title,
      status: sourceVideo.status,
      clips: sourceVideo.clips,
      errorMessage: sourceVideo.errorMessage,
    },
  });
}
