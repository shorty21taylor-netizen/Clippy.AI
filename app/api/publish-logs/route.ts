import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import type { PostStatus } from "@prisma/client";

const createSchema = z.object({
  workspaceId: z.string().min(1),
  contentPieceId: z.string().min(1),
  // May schedule to multiple accounts at once
  socialAccountIds: z.array(z.string().min(1)).min(1),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// GET /api/publish-logs?workspaceId=xxx[&status=...][&platform=...][&from=...][&to=...]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId)
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const status = searchParams.get("status") as PostStatus | null;
  const platform = searchParams.get("platform");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const logs = await db.publishLog.findMany({
    where: {
      workspaceId,
      ...(status && { status }),
      ...(from || to
        ? {
            scheduledAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(platform && {
        socialAccount: { platform: platform as "INSTAGRAM" | "TIKTOK" | "YOUTUBE" },
      }),
    },
    include: {
      contentPiece: {
        select: {
          id: true,
          platform: true,
          title: true,
          hook: true,
          youtubeTitle: true,
          status: true,
        },
      },
      socialAccount: {
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          status: true,
        },
      },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });

  // Status summary counts
  const counts = await db.publishLog.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { id: true },
  });

  return NextResponse.json({ logs, counts });
}

// POST /api/publish-logs — schedule one or more posts
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );

  const { workspaceId, contentPieceId, socialAccountIds, scheduledAt } = parsed.data;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  // Verify content piece belongs to this workspace
  const piece = await db.contentPiece.findFirst({ where: { id: contentPieceId, workspaceId } });
  if (!piece)
    return NextResponse.json({ error: "Content piece not found." }, { status: 404 });

  // Verify all accounts belong to this workspace
  const accounts = await db.socialAccount.findMany({
    where: { id: { in: socialAccountIds }, workspaceId },
    select: { id: true },
  });
  if (accounts.length !== socialAccountIds.length)
    return NextResponse.json({ error: "One or more accounts not found." }, { status: 404 });

  // Create one PublishLog per account
  const logs = await db.$transaction(
    socialAccountIds.map((accountId) =>
      db.publishLog.create({
        data: {
          workspaceId,
          contentPieceId,
          socialAccountId: accountId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: "PENDING",
        },
        include: {
          contentPiece: {
            select: { id: true, platform: true, title: true, hook: true, youtubeTitle: true, status: true },
          },
          socialAccount: {
            select: { id: true, platform: true, username: true, displayName: true, avatarUrl: true, status: true },
          },
        },
      })
    )
  );

  // Mark the content piece as SCHEDULED if it was a DRAFT/APPROVED
  if (scheduledAt && ["DRAFT", "APPROVED"].includes(piece.status)) {
    await db.contentPiece.update({
      where: { id: contentPieceId },
      data: { status: "SCHEDULED", scheduledAt: new Date(scheduledAt) },
    });
  }

  return NextResponse.json({ logs }, { status: 201 });
}
