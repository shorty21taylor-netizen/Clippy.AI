import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/publish/status?publishLogIds=id1,id2,id3
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("publishLogIds");

  if (!idsParam) {
    return NextResponse.json({ error: "publishLogIds is required" }, { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const logs = await db.publishLog.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      workspaceId: true,
      clipId: true,
      platform: true,
      status: true,
      publishStatus: true,
      platformPostId: true,
      publishedAt: true,
      errorMessage: true,
      scheduledAt: true,
      socialAccount: {
        select: { id: true, platform: true, username: true, displayName: true },
      },
    },
  });

  if (logs.length === 0) {
    return NextResponse.json({ error: "No logs found" }, { status: 404 });
  }

  // Auth check on first log's workspace
  try {
    await requireWorkspaceMember(logs[0].workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const summary = {
    total: logs.length,
    queued: logs.filter((l) => l.publishStatus === "QUEUED").length,
    uploading: logs.filter((l) => l.publishStatus === "UPLOADING").length,
    processing: logs.filter((l) => l.publishStatus === "PROCESSING").length,
    published: logs.filter((l) => l.publishStatus === "PUBLISHED").length,
    failed: logs.filter((l) => l.publishStatus === "FAILED").length,
  };

  return NextResponse.json({ logs, summary });
}
