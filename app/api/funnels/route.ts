import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "funnel";
  let suffix = 0;
  while (await db.funnel.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

// GET /api/funnels?workspaceId=xxx
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

  const funnels = await db.funnel.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, workspaceId: true, slug: true, title: true,
      publishedAt: true, createdAt: true, updatedAt: true,
      _count: { select: { leads: true } },
    },
  });

  return NextResponse.json({ funnels });
}

// POST /api/funnels
export async function POST(req: Request) {
  const body = await req.json() as { workspaceId: string; title: string };
  const { workspaceId, title } = body;

  if (!workspaceId || !title?.trim())
    return NextResponse.json({ error: "workspaceId and title required" }, { status: 400 });

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const slug = await uniqueSlug(slugify(title.trim()));

  const funnel = await db.funnel.create({
    data: {
      workspaceId,
      title: title.trim(),
      slug,
      blocks: [],
    },
  });

  return NextResponse.json({ funnel }, { status: 201 });
}
