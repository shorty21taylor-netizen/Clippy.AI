"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  RefreshCw,
  Trash2,
  PlayCircle,
  ExternalLink,
  CalendarDays,
  Users,
} from "lucide-react";
import { PlatformIcon, PLATFORM_LABELS } from "@/components/social-accounts/platform-icon";
import { PostStatusBadge, type PostStatus } from "./status-badge";
import { formatDate, cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";

export interface PublishLog {
  id: string;
  workspaceId: string;
  status: PostStatus;
  scheduledAt: string | null;
  executedAt: string | null;
  errorMessage: string | null;
  platformPostId: string | null;
  createdAt: string;
  contentPiece: {
    id: string;
    platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
    title: string | null;
    hook: string | null;
    youtubeTitle: string | null;
    status: string;
  };
  socialAccount: {
    id: string;
    platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: string;
  };
}

interface QueueTableProps {
  logs: PublishLog[];
  onRefresh: () => void;
}

function ActionMenu({
  log,
  onPublishNow,
  onRetry,
  onCancel,
}: {
  log: PublishLog;
  onPublishNow: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="h-7 w-7 rounded flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(255,255,255,0.06)] transition-all"
      >
        <MoreHorizontal size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-8 z-20 w-44 rounded-[--radius-md] bg-[--bg-modal] border border-[--border-default] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {log.status === "PENDING" && (
                <button
                  onClick={() => { setOpen(false); onPublishNow(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  <PlayCircle size={13} />
                  Publish now
                </button>
              )}
              {log.status === "FAILED" && (
                <button
                  onClick={() => { setOpen(false); onRetry(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  <RefreshCw size={13} />
                  Retry
                </button>
              )}
              {log.status === "SUCCESS" && log.platformPostId && (
                <button
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  <ExternalLink size={13} />
                  View post
                </button>
              )}
              {["PENDING", "FAILED"].includes(log.status) && (
                <>
                  <div className="h-px bg-[--border-subtle] mx-2" />
                  <button
                    onClick={() => { setOpen(false); onCancel(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--status-error] hover:bg-[--status-error-muted] transition-colors"
                  >
                    <Trash2 size={13} />
                    Cancel &amp; remove
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QueueTable({ logs, onRefresh }: QueueTableProps) {
  const { workspace } = useWorkspace();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const updateLog = async (id: string, data: Record<string, unknown>) => {
    if (!workspace) return;
    setActionLoading(id);
    try {
      await fetch(`/api/publish-logs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, ...data }),
      });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  const deleteLog = async (id: string) => {
    if (!workspace) return;
    setActionLoading(id);
    try {
      await fetch(`/api/publish-logs/${id}?workspaceId=${workspace.id}`, {
        method: "DELETE",
      });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  // Simulate a publish: IN_PROGRESS → SUCCESS after 1.5s
  const handlePublishNow = async (log: PublishLog) => {
    await updateLog(log.id, { status: "IN_PROGRESS", executedAt: new Date().toISOString() });
    setTimeout(async () => {
      await updateLog(log.id, {
        status: "SUCCESS",
        platformPostId: `sim_${Date.now()}`,
        executedAt: new Date().toISOString(),
      });
    }, 1500);
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-[--radius-lg] bg-[--bg-elevated] border border-[--border-subtle] flex items-center justify-center mb-4">
          <CalendarDays size={22} className="text-[--text-tertiary]" />
        </div>
        <p className="text-[15px] font-medium text-[--text-primary]">
          No scheduled posts
        </p>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Schedule your first post using the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[--border-subtle]">
            {["Content", "Account", "Platform", "Status", "Scheduled", "Executed", ""].map((col) => (
              <th
                key={col}
                className="px-5 py-3 text-left text-xs font-medium text-[--text-tertiary] uppercase tracking-wide whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => {
            const isLoading = actionLoading === log.id;
            const contentTitle =
              log.contentPiece.youtubeTitle ??
              log.contentPiece.title ??
              log.contentPiece.hook?.slice(0, 60) ??
              "Untitled";

            return (
              <motion.tr
                key={log.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className={cn(
                  "border-b border-[--border-subtle] transition-colors",
                  isLoading
                    ? "opacity-50"
                    : "hover:bg-[rgba(255,255,255,0.02)]"
                )}
              >
                {/* Content */}
                <td className="px-5 py-3.5 min-w-[200px]">
                  <p className="text-sm font-medium text-[--text-primary] line-clamp-1">
                    {contentTitle}
                  </p>
                  {log.errorMessage && (
                    <p className="text-xs text-[--status-error] mt-0.5 line-clamp-1">
                      {log.errorMessage}
                    </p>
                  )}
                </td>

                {/* Account */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    {log.socialAccount.avatarUrl ? (
                      <img
                        src={log.socialAccount.avatarUrl}
                        alt={log.socialAccount.username}
                        className="h-6 w-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-[--bg-elevated] border border-[--border-subtle] flex items-center justify-center shrink-0">
                        <Users size={10} className="text-[--text-tertiary]" />
                      </div>
                    )}
                    <span className="text-sm text-[--text-secondary] whitespace-nowrap">
                      @{log.socialAccount.username}
                    </span>
                  </div>
                </td>

                {/* Platform */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform={log.socialAccount.platform} size={16} />
                    <span className="text-xs text-[--text-secondary]">
                      {PLATFORM_LABELS[log.socialAccount.platform]}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <PostStatusBadge status={log.status} />
                </td>

                {/* Scheduled */}
                <td className="px-5 py-3.5">
                  <span className="text-xs text-[--text-secondary] whitespace-nowrap">
                    {log.scheduledAt ? formatDateTime(log.scheduledAt) : "Immediate"}
                  </span>
                </td>

                {/* Executed */}
                <td className="px-5 py-3.5">
                  <span className="text-xs text-[--text-secondary] whitespace-nowrap">
                    {log.executedAt ? formatDateTime(log.executedAt) : "—"}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5">
                  <ActionMenu
                    log={log}
                    onPublishNow={() => handlePublishNow(log)}
                    onRetry={() =>
                      updateLog(log.id, { status: "PENDING", errorMessage: null })
                    }
                    onCancel={() => deleteLog(log.id)}
                  />
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
