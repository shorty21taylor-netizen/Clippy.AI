import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  clipIds: z.array(z.string().min(1)).min(1).max(50),
});

// POST /api/clips/generate-batch
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { clipIds } = parsed.data;

  // Fetch all clips and verify workspace membership
  const clips = await db.clip.findMany({
    where: { id: { in: clipIds } },
    include: { sourceVideo: { select: { workspaceId: true } } },
  });

  if (clips.length === 0) {
    return NextResponse.json({ error: "No clips found" }, { status: 404 });
  }

  // All clips must belong to the same workspace
  const workspaceIds = new Set(clips.map((c) => c.sourceVideo.workspaceId));
  if (workspaceIds.size > 1) {
    return NextResponse.json(
      { error: "All clips must belong to the same workspace" },
      { status: 400 }
    );
  }

  const workspaceId = clips[0].sourceVideo.workspaceId;
  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Process clips with max 3 concurrent
  const results: Array<{ clipId: string; status: "success" | "error"; error?: string }> = [];
  const queue = [...clipIds];
  const MAX_CONCURRENT = 3;

  async function processClip(clipId: string) {
    try {
      const origin = req.headers.get("origin") || req.headers.get("host") || "localhost:3000";
      const protocol = origin.startsWith("http") ? "" : "http://";
      const res = await fetch(`${protocol}${origin}/api/clips/${clipId}/generate`, {
        method: "POST",
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      });
      if (res.ok) {
        results.push({ clipId, status: "success" });
      } else {
        const data = await res.json();
        results.push({ clipId, status: "error", error: data.error });
      }
    } catch (err) {
      results.push({
        clipId,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Process in batches of MAX_CONCURRENT
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_CONCURRENT);
    await Promise.allSettled(batch.map(processClip));
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ results, succeeded, failed });
}
