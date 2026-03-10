import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/source-videos?workspaceId=xxx
export async function GET(req: Request) {
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

  const videos = await db.sourceVideo.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      clips: {
        select: { id: true, title: true, viralityScore: true, status: true },
        orderBy: { viralityScore: "desc" },
      },
      _count: { select: { clips: true } },
    },
  });

  return NextResponse.json({ videos });
}
