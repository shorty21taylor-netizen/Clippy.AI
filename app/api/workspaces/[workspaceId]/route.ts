import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember, slugify, uniqueSlug } from "@/lib/workspace";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  slug: z.string().min(2).max(48).optional(),
  challengeTicketPrice: z.number().min(0).optional(),
  coachingProgramPrice: z.number().min(0).optional(),
});

// PATCH /api/workspaces/[workspaceId] — update name, slug, or prices
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = (err as { message?: string }).message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields", details: parsed.error.issues }, { status: 400 });
  }

  const { name, slug: rawSlug, challengeTicketPrice, coachingProgramPrice } = parsed.data;

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    updates.name = name;
  }

  if (rawSlug !== undefined) {
    const candidate = slugify(rawSlug);
    if (!candidate || candidate.length < 2) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    // Check uniqueness (exclude self)
    const existing = await db.workspace.findUnique({ where: { slug: candidate } });
    if (existing && existing.id !== workspaceId) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    updates.slug = candidate;
  }

  if (challengeTicketPrice !== undefined) updates.challengeTicketPrice = challengeTicketPrice;
  if (coachingProgramPrice !== undefined) updates.coachingProgramPrice = coachingProgramPrice;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const workspace = await db.workspace.update({
    where: { id: workspaceId },
    data: updates,
    select: { id: true, name: true, slug: true, challengeTicketPrice: true, coachingProgramPrice: true },
  });

  return NextResponse.json({ workspace });
}

// DELETE /api/workspaces/[workspaceId] — delete workspace (OWNER only)
// body: { confirmName: string } — must match workspace name exactly
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER"]);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = (err as { message?: string }).message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let body: { confirmName?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional for DELETE
  }

  if (body.confirmName !== workspace.name) {
    return NextResponse.json(
      { error: "Confirmation name does not match workspace name" },
      { status: 400 }
    );
  }

  // Cascade deletes are handled by Prisma schema (onDelete: Cascade)
  await db.workspace.delete({ where: { id: workspaceId } });

  return NextResponse.json({ deleted: true });
}
