"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Hash,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  CalendarClock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon, PLATFORM_LABELS } from "@/components/social-accounts/platform-icon";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";

export interface ContentPiece {
  id: string;
  workspaceId: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  title: string | null;
  hook: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  scriptShort: string | null;
  youtubeTitle: string | null;
  thumbnailText: string | null;
  status: "DRAFT" | "APPROVED" | "SCHEDULED" | "POSTED";
  scheduledAt: string | null;
  rawInput: string;
  createdAt: string;
}

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", variant: "default" as const, icon: FileText },
  APPROVED: { label: "Approved", variant: "success" as const, icon: CheckCircle2 },
  SCHEDULED: { label: "Scheduled", variant: "pending" as const, icon: CalendarClock },
  POSTED: { label: "Posted", variant: "accent" as const, icon: Send },
};

interface ContentCardProps {
  piece: ContentPiece;
  index: number;
  onDelete: (piece: ContentPiece) => void;
}

export function ContentCard({ piece, index, onDelete }: ContentCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const statusCfg = STATUS_CONFIG[piece.status];
  const StatusIcon = statusCfg.icon;

  const displayTitle = piece.youtubeTitle ?? piece.title ?? piece.hook ?? "Untitled";
  const preview = piece.hook ?? piece.caption ?? piece.rawInput;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="relative group rounded-[--radius-lg] bg-[--bg-card] border border-[--border-subtle] overflow-hidden hover:border-[--border-default] transition-all duration-150"
    >
      {/* Platform color strip */}
      <div
        className={cn(
          "h-0.5 w-full",
          piece.platform === "INSTAGRAM"
            ? "bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888]"
            : piece.platform === "TIKTOK"
              ? "bg-[#69C9D0]"
              : "bg-[#FF0000]"
        )}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <PlatformIcon platform={piece.platform} size={16} />
            <span className="text-xs text-[--text-tertiary]">
              {PLATFORM_LABELS[piece.platform]}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusCfg.variant}>
              <StatusIcon size={10} />
              {statusCfg.label}
            </Badge>

            {/* Action menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen((v) => !v);
                }}
                className="h-6 w-6 rounded flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(255,255,255,0.06)] transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-7 z-20 w-36 rounded-[--radius-md] bg-[--bg-modal] border border-[--border-default] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
                    <Link
                      href={`/dashboard/content/${piece.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    >
                      <Pencil size={12} />
                      Edit
                    </Link>
                    <div className="h-px bg-[--border-subtle] mx-2" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(piece);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[--status-error] hover:bg-[--status-error-muted] transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title / hook */}
        <Link href={`/dashboard/content/${piece.id}`} className="block group/link">
          <h3 className="text-sm font-semibold text-[--text-primary] line-clamp-2 group-hover/link:text-[--accent] transition-colors mb-1.5">
            {displayTitle}
          </h3>
          {preview && preview !== displayTitle && (
            <p className="text-xs text-[--text-secondary] line-clamp-2 leading-relaxed">
              {preview.slice(0, 120)}{preview.length > 120 ? "…" : ""}
            </p>
          )}
        </Link>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[--border-subtle]">
          {piece.hashtags.length > 0 && (
            <div className="flex items-center gap-1 text-[--text-tertiary]">
              <Hash size={11} />
              <span className="text-[11px]">{piece.hashtags.length} tags</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[--text-tertiary] ml-auto">
            <Clock size={11} />
            <span className="text-[11px]">{formatDate(piece.createdAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
