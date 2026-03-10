import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/workspace";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(64),
});

// GET /api/workspaces — list all workspaces the current user belongs to
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    include: {
      workspaces: {
        include: { workspace: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const workspaces = user.workspaces.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));

  return NextResponse.json({ workspaces });
}

// POST /api/workspaces — create a new workspace
export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name } = parsed.data;

  // Upsert the user record (first call after Clerk sign-up)
  const clerkUser = await currentUser();
  const user = await db.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? "",
      name: clerkUser?.fullName ?? clerkUser?.firstName ?? null,
      avatarUrl: clerkUser?.imageUrl ?? null,
    },
  });

  const slug = await uniqueSlug(slugify(name));

  const workspace = await db.workspace.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
