import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { slugify } from "@/lib/workspace";

// POST /api/workspaces/check-slug  body: { slug: string }
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slug?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.slug ?? "";
  const slug = slugify(raw);

  if (!slug || slug.length < 2) {
    return NextResponse.json({ available: false, slug, error: "Slug too short" });
  }
  if (slug.length > 48) {
    return NextResponse.json({ available: false, slug, error: "Slug too long" });
  }

  const existing = await db.workspace.findUnique({ where: { slug } });
  return NextResponse.json({ available: !existing, slug });
}
