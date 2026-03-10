import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// GET /api/workspaces/[workspaceId]/members — list members
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

  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ members });
}

// POST /api/workspaces/[workspaceId]/members — invite a user by email
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, role } = parsed.data;

  // Find the user by email (they must have signed up already)
  const invitee = await db.user.findUnique({ where: { email } });
  if (!invitee) {
    return NextResponse.json(
      { error: "User not found. They must sign up first." },
      { status: 404 }
    );
  }

  // Check if already a member
  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "User is already a workspace member." },
      { status: 409 }
    );
  }

  const member = await db.workspaceMember.create({
    data: { workspaceId, userId: invitee.id, role },
    include: { user: true },
  });

  return NextResponse.json({ member }, { status: 201 });
}
