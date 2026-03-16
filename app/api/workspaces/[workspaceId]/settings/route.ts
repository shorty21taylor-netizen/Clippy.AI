import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

// GET /api/workspaces/[workspaceId]/settings — fetch workspace settings
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true, challengeTicketPrice: true, coachingProgramPrice: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ workspace });
}

// PATCH /api/workspaces/[workspaceId]/settings
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  let body: { challengeTicketPrice?: number; coachingProgramPrice?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: { challengeTicketPrice?: number; coachingProgramPrice?: number } = {};
  if (typeof body.challengeTicketPrice === "number" && body.challengeTicketPrice >= 0) {
    updates.challengeTicketPrice = body.challengeTicketPrice;
  }
  if (typeof body.coachingProgramPrice === "number" && body.coachingProgramPrice >= 0) {
    updates.coachingProgramPrice = body.coachingProgramPrice;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const workspace = await db.workspace.update({
    where: { id: workspaceId },
    data: updates,
    select: { id: true, challengeTicketPrice: true, coachingProgramPrice: true },
  });

  return NextResponse.json({ workspace });
}
