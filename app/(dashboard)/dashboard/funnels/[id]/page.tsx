import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FunnelBuilder } from "@/components/funnels/builder";
import type { Block } from "@/types/funnel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FunnelBuilderPage({ params }: Props) {
  const { id } = await params;

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  // Look up the DB user
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/onboarding");

  // Fetch funnel and verify workspace membership
  const funnel = await db.funnel.findUnique({
    where: { id },
    include: {
      workspace: {
        include: {
          members: { where: { userId: user.id } },
        },
      },
      _count: { select: { leads: true } },
    },
  });

  if (!funnel || funnel.workspace.members.length === 0) notFound();

  const blocks = (funnel.blocks as unknown as Block[]) ?? [];

  return (
    <FunnelBuilder
      funnel={{
        id: funnel.id,
        title: funnel.title,
        slug: funnel.slug,
        publishedAt: funnel.publishedAt?.toISOString() ?? null,
        blocks,
        leadsCount: funnel._count.leads,
        workspaceId: funnel.workspaceId,
      }}
    />
  );
}
