/**
 * Clerk webhook handler — syncs user creation/updates to our database.
 * Configure in Clerk Dashboard → Webhooks → add endpoint:
 *   https://your-domain.com/api/webhooks/clerk
 * Events: user.created, user.updated, user.deleted
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/workspace";

// We do lightweight event handling without the Svix SDK for simplicity.
// In production, add `npm install svix` and verify the webhook signature.

interface ClerkUserEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

export async function POST(req: Request) {
  // Basic guard: only accept from our app in dev (Svix signature check recommended for production)
  const headerList = await headers();
  const svixId = headerList.get("svix-id");
  if (!svixId) {
    return NextResponse.json({ error: "Missing svix-id header" }, { status: 400 });
  }

  const payload = (await req.json()) as ClerkUserEvent;
  const { type, data } = payload;

  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;

  if (!primaryEmail) {
    return NextResponse.json({ error: "No primary email" }, { status: 400 });
  }

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

  if (type === "user.created" || type === "user.updated") {
    const dbUser = await db.user.upsert({
      where: { clerkId: data.id },
      create: {
        clerkId: data.id,
        email: primaryEmail,
        name,
        avatarUrl: data.image_url,
      },
      update: {
        email: primaryEmail,
        name,
        avatarUrl: data.image_url,
      },
    });

    // Auto-create a default workspace for brand new users
    if (type === "user.created") {
      const existingMembership = await db.workspaceMember.findFirst({
        where: { userId: dbUser.id },
      });
      if (!existingMembership) {
        const workspaceName = data.first_name
          ? `${data.first_name}'s Workspace`
          : "My Workspace";
        const baseSlug = slugify(workspaceName) + "-" + dbUser.id.slice(-4);
        const slug = await uniqueSlug(baseSlug);
        await db.workspace.create({
          data: {
            name: workspaceName,
            slug,
            members: {
              create: { userId: dbUser.id, role: "OWNER" },
            },
          },
        });
      }
    }
  }

  if (type === "user.deleted") {
    await db.user
      .delete({ where: { clerkId: data.id } })
      .catch(() => null); // Ignore if user doesn't exist
  }

  return NextResponse.json({ received: true });
}
