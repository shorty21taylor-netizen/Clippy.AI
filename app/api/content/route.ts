import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import type { Platform, ContentStatus } from "@prisma/client";

const createSchema = z.object({
  workspaceId: z.string().min(1),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE"]),
  rawInput: z.string().min(1),
  title: z.string().optional(),
  hook: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  cta: z.string().optional(),
  scriptShort: z.string().optional(),
  youtubeTitle: z.string().optional(),
  thumbnailText: z.string().optional(),
  status: z.enum(["DRAFT", "APPROVED", "SCHEDULED", "POSTED"]).default("DRAFT"),
});

// GET /api/content?workspaceId=xxx[&platform=...][&status=...][&search=...]
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

  const platform = searchParams.get("platform") as Platform | null;
  const status = searchParams.get("status") as ContentStatus | null;
  const search = searchParams.get("search");

  const pieces = await db.contentPiece.findMany({
    where: {
      workspaceId,
      ...(platform && { platform }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { hook: { contains: search, mode: "insensitive" } },
          { caption: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, workspaceId: true, title: true, platform: true,
      hook: true, caption: true, hashtags: true, cta: true,
      scriptShort: true, youtubeTitle: true, thumbnailText: true,
      status: true, scheduledAt: true, createdAt: true, updatedAt: true,
      rawInput: true,
    },
  });

  const counts = await db.contentPiece.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { id: true },
  });

  const platformCounts = await db.contentPiece.groupBy({
    by: ["platform"],
    where: { workspaceId },
    _count: { id: true },
  });

  return NextResponse.json({ pieces, counts, platformCounts });
}

// POST /api/content — save a content piece
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );

  const { workspaceId, ...data } = parsed.data;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const piece = await db.contentPiece.create({
    data: { workspaceId, ...data },
  });

  return NextResponse.json({ piece }, { status: 201 });
}
