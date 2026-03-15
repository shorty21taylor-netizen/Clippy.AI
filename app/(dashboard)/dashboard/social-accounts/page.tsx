"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Upload,
  Search,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { AccountsTable, type SocialAccount } from "@/components/social-accounts/accounts-table";
import { AddAccountModal } from "@/components/social-accounts/add-account-modal";
import { EditAccountModal } from "@/components/social-accounts/edit-account-modal";
import { ImportCSVModal } from "@/components/social-accounts/import-csv-modal";
import { PlatformIcon, PLATFORM_LABELS } from "@/components/social-accounts/platform-icon";
import { AccountRowSkeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

type PlatformFilter = "ALL" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
type StatusFilter = "ALL" | "ACTIVE" | "PENDING" | "BANNED" | "DISCONNECTED";

interface PlatformCount {
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  _count: { id: number };
}
interface StatusCount {
  status: "ACTIVE" | "PENDING" | "BANNED" | "DISCONNECTED";
  _count: { id: number };
}

// ─── Flash banner (success / error from OAuth callback) ───────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  instagram_access_denied: "Instagram connection was cancelled.",
  instagram_missing_params: "Instagram OAuth returned unexpected parameters.",
  instagram_invalid_state: "OAuth state mismatch — possible CSRF attempt.",
  instagram_token_failed: "Could not exchange Instagram authorization code.",
  instagram_no_pages: "No Facebook Pages found. Your account must manage at least one Page.",
  instagram_no_business_accounts: "No Instagram Business or Creator accounts linked to your Pages.",
  instagram_oauth_failed: "Instagram connection failed. Please try again.",
  tiktok_access_denied: "TikTok connection was cancelled.",
  tiktok_missing_params: "TikTok OAuth returned unexpected parameters.",
  tiktok_invalid_state: "OAuth state mismatch — possible CSRF attempt.",
  tiktok_token_exchange_failed: "Could not exchange TikTok authorization code.",
  tiktok_oauth_failed: "TikTok connection failed. Please try again.",
};

function FlashBanner({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 rounded-[--radius-lg] border px-4 py-3 text-sm",
        type === "success"
          ? "bg-[--status-success-muted] border-[--status-success]/25 text-[--status-success]"
          : "bg-[--status-error-muted] border-[--status-error]/25 text-[--status-error]"
      )}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} className="shrink-0" />
      ) : (
        <XCircle size={15} className="shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ─── Stats chip ────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  active,
  onClick,
  icon,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-[--radius-md] px-4 py-2.5 border transition-all duration-150",
        active
          ? "bg-[--accent-muted] border-[--accent]/30 text-[--accent]"
          : "bg-[--bg-card] border-[--border-subtle] text-[--text-secondary] hover:border-[--border-default] hover:text-[--text-primary]"
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "ml-1 rounded-full px-2 py-0.5 text-xs font-bold",
          active
            ? "bg-[--accent]/20 text-[--accent]"
            : "bg-[--bg-elevated] text-[--text-tertiary]"
        )}
      >
        {value}
      </span>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SocialAccountsPage() {
  const { workspace } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [platformCounts, setPlatformCounts] = useState<PlatformCount[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SocialAccount | null>(null);

  // Flash banner from OAuth callback
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Parse OAuth callback params on mount
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const count = searchParams.get("count");

    if (success) {
      if (success === "instagram_connected") {
        const n = count ? parseInt(count, 10) : 1;
        setFlash({
          type: "success",
          message: `Successfully connected ${n} Instagram account${n !== 1 ? "s" : ""}.`,
        });
      } else if (success === "tiktok_connected") {
        setFlash({ type: "success", message: "TikTok account connected successfully." });
      }
      // Clear query params from URL without re-render
      router.replace("/dashboard/social-accounts", { scroll: false });
    } else if (error) {
      const msg = ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.";
      setFlash({ type: "error", message: msg });
      router.replace("/dashboard/social-accounts", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccounts = useCallback(
    async (silent = false) => {
      if (!workspace) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const params = new URLSearchParams({ workspaceId: workspace.id });
        if (platformFilter !== "ALL") params.set("platform", platformFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (search) params.set("search", search);

        const res = await fetch(`/api/social-accounts?${params}`);
        if (!res.ok) return;
        const data = await res.json();

        setAccounts(data.accounts ?? []);
        setPlatformCounts(data.counts ?? []);
        setStatusCounts(data.statusCounts ?? []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workspace, platformFilter, statusFilter, search]
  );

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchAccounts(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalAccounts = platformCounts.reduce(
    (sum, c) => sum + c._count.id,
    0
  );

  const getPlatformCount = (p: "INSTAGRAM" | "TIKTOK" | "YOUTUBE") =>
    platformCounts.find((c) => c.platform === p)?._count.id ?? 0;

  const getStatusCount = (s: "ACTIVE" | "PENDING" | "BANNED" | "DISCONNECTED") =>
    statusCounts.find((c) => c.status === s)?._count.id ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Social Accounts" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] w-full mx-auto p-6 space-y-5">

          {/* Flash banner */}
          <AnimatePresence>
            {flash && (
              <FlashBanner
                type={flash.type}
                message={flash.message}
                onDismiss={() => setFlash(null)}
              />
            )}
          </AnimatePresence>

          {/* Header row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
                All Accounts
              </h2>
              <p className="text-sm text-[--text-secondary]">
                {totalAccounts} account{totalAccounts !== 1 ? "s" : ""} across
                all platforms
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                onClick={() => fetchAccounts(true)}
                className={refreshing ? "opacity-60" : ""}
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setImportOpen(true)}
              >
                <Upload size={14} />
                Import CSV
              </Button>
              <Button size="md" onClick={() => setAddOpen(true)}>
                <Plus size={14} />
                Connect account
              </Button>
            </div>
          </div>

          {/* Platform filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatChip
              label="All platforms"
              value={totalAccounts}
              active={platformFilter === "ALL"}
              onClick={() => setPlatformFilter("ALL")}
              icon={<Users size={14} />}
            />
            {(["INSTAGRAM", "TIKTOK", "YOUTUBE"] as const).map((p) => (
              <StatChip
                key={p}
                label={PLATFORM_LABELS[p]}
                value={getPlatformCount(p)}
                active={platformFilter === p}
                onClick={() =>
                  setPlatformFilter((prev) => (prev === p ? "ALL" : p))
                }
                icon={<PlatformIcon platform={p} size={14} />}
              />
            ))}
          </div>

          {/* Card: search + status filter + table */}
          <div className="rounded-[--radius-xl] bg-[--bg-card] border border-[--border-subtle] overflow-hidden">
            {/* Search + status filter bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border-subtle]">
              <div className="relative flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by username or name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 bg-[--bg-input] border border-[--border-subtle] rounded-[--radius-md] pl-9 pr-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent] transition-colors"
                />
              </div>

              {/* Status pills */}
              <div className="hidden sm:flex items-center gap-1.5 ml-auto">
                {(["ALL", "ACTIVE", "PENDING", "BANNED", "DISCONNECTED"] as const).map(
                  (s) => {
                    const count =
                      s === "ALL"
                        ? totalAccounts
                        : getStatusCount(s);

                    return (
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
                        {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}{" "}
                        <span className="opacity-60">{count}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Table area */}
            {loading ? (
              <div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <AccountRowSkeleton key={i} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <AccountsTable
                  accounts={accounts}
                  onEdit={setEditTarget}
                  onRefresh={() => fetchAccounts(true)}
                />
              </motion.div>
            )}

            {/* Footer count */}
            {!loading && accounts.length > 0 && (
              <div className="px-5 py-3 border-t border-[--border-subtle]">
                <p className="text-xs text-[--text-tertiary]">
                  Showing {accounts.length} account
                  {accounts.length !== 1 ? "s" : ""}
                  {platformFilter !== "ALL" || statusFilter !== "ALL" || search
                    ? " · filtered"
                    : ""}
                </p>
              </div>
            )}
          </div>

          {/* Platform capacity bar */}
          {totalAccounts > 0 && (
            <div className="rounded-[--radius-lg] bg-[--bg-card] border border-[--border-subtle] p-5">
              <p className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide mb-4">
                Account capacity (100 per platform)
              </p>
              <div className="space-y-3">
                {(["INSTAGRAM", "TIKTOK", "YOUTUBE"] as const).map((p) => {
                  const count = getPlatformCount(p);
                  const pct = Math.min((count / 100) * 100, 100);
                  const color =
                    pct >= 90
                      ? "bg-[--status-error]"
                      : pct >= 70
                        ? "bg-[--status-warning]"
                        : "bg-[--accent]";

                  return (
                    <div key={p} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <PlatformIcon platform={p} size={14} />
                        <span className="text-xs text-[--text-secondary]">
                          {PLATFORM_LABELS[p]}
                        </span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-[--bg-elevated] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`h-full rounded-full ${color}`}
                        />
                      </div>
                      <span className="text-xs text-[--text-tertiary] tabular-nums w-16 text-right">
                        {count} / 100
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <EditAccountModal
        account={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => fetchAccounts(true)}
      />
      <ImportCSVModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => fetchAccounts(true)}
      />
    </div>
  );
}
