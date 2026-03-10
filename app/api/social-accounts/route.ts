import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { encrypt } from "@/lib/encryption";
import type { Platform, SocialAccountStatus } from "@prisma/client";

const createSchema = z.object({
  workspaceId: z.string().min(1),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE"]),
  username: z.string().min(1).max(100),
  displayName: z.string().max(150).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  status: z
    .enum(["ACTIVE", "PENDING", "BANNED", "DISCONNECTED"])
    .default("PENDING"),
  tags: z.array(z.string()).default([]),
  proxyConfig: z.string().optional(),
});

// GET /api/social-accounts?workspaceId=xxx[&platform=INSTAGRAM][&status=ACTIVE][&search=xxx]
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

  const platform = searchParams.get("platform") as Platform | null;
  const status = searchParams.get("status") as SocialAccountStatus | null;
  const search = searchParams.get("search");

  const accounts = await db.socialAccount.findMany({
    where: {
      workspaceId,
      ...(platform && { platform }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    // Never return raw tokens to the client
    select: {
      id: true,
      workspaceId: true,
      platform: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      status: true,
      followerCount: true,
      tags: true,
      proxyConfig: true,
      lastPostedAt: true,
      createdAt: true,
      updatedAt: true,
      // accessToken and refreshToken intentionally omitted
    },
  });

  // Platform counts for stats bar
  const counts = await db.socialAccount.groupBy({
    by: ["platform"],
    where: { workspaceId },
    _count: { id: true },
  });

  const statusCounts = await db.socialAccount.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { id: true },
  });

  return NextResponse.json({ accounts, counts, statusCounts });
}

// POST /api/social-accounts — create a single account
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { workspaceId, accessToken, refreshToken, ...data } = parsed.data;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Enforce per-platform account limit (100 per platform per workspace)
  const existing = await db.socialAccount.count({
    where: { workspaceId, platform: data.platform },
  });
  if (existing >= 100) {
    return NextResponse.json(
      { error: `Maximum 100 ${data.platform} accounts per workspace.` },
      { status: 422 }
    );
  }

  const account = await db.socialAccount.create({
    data: {
      workspaceId,
      ...data,
      // Encrypt tokens before storage
      accessToken: accessToken ? encrypt(accessToken) : null,
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
    },
    select: {
      id: true,
      workspaceId: true,
      platform: true,
      username: true,
      displayName: true,
      status: true,
      followerCount: true,
      tags: true,
      proxyConfig: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
