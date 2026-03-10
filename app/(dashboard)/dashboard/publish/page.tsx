"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  RefreshCw,
  CalendarDays,
  List,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { QueueTable, type PublishLog } from "@/components/publisher/queue-table";
import { CalendarView } from "@/components/publisher/calendar-view";
import { ScheduleModal } from "@/components/publisher/schedule-modal";
import { Modal } from "@/components/ui/modal";
import { PostStatusBadge } from "@/components/publisher/status-badge";
import { PlatformIcon, PLATFORM_LABELS } from "@/components/social-accounts/platform-icon";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

type Tab = "queue" | "calendar";
type StatusFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED";

interface StatusCount {
  status: StatusFilter;
  _count: { id: number };
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-[--radius-lg] bg-[--bg-card] border border-[--border-subtle] p-4 flex items-center gap-3">
      <div
        className={cn(
          "h-10 w-10 rounded-[--radius-md] flex items-center justify-center shrink-0",
          accent ?? "bg-[--bg-elevated]"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[--text-primary] tabular-nums">{value}</p>
        <p className="text-xs text-[--text-secondary]">{label}</p>
      </div>
    </div>
  );
}

// Log detail sheet shown when user clicks a calendar cell item
function LogDetailModal({
  log,
  onClose,
  onRefresh,
}: {
  log: PublishLog | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { workspace } = useWorkspace();
  const [actionLoading, setActionLoading] = useState(false);

  if (!log) return null;

  const contentTitle =
    log.contentPiece.youtubeTitle ??
    log.contentPiece.title ??
    log.contentPiece.hook?.slice(0, 60) ??
    "Untitled";

  const doAction = async (data: Record<string, unknown>) => {
    if (!workspace) return;
    setActionLoading(true);
    try {
      await fetch(`/api/publish-logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, ...data }),
      });
      onRefresh();
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const doDelete = async () => {
    if (!workspace) return;
    setActionLoading(true);
    try {
      await fetch(`/api/publish-logs/${log.id}?workspaceId=${workspace.id}`, {
        method: "DELETE",
      });
      onRefresh();
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishNow = async () => {
    await doAction({ status: "IN_PROGRESS", executedAt: new Date().toISOString() });
    setTimeout(async () => {
      if (!workspace) return;
      await fetch(`/api/publish-logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          status: "SUCCESS",
          platformPostId: `sim_${Date.now()}`,
          executedAt: new Date().toISOString(),
        }),
      });
      onRefresh();
    }, 1500);
  };

  return (
    <Modal open={Boolean(log)} onClose={onClose} title="Scheduled post" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] p-4">
          <PlatformIcon platform={log.socialAccount.platform} size={20} />
          <div>
            <p className="text-sm font-medium text-[--text-primary]">
              @{log.socialAccount.username}
            </p>
            <p className="text-xs text-[--text-secondary]">
              {PLATFORM_LABELS[log.socialAccount.platform]}
            </p>
          </div>
          <div className="ml-auto">
            <PostStatusBadge status={log.status} />
          </div>
        </div>

        <div className="rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] p-4">
          <p className="text-xs text-[--text-tertiary] mb-1">Content</p>
          <p className="text-sm text-[--text-primary] font-medium">{contentTitle}</p>
        </div>

        {log.scheduledAt && (
          <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
            <CalendarDays size={14} />
            {new Date(log.scheduledAt).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}

        {log.errorMessage && (
          <p className="text-sm text-[--status-error] bg-[--status-error-muted] rounded-[--radius-md] px-3 py-2">
            {log.errorMessage}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          {log.status === "PENDING" && (
            <Button
              size="sm"
              loading={actionLoading}
              onClick={handlePublishNow}
              className="flex-1"
            >
              Publish now
            </Button>
          )}
          {log.status === "FAILED" && (
            <Button
              size="sm"
              variant="secondary"
              loading={actionLoading}
              onClick={() => doAction({ status: "PENDING", errorMessage: null })}
              className="flex-1"
            >
              <RefreshCw size={13} />
              Retry
            </Button>
          )}
          {["PENDING", "FAILED"].includes(log.status) && (
            <Button
              size="sm"
              variant="destructive"
              loading={actionLoading}
              onClick={doDelete}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PublishPage() {
  const { workspace } = useWorkspace();

  const [tab, setTab] = useState<Tab>("queue");
  const [logs, setLogs] = useState<PublishLog[]>([]);
  const [counts, setCounts] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<PublishLog | null>(null);

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (!workspace) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const params = new URLSearchParams({ workspaceId: workspace.id });
        if (statusFilter !== "ALL") params.set("status", statusFilter);

        const res = await fetch(`/api/publish-logs?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setLogs(data.logs ?? []);
        setCounts(data.counts ?? []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workspace, statusFilter]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getCount = (s: StatusFilter) =>
    s === "ALL"
      ? counts.reduce((sum, c) => sum + c._count.id, 0)
      : (counts.find((c) => c.status === s)?._count.id ?? 0);

  const total = getCount("ALL");
  const pending = getCount("PENDING");
  const succeeded = getCount("SUCCESS");
  const failed = getCount("FAILED");
  const inProgress = getCount("IN_PROGRESS");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Publisher" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] w-full mx-auto p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
                Publish Queue
              </h2>
              <p className="text-sm text-[--text-secondary]">
                {total} job{total !== 1 ? "s" : ""} total
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                onClick={() => fetchLogs(true)}
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </Button>
              <Button size="md" onClick={() => setScheduleOpen(true)}>
                <Plus size={14} />
                Schedule post
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Scheduled"
              value={pending}
              icon={<Clock size={18} className="text-[--status-warning]" />}
              accent="bg-[--status-warning-muted]"
            />
            <StatCard
              label="Publishing"
              value={inProgress}
              icon={<Loader2 size={18} className="text-[--accent] animate-spin" />}
              accent="bg-[--accent-muted]"
            />
            <StatCard
              label="Posted"
              value={succeeded}
              icon={<CheckCircle2 size={18} className="text-[--status-success]" />}
              accent="bg-[--status-success-muted]"
            />
            <StatCard
              label="Failed"
              value={failed}
              icon={<XCircle size={18} className="text-[--status-error]" />}
              accent="bg-[--status-error-muted]"
            />
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-[--border-subtle]">
            {(["queue", "calendar"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 -mb-px",
                  tab === t
                    ? "border-[--accent] text-[--accent]"
                    : "border-transparent text-[--text-secondary] hover:text-[--text-primary]"
                )}
              >
                {t === "queue" ? <List size={14} /> : <CalendarDays size={14} />}
                {t === "queue" ? "Queue" : "Calendar"}
              </button>
            ))}

            {/* Status filter pills — only shown in queue tab */}
            {tab === "queue" && (
              <div className="flex items-center gap-1 ml-auto pb-0.5">
                {(["ALL", "PENDING", "IN_PROGRESS", "SUCCESS", "FAILED"] as StatusFilter[]).map(
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
                        : s === "IN_PROGRESS"
                          ? "Live"
                          : s.charAt(0) + s.slice(1).toLowerCase()}{" "}
                      <span className="opacity-60">{getCount(s)}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Content area */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[--text-tertiary]" />
            </div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "queue" ? (
                <div className="rounded-[--radius-xl] bg-[--bg-card] border border-[--border-subtle] overflow-hidden">
                  <QueueTable logs={logs} onRefresh={() => fetchLogs(true)} />
                  {logs.length > 0 && (
                    <div className="px-5 py-3 border-t border-[--border-subtle]">
                      <p className="text-xs text-[--text-tertiary]">
                        Showing {logs.length} job{logs.length !== 1 ? "s" : ""}
                        {statusFilter !== "ALL" ? " · filtered" : ""}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <CalendarView
                  logs={logs}
                  onSelectLog={setSelectedLog}
                />
              )}
            </motion.div>
          )}

          {/* Publishing note */}
          <div className="rounded-[--radius-lg] bg-[--bg-elevated] border border-[--border-subtle] px-4 py-3 flex items-start gap-3">
            <Send size={14} className="text-[--accent] shrink-0 mt-0.5" />
            <p className="text-xs text-[--text-secondary] leading-relaxed">
              <span className="font-medium text-[--text-primary]">Publishing simulation</span>
              {" — "}Clicking <em>Publish now</em> simulates a post by transitioning the job
              through IN_PROGRESS → SUCCESS. Connect real platform OAuth credentials in
              Settings to enable live publishing.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSuccess={() => fetchLogs(true)}
      />

      <LogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onRefresh={() => fetchLogs(true)}
      />
    </div>
  );
}
