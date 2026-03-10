"use client";

import React, { useState } from "react";
import { MoreHorizontal, Globe, Clock, Users, ExternalLink, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FunnelSummary {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  _count: { leads: number };
  createdAt: string;
  updatedAt: string;
}

interface FunnelCardProps {
  funnel: FunnelSummary;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, publish: boolean) => void;
}

export function FunnelCard({ funnel, onDelete, onTogglePublish }: FunnelCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isPublished = Boolean(funnel.publishedAt);
  const leadCount = funnel._count.leads;

  return (
    <div className="rounded-[--radius-lg] bg-[--bg-card] border border-[--border-subtle] p-5 flex flex-col gap-4 hover:border-[--accent]/30 transition-colors relative">
      {/* Status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/funnels/${funnel.id}`}
            className="text-base font-semibold text-[--text-primary] hover:text-[--accent] transition-colors line-clamp-1"
          >
            {funnel.title}
          </Link>
          <p className="text-xs text-[--text-tertiary] mt-0.5 font-mono">/f/{funnel.slug}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            isPublished
              ? "bg-[--status-success-muted] text-[--status-success]"
              : "bg-[--bg-elevated] text-[--text-tertiary] border border-[--border-subtle]"
          )}>
            <Globe size={9} />
            {isPublished ? "Live" : "Draft"}
          </span>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="h-7 w-7 flex items-center justify-center rounded-[--radius-sm] text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.06)] transition-all"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 min-w-[180px] rounded-[--radius-lg] bg-[--bg-popover] border border-[--border-subtle] shadow-xl py-1">
                  <Link
                    href={`/f/${funnel.slug}`}
                    target="_blank"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[--text-primary] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ExternalLink size={13} className="text-[--text-tertiary]" />
                    View public page
                  </Link>
                  <button
                    onClick={() => { onTogglePublish(funnel.id, !isPublished); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[--text-primary] hover:bg-[rgba(255,255,255,0.05)] transition-colors w-full text-left"
                  >
                    {isPublished
                      ? <ToggleLeft size={13} className="text-[--text-tertiary]" />
                      : <ToggleRight size={13} className="text-[--text-tertiary]" />}
                    {isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <div className="border-t border-[--border-subtle] my-1" />
                  <button
                    onClick={() => { onDelete(funnel.id); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[--status-error] hover:bg-[--status-error-muted] transition-colors w-full text-left"
                  >
                    <Trash2 size={13} />
                    Delete funnel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[--text-secondary]">
        <span className="flex items-center gap-1">
          <Users size={11} className="text-[--text-tertiary]" />
          {leadCount} lead{leadCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock size={11} className="text-[--text-tertiary]" />
          {new Date(funnel.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Edit link */}
      <Link
        href={`/dashboard/funnels/${funnel.id}`}
        className="block w-full text-center text-xs font-medium text-[--accent] hover:underline"
      >
        Edit funnel →
      </Link>
    </div>
  );
}
