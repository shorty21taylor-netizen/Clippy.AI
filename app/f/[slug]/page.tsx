import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BlockRenderer } from "@/components/funnels/block-renderers";
import type { Block } from "@/types/funnel";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const funnel = await db.funnel.findUnique({
    where: { slug },
    select: { title: true },
  });
  return { title: funnel?.title ?? "Funnel" };
}

export default async function PublicFunnelPage({ params }: Props) {
  const { slug } = await params;

  const funnel = await db.funnel.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true, publishedAt: true, blocks: true },
  });

  if (!funnel || !funnel.publishedAt) notFound();

  const blocks = (funnel.blocks as unknown as Block[]) ?? [];

  return (
    <div className="min-h-screen bg-white">
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <div className="text-5xl mb-4">🚧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{funnel.title}</h1>
          <p className="text-gray-500">This page is coming soon.</p>
        </div>
      ) : (
        <>
          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} slug={slug} />
          ))}
        </>
      )}
    </div>
  );
}
