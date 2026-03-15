"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Clock,
  WifiOff,
  Users,
  Wifi,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon, PLATFORM_LABELS } from "./platform-icon";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";

export interface SocialAccount {
  id: string;
  workspaceId: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: "ACTIVE" | "PENDING" | "BANNED" | "DISCONNECTED";
  followerCount: number | null;
  tags: string[];
  proxyConfig: string | null;
  lastPostedAt: string | null;
  createdAt: string;
}

interface AccountsTableProps {
  accounts: SocialAccount[];
  onEdit: (account: SocialAccount) => void;
  onRefresh: () => void;
}

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Active",
    variant: "success" as const,
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    variant: "pending" as const,
    icon: Clock,
  },
  BANNED: {
    label: "Banned",
    variant: "error" as const,
    icon: ShieldAlert,
  },
  DISCONNECTED: {
    label: "Disconnected",
    variant: "warning" as const,
    icon: WifiOff,
  },
};

function ActionMenu({
  account,
  onEdit,
  onDelete,
  onReconnect,
}: {
  account: SocialAccount;
  onEdit: () => void;
  onDelete: () => void;
  onReconnect?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const canReconnect =
    account.status === "DISCONNECTED" &&
    (account.platform === "INSTAGRAM" || account.platform === "TIKTOK");

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="h-7 w-7 rounded-[--radius-sm] flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-150"
      >
        <MoreHorizontal size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-8 z-20 w-44 rounded-[--radius-md] bg-[--bg-modal] border border-[--border-default] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {canReconnect && (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onReconnect?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--status-warning] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  >
                    <RefreshCw size={13} />
                    Reconnect
                  </button>
                  <div className="h-px bg-[--border-subtle] mx-2" />
                </>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                <Pencil size={13} />
                Edit account
              </button>
              <div className="h-px bg-[--border-subtle] mx-2" />
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--status-error] hover:bg-[--status-error-muted] transition-colors"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteConfirm({
  account,
  onConfirm,
  onCancel,
  loading,
}: {
  account: SocialAccount;
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
            Delete account?
          </h3>
        </div>
        <p className="text-sm text-[--text-secondary] mb-5">
          <span className="text-[--text-primary] font-medium">
            @{account.username}
          </span>{" "}
          will be permanently removed along with all associated data.
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

export function AccountsTable({
  accounts,
  onEdit,
  onRefresh,
}: AccountsTableProps) {
  const { workspace } = useWorkspace();
  const [deleteTarget, setDeleteTarget] = useState<SocialAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget || !workspace) return;
    setDeleting(true);

    try {
      const res = await fetch(
        `/api/social-accounts/${deleteTarget.id}?workspaceId=${workspace.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteTarget(null);
        onRefresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleReconnect = (account: SocialAccount) => {
    if (!workspace) return;
    const platform = account.platform.toLowerCase();
    window.location.href = `/api/auth/${platform}?workspaceId=${workspace.id}`;
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-[--radius-lg] bg-[--bg-elevated] border border-[--border-subtle] flex items-center justify-center mb-4">
          <Users size={22} className="text-[--text-tertiary]" />
        </div>
        <p className="text-[15px] font-medium text-[--text-primary]">
          No accounts yet
        </p>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Add your first social account or import a CSV to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[--border-subtle]">
              {["Account", "Platform", "Status", "Followers", "Tags", "Last post", "Proxy", ""].map(
                (col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-xs font-medium text-[--text-tertiary] uppercase tracking-wide whitespace-nowrap first:pl-5"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, i) => {
              const status = STATUS_CONFIG[account.status];
              const StatusIcon = status.icon;

              return (
                <motion.tr
                  key={account.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="border-b border-[--border-subtle] hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                >
                  {/* Account */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {account.avatarUrl ? (
                        <img
                          src={account.avatarUrl}
                          alt={account.username}
                          className="h-8 w-8 rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[--bg-elevated] border border-[--border-subtle] flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[--text-tertiary] uppercase">
                            {account.username[0]}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[--text-primary] truncate">
                          @{account.username}
                        </p>
                        {account.displayName && (
                          <p className="text-xs text-[--text-tertiary] truncate">
                            {account.displayName}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Platform */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={account.platform} size={18} />
                      <span className="text-sm text-[--text-secondary]">
                        {PLATFORM_LABELS[account.platform]}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <Badge variant={status.variant}>
                      <StatusIcon size={10} />
                      {status.label}
                    </Badge>
                  </td>

                  {/* Followers */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[--text-primary] font-medium tabular-nums">
                      {account.followerCount != null
                        ? formatNumber(account.followerCount)
                        : "—"}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {account.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded-full bg-[--bg-elevated] border border-[--border-subtle] px-2 py-0.5 text-[10px] text-[--text-secondary]"
                        >
                          {tag}
                        </span>
                      ))}
                      {account.tags.length > 3 && (
                        <span className="text-[10px] text-[--text-tertiary]">
                          +{account.tags.length - 3}
                        </span>
                      )}
                      {account.tags.length === 0 && (
                        <span className="text-xs text-[--text-tertiary]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Last post */}
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-[--text-secondary] whitespace-nowrap">
                      {account.lastPostedAt
                        ? formatDate(account.lastPostedAt)
                        : "Never"}
                    </span>
                  </td>

                  {/* Proxy */}
                  <td className="px-5 py-3.5">
                    {account.proxyConfig ? (
                      <div className="flex items-center gap-1.5">
                        <Wifi size={12} className="text-[--status-success]" />
                        <span className="text-xs text-[--text-secondary]">
                          Configured
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[--text-tertiary]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <ActionMenu
                      account={account}
                      onEdit={() => onEdit(account)}
                      onDelete={() => setDeleteTarget(account)}
                      onReconnect={() => handleReconnect(account)}
                    />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            account={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </>
  );
}
