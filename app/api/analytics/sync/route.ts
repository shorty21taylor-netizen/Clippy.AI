import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/workspace";

// POST /api/analytics/sync
// Body: { workspaceId }
// Stub: actual social API sync is complex. Returns success immediately.
export async function POST(req: Request) {
  let body: { workspaceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { workspaceId } = body;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Stub: real sync logic would call platform APIs here
  return NextResponse.json({ success: true, synced: 0, message: "Sync triggered. Analytics will update shortly." });
}
