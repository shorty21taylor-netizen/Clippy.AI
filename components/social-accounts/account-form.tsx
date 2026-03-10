"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/ui/tag-input";
import { useWorkspace } from "@/lib/workspace-context";
import { AlertCircle, ShieldCheck } from "lucide-react";

export interface AccountFormData {
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  username: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  status: "ACTIVE" | "PENDING" | "BANNED" | "DISCONNECTED";
  tags: string[];
  proxyConfig: string;
}

const DEFAULT_FORM: AccountFormData = {
  platform: "INSTAGRAM",
  username: "",
  displayName: "",
  accessToken: "",
  refreshToken: "",
  status: "PENDING",
  tags: [],
  proxyConfig: "",
};

interface AccountFormProps {
  initialData?: Partial<AccountFormData>;
  accountId?: string; // present when editing
  onSuccess: () => void;
  onCancel: () => void;
}

export function AccountForm({
  initialData,
  accountId,
  onSuccess,
  onCancel,
}: AccountFormProps) {
  const { workspace } = useWorkspace();
  const [form, setForm] = useState<AccountFormData>({
    ...DEFAULT_FORM,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(accountId);

  const set = <K extends keyof AccountFormData>(key: K, val: AccountFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = isEdit
        ? `/api/social-accounts/${accountId}`
        : "/api/social-accounts";

      const payload = isEdit
        ? { workspaceId: workspace.id, ...form }
        : { workspaceId: workspace.id, ...form };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Platform + Status row */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Platform"
          value={form.platform}
          onChange={(e) =>
            set("platform", e.target.value as AccountFormData["platform"])
          }
          disabled={isEdit}
        >
          <option value="INSTAGRAM">Instagram</option>
          <option value="TIKTOK">TikTok</option>
          <option value="YOUTUBE">YouTube</option>
        </Select>

        <Select
          label="Status"
          value={form.status}
          onChange={(e) =>
            set("status", e.target.value as AccountFormData["status"])
          }
        >
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="BANNED">Banned</option>
          <option value="DISCONNECTED">Disconnected</option>
        </Select>
      </div>

      {/* Username + Display name */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Username"
          placeholder="@handle"
          value={form.username}
          onChange={(e) => set("username", e.target.value)}
          required
        />
        <Input
          label="Display name"
          placeholder="Optional"
          value={form.displayName}
          onChange={(e) => set("displayName", e.target.value)}
        />
      </div>

      {/* Token section */}
      <div className="rounded-[--radius-md] bg-[--bg-base] border border-[--border-subtle] p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-[--text-secondary] mb-1">
          <ShieldCheck size={13} className="text-[--status-success]" />
          <span>Tokens are AES-256 encrypted before being stored.</span>
        </div>

        <Input
          label="Access token"
          placeholder={isEdit ? "Leave blank to keep existing" : "Optional"}
          value={form.accessToken}
          onChange={(e) => set("accessToken", e.target.value)}
          type="password"
        />
        <Input
          label="Refresh token"
          placeholder={isEdit ? "Leave blank to keep existing" : "Optional"}
          value={form.refreshToken}
          onChange={(e) => set("refreshToken", e.target.value)}
          type="password"
        />
      </div>

      {/* Tags */}
      <TagInput
        label="Tags / Groups"
        value={form.tags}
        onChange={(tags) => set("tags", tags)}
        placeholder="niche-a, campaign-1, tier-1…"
      />

      {/* Proxy config */}
      <Input
        label="Proxy config (optional)"
        placeholder="http://user:pass@host:port"
        value={form.proxyConfig}
        onChange={(e) => set("proxyConfig", e.target.value)}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-[--radius-md] bg-[--status-error-muted] border border-[--status-error]/20 px-3 py-2.5 text-sm text-[--status-error]">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={loading} className="flex-1">
          {isEdit ? "Save changes" : "Add account"}
        </Button>
      </div>
    </form>
  );
}
