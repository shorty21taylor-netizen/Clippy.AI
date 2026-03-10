"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PlatformIcon, PLATFORM_LABELS } from "@/components/social-accounts/platform-icon";
import { PostStatusBadge } from "./status-badge";
import { useWorkspace } from "@/lib/workspace-context";
import { AlertCircle, CheckSquare, Square, CalendarDays, Zap } from "lucide-react";

interface ContentOption {
  id: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  title: string | null;
  hook: string | null;
  youtubeTitle: string | null;
  status: string;
}

interface AccountOption {
  id: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  username: string;
  displayName: string | null;
  status: string;
}

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Pre-select a content piece (from content detail page)
  preselectedContentId?: string;
}

export function ScheduleModal({
  open,
  onClose,
  onSuccess,
  preselectedContentId,
}: ScheduleModalProps) {
  const { workspace } = useWorkspace();

  const [contentList, setContentList] = useState<ContentOption[]>([]);
  const [accountList, setAccountList] = useState<AccountOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedContentId, setSelectedContentId] = useState(preselectedContentId ?? "");
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("scheduled");
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Default to 1 hour from now
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!workspace || !open) return;
    setLoadingData(true);
    try {
      const [contentRes, accountsRes] = await Promise.all([
        fetch(`/api/content?workspaceId=${workspace.id}&status=APPROVED`),
        fetch(`/api/social-accounts?workspaceId=${workspace.id}&status=ACTIVE`),
      ]);
      if (contentRes.ok) {
        const d = await contentRes.json();
        setContentList(d.pieces ?? []);
      }
      if (accountsRes.ok) {
        const d = await accountsRes.json();
        setAccountList(d.accounts ?? []);
      }
    } finally {
      setLoadingData(false);
    }
  }, [workspace, open]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (preselectedContentId) setSelectedContentId(preselectedContentId);
  }, [preselectedContentId]);

  // Filter accounts to match the selected content's platform
  const selectedContent = contentList.find((c) => c.id === selectedContentId);
  const compatibleAccounts = selectedContent
    ? accountList.filter((a) => a.platform === selectedContent.platform)
    : accountList;

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!workspace) return;
    if (!selectedContentId) { setError("Select a content piece."); return; }
    if (selectedAccountIds.size === 0) { setError("Select at least one account."); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/publish-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          contentPieceId: selectedContentId,
          socialAccountIds: Array.from(selectedAccountIds),
          scheduledAt: scheduleMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to schedule.");
        return;
      }

      onSuccess();
      onClose();
      // Reset
      setSelectedAccountIds(new Set());
      if (!preselectedContentId) setSelectedContentId("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule post"
      description="Choose content, accounts, and a publish time."
      size="md"
    >
      <div className="space-y-5">
        {/* Content selection */}
        <div>
          <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
            Content piece <span className="text-[--status-error]">*</span>
          </label>
          {loadingData ? (
            <div className="mt-1.5 h-10 rounded-[--radius-md] bg-[--bg-elevated] animate-pulse" />
          ) : contentList.length === 0 ? (
            <p className="mt-1.5 text-sm text-[--text-secondary] bg-[--bg-elevated] border border-[--border-subtle] rounded-[--radius-md] px-3.5 py-2.5">
              No approved content — approve a piece first.
            </p>
          ) : (
            <Select
              value={selectedContentId}
              onChange={(e) => {
                setSelectedContentId(e.target.value);
                setSelectedAccountIds(new Set());
              }}
              className="mt-1.5"
              placeholder="Select content…"
            >
              {contentList.map((c) => (
                <option key={c.id} value={c.id}>
                  [{PLATFORM_LABELS[c.platform]}]{" "}
                  {c.youtubeTitle ?? c.title ?? c.hook?.slice(0, 60) ?? "Untitled"}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Account selection (multi-select checkboxes) */}
        <div>
          <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
            Target accounts{" "}
            {selectedContent && (
              <span className="normal-case font-normal text-[--text-tertiary]">
                — {PLATFORM_LABELS[selectedContent.platform]} only
              </span>
            )}
            <span className="text-[--status-error]"> *</span>
          </label>

          {loadingData ? (
            <div className="mt-1.5 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-[--radius-md] bg-[--bg-elevated] animate-pulse" />
              ))}
            </div>
          ) : compatibleAccounts.length === 0 ? (
            <p className="mt-1.5 text-sm text-[--text-secondary] bg-[--bg-elevated] border border-[--border-subtle] rounded-[--radius-md] px-3.5 py-2.5">
              {selectedContent
                ? `No active ${PLATFORM_LABELS[selectedContent.platform]} accounts connected.`
                : "Select content to see compatible accounts."}
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5 max-h-52 overflow-y-auto rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-elevated] p-2">
              {compatibleAccounts.map((account) => {
                const checked = selectedAccountIds.has(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => toggleAccount(account.id)}
                    className="w-full flex items-center gap-3 rounded-[--radius-sm] px-3 py-2 hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
                  >
                    {checked ? (
                      <CheckSquare size={15} className="text-[--accent] shrink-0" />
                    ) : (
                      <Square size={15} className="text-[--text-tertiary] shrink-0" />
                    )}
                    <PlatformIcon platform={account.platform} size={14} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--text-primary] truncate">
                        @{account.username}
                      </p>
                      {account.displayName && (
                        <p className="text-xs text-[--text-tertiary] truncate">
                          {account.displayName}
                        </p>
                      )}
                    </div>
                    <PostStatusBadge status={account.status as "PENDING"} />
                  </button>
                );
              })}
            </div>
          )}

          {selectedAccountIds.size > 0 && (
            <p className="mt-1 text-xs text-[--text-tertiary]">
              {selectedAccountIds.size} account{selectedAccountIds.size !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        {/* Schedule mode */}
        <div>
          <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
            Publish time
          </label>
          <div className="mt-1.5 flex rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] p-1">
            <button
              type="button"
              onClick={() => setScheduleMode("scheduled")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[6px] py-2 text-sm font-medium transition-all duration-150 ${
                scheduleMode === "scheduled"
                  ? "bg-[--accent] text-white shadow-sm"
                  : "text-[--text-secondary] hover:text-[--text-primary]"
              }`}
            >
              <CalendarDays size={13} />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode("now")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[6px] py-2 text-sm font-medium transition-all duration-150 ${
                scheduleMode === "now"
                  ? "bg-[--accent] text-white shadow-sm"
                  : "text-[--text-secondary] hover:text-[--text-primary]"
              }`}
            >
              <Zap size={13} />
              Publish now
            </button>
          </div>

          {scheduleMode === "scheduled" && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-2 h-10 w-full rounded-[--radius-md] bg-[--bg-input] border border-[--border-subtle] px-3.5 text-sm text-[--text-primary] focus:outline-none focus:border-[--accent] transition-colors"
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-[--radius-md] bg-[--status-error-muted] border border-[--status-error]/20 px-3 py-2.5 text-sm text-[--status-error]">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button size="lg" loading={saving} onClick={handleSubmit} className="flex-1">
            {scheduleMode === "now" ? "Publish now" : "Schedule post"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
