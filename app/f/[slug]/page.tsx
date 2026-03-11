import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BlockRenderer } from "@/components/funnels/block-renderers";
import { collectFontsFromStyles, buildGoogleFontsUrl } from "@/lib/style-utils";
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

  // Collect all fonts used across blocks
  const allFonts = new Set<string>();
  for (const block of blocks) {
    collectFontsFromStyles(block.styles).forEach((f) => allFonts.add(f));
  }
  const fontsUrl = buildGoogleFontsUrl(Array.from(allFonts));

  return (
    <div className="min-h-screen bg-white">
      {/* Dynamic Google Fonts */}
      {fontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={fontsUrl} />
        </>
      )}

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <div className="text-5xl mb-4">🚧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{funnel.title}</h1>
          <p className="text-gray-500">This page is coming soon.</p>
        </div>
      ) : (
        <>
          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} slug={slug} mode="live" />
          ))}
        </>
      )}

      {/* IntersectionObserver for scroll-triggered entrance animations */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  if (typeof IntersectionObserver === 'undefined') return;
  var targets = document.querySelectorAll('.animate-target[data-animate]');
  if (!targets.length) return;
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var dur = el.getAttribute('data-animate-duration');
      var delay = el.getAttribute('data-animate-delay');
      var easing = el.getAttribute('data-animate-easing');
      if (dur)    el.style.setProperty('--animate-duration', dur + 'ms');
      if (delay)  el.style.setProperty('--animate-delay', delay + 'ms');
      if (easing) el.style.setProperty('--animate-easing', easing);
      el.classList.add('is-visible');
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(function(el) { io.observe(el); });
})();
          `,
        }}
      />
    </div>
  );
}
