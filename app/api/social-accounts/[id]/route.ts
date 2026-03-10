import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { encrypt } from "@/lib/encryption";

const updateSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  displayName: z.string().max(150).optional().nullable(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  status: z
    .enum(["ACTIVE", "PENDING", "BANNED", "DISCONNECTED"])
    .optional(),
  tags: z.array(z.string()).optional(),
  proxyConfig: z.string().optional().nullable(),
  followerCount: z.number().int().nonnegative().optional().nullable(),
});

// Helper — verify the account exists and belongs to the workspace
async function getAccountOrThrow(id: string, workspaceId: string) {
  const account = await db.socialAccount.findFirst({
    where: { id, workspaceId },
  });
  if (!account) throw { status: 404, message: "Account not found" };
  return account;
}

// GET /api/social-accounts/[id]?workspaceId=xxx
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
    await getAccountOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const account = await db.socialAccount.findUnique({
    where: { id },
    select: {
      id: true, workspaceId: true, platform: true, username: true,
      displayName: true, avatarUrl: true, status: true, followerCount: true,
      tags: true, proxyConfig: true, lastPostedAt: true,
      createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({ account });
}

// PATCH /api/social-accounts/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { workspaceId, ...rest } = body as { workspaceId: string } & Record<string, unknown>;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
    await getAccountOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const parsed = updateSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { accessToken, refreshToken, ...updateData } = parsed.data;

  const account = await db.socialAccount.update({
    where: { id },
    data: {
      ...updateData,
      // Only encrypt + update tokens if new values are provided
      ...(accessToken !== undefined && {
        accessToken: accessToken ? encrypt(accessToken) : null,
      }),
      ...(refreshToken !== undefined && {
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
      }),
    },
    select: {
      id: true, workspaceId: true, platform: true, username: true,
      displayName: true, status: true, followerCount: true,
      tags: true, proxyConfig: true, createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({ account });
}

// DELETE /api/social-accounts/[id]
export async function DELETE(
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
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
    await getAccountOrThrow(id, workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  await db.socialAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
