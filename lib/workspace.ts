import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { WorkspaceRole } from "@prisma/client";

/**
 * Gets the current user's DB record from their Clerk session.
 * Returns null if no session or user not found.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  return db.user.findUnique({ where: { clerkId: userId } });
}

/**
 * Verifies that the current user is a member of the given workspace.
 * Throws a 403 error object if not authorized.
 * Returns the membership record (including role) if authorized.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  allowedRoles?: WorkspaceRole[]
) {
  const user = await getCurrentUser();
  if (!user) {
    throw { status: 401, message: "Unauthorized" };
  }

  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: user.id },
    },
    include: { workspace: true },
  });

  if (!membership) {
    throw { status: 403, message: "Forbidden: not a workspace member" };
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw {
      status: 403,
      message: `Forbidden: requires role ${allowedRoles.join(" or ")}`,
    };
  }

  return { user, membership };
}

/**
 * Generates a URL-safe slug from a workspace name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ensures a slug is unique by appending a number suffix if needed.
 */
export async function uniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await db.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
