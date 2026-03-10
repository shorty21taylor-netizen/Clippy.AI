import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/clips?workspaceId=xxx
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

  const detections = await db.clipDetection.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      videoTitle: true,
      channelName: true,
      niche: true,
      videoSummary: true,
      totalDuration: true,
      clipsCount: true,
      createdAt: true,
      // clipsJson excluded from list — fetched per-item
    },
  });

  return NextResponse.json({ detections });
}
