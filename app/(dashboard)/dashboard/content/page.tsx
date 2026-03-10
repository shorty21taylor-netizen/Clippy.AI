"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  RefreshCw,
  Trash2,
  FileText,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { ContentCard, type ContentPiece } from "@/components/content/content-card";
import { PlatformIcon, PLATFORM_LABELS } from "@/components/social-accounts/platform-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";

type PlatformFilter = "ALL" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
type StatusFilter = "ALL" | "DRAFT" | "APPROVED" | "SCHEDULED" | "POSTED";

interface StatusCount {
  status: StatusFilter;
  _count: { id: number };
}
interface PlatformCount {
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  _count: { id: number };
}

function DeleteConfirm({
  piece,
  onConfirm,
  onCancel,
  loading,
}: {
  piece: ContentPiece;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-[--radius-xl] bg-[--bg-modal] border border-[--border-default] p-6 shadow-[0_8px_48px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-[--status-error-muted] flex items-center justify-center shrink-0">
            <Trash2 size={16} className="text-[--status-error]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[--text-primary]">
            Delete content?
          </h3>
        </div>
        <p className="text-sm text-[--text-secondary] mb-5">
          <span className="text-[--text-primary] font-medium">
            {piece.youtubeTitle ?? piece.hook ?? "This piece"}
          </span>{" "}
          will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-[--radius-md] bg-[--status-error] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ContentPage() {
  const { workspace } = useWorkspace();

  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [platformCounts, setPlatformCounts] = useState<PlatformCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<ContentPiece | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContent = useCallback(
    async (silent = false) => {
      if (!workspace) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const params = new URLSearchParams({ workspaceId: workspace.id });
        if (platformFilter !== "ALL") params.set("platform", platformFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (search) params.set("search", search);

        const res = await fetch(`/api/content?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setPieces(data.pieces ?? []);
        setStatusCounts(data.counts ?? []);
        setPlatformCounts(data.platformCounts ?? []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workspace, platformFilter, statusFilter, search]
  );

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDelete = async () => {
    if (!deleteTarget || !workspace) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/content/${deleteTarget.id}?workspaceId=${workspace.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteTarget(null);
        fetchContent(true);
      }
    } finally {
      setDeleting(false);
    }
  };

  const total = statusCounts.reduce((s, c) => s + c._count.id, 0);
  const getStatusCount = (s: StatusFilter) =>
    s === "ALL" ? total : (statusCounts.find((c) => c.status === s)?._count.id ?? 0);
  const getPlatformCount = (p: "INSTAGRAM" | "TIKTOK" | "YOUTUBE") =>
    platformCounts.find((c) => c.platform === p)?._count.id ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Content Studio" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] w-full mx-auto p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
                Content Library
              </h2>
              <p className="text-sm text-[--text-secondary]">
                {total} piece{total !== 1 ? "s" : ""} created
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                onClick={() => fetchContent(true)}
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </Button>
              <Link href="/dashboard/content/new">
                <Button size="md">
                  <Plus size={14} />
                  Create content
                </Button>
              </Link>
            </div>
          </div>

          {/* Platform filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "INSTAGRAM", "TIKTOK", "YOUTUBE"] as const).map((p) => {
              const active = platformFilter === p;
              const count =
                p === "ALL"
                  ? total
                  : getPlatformCount(p);
              return (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={cn(
                    "flex items-center gap-2 rounded-[--radius-md] px-4 py-2.5 border text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-[--accent-muted] border-[--accent]/30 text-[--accent]"
                      : "bg-[--bg-card] border-[--border-subtle] text-[--text-secondary] hover:border-[--border-default]"
                  )}
                >
                  {p !== "ALL" && <PlatformIcon platform={p} size={14} />}
                  {p === "ALL" ? "All platforms" : PLATFORM_LABELS[p]}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      active
                        ? "bg-[--accent]/20 text-[--accent]"
                        : "bg-[--bg-elevated] text-[--text-tertiary]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + status pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by hook, caption, or title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 bg-[--bg-card] border border-[--border-subtle] rounded-[--radius-md] pl-9 pr-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1">
              {(["ALL", "DRAFT", "APPROVED", "SCHEDULED", "POSTED"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                      statusFilter === s
                        ? "bg-[--accent] text-white"
                        : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.05)]"
                    )}
                  >
                    {s === "ALL"
                      ? "All"
                      : s.charAt(0) + s.slice(1).toLowerCase()}{" "}
                    <span className="opacity-60">{getStatusCount(s)}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Content grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : pieces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-[--radius-lg] bg-[--bg-elevated] border border-[--border-subtle] flex items-center justify-center mb-4">
                <FileText size={22} className="text-[--text-tertiary]" />
              </div>
              <p className="text-[15px] font-medium text-[--text-primary]">
                No content yet
              </p>
              <p className="mt-1 text-sm text-[--text-secondary]">
                Create your first piece of content with Claude.
              </p>
              <Link href="/dashboard/content/new" className="mt-4">
                <Button size="md">
                  <Plus size={14} />
                  Create content
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pieces.map((piece, i) => (
                <ContentCard
                  key={piece.id}
                  piece={piece}
                  index={i}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            piece={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
