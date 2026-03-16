"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  DollarSign,
  Users,
  AlertTriangle,
  Check,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { useRouter } from "next/navigation";

// ─── Slug helper (mirrors lib/workspace.ts) ───────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
            <p className="text-[12px] text-[var(--text-tertiary)]">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-[var(--border-subtle)] last:border-0">
      <div className="shrink-0 w-48">
        <p className="text-[13px] font-medium text-[var(--text-primary)]">{label}</p>
        {hint && <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-[10px] px-4 py-3 shadow-lg text-[13px] font-medium ${
        type === "success"
          ? "bg-[var(--status-success)] text-white"
          : "bg-[var(--status-error)] text-white"
      }`}
    >
      {type === "success" ? <Check size={14} /> : <X size={14} />}
      {message}
    </div>
  );
}

// ─── General Settings ─────────────────────────────────────────────────────────

function GeneralSettings({ workspaceId }: { workspaceId: string }) {
  const { workspace, refresh } = useWorkspace();
  const [name, setName] = useState(workspace?.name ?? "");
  const [slug, setSlug] = useState(workspace?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setSlug(workspace.slug);
    }
  }, [workspace]);

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugEdited && name !== workspace?.name) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited, workspace?.name]);

  // Slug check — skip if unchanged from saved value
  useEffect(() => {
    if (slug === workspace?.slug) {
      setSlugAvailable(true);
      setSlugError("");
      return;
    }
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      setSlugError(slug.length > 0 ? "Slug too short" : "");
      return;
    }
    if (slug.length > 48) {
      setSlugAvailable(false);
      setSlugError("Slug too long (max 48 chars)");
      return;
    }
    setSlugChecking(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/workspaces/check-slug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json();
        setSlugAvailable(data.available);
        setSlugError(data.available ? "" : "This slug is already taken");
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug, workspace?.slug]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) return;
    if (slugAvailable === false) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error ?? "Failed to save", "error");
        return;
      }
      showToast("Settings saved", "success");
      setSlugEdited(false);
      refresh();
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const changed = name !== workspace?.name || slug !== workspace?.slug;
  const canSave = changed && name.trim().length >= 2 && (slugAvailable === true || slug === workspace?.slug) && !slugChecking;

  return (
    <>
      <Field label="Workspace Name" hint="Visible to all members">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-input)] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </Field>

      <Field label="URL Slug" hint="Used in workspace URLs">
        <div className="relative">
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value) || e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            maxLength={48}
            className={`w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-input)] px-3.5 pr-8 text-[14px] text-[var(--text-primary)] border focus:outline-none transition-colors ${
              slugError
                ? "border-[var(--status-error)] focus:border-[var(--status-error)]"
                : slugAvailable === true
                  ? "border-[var(--status-success)]"
                  : "border-[var(--border-subtle)] focus:border-[var(--accent)]"
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {slugChecking && <Loader2 size={13} className="animate-spin text-[var(--text-tertiary)]" />}
            {!slugChecking && slugAvailable === true && <Check size={13} className="text-[var(--status-success)]" />}
            {!slugChecking && slugAvailable === false && <X size={13} className="text-[var(--status-error)]" />}
          </div>
        </div>
        {slugError && (
          <p className="text-[11px] text-[var(--status-error)] mt-1">{slugError}</p>
        )}
      </Field>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="h-9 px-4 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save Changes
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}

// ─── Revenue Settings ─────────────────────────────────────────────────────────

function RevenueSettings({ workspaceId }: { workspaceId: string }) {
  const [challengePrice, setChallengePrice] = useState(197);
  const [coachingPrice, setCoachingPrice] = useState(6000);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d.workspace) {
          setChallengePrice(d.workspace.challengeTicketPrice ?? 197);
          setCoachingPrice(d.workspace.coachingProgramPrice ?? 6000);
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeTicketPrice: challengePrice,
          coachingProgramPrice: coachingPrice,
        }),
      });
      if (!res.ok) {
        showToast("Failed to save", "error");
        return;
      }
      showToast("Prices updated", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Field label="Challenge Ticket Price" hint="Used in revenue analytics">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[14px]">$</span>
          <input
            type="number"
            min={0}
            value={challengePrice}
            onChange={(e) => setChallengePrice(Number(e.target.value))}
            className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-input)] pl-7 pr-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </Field>

      <Field label="Coaching Program Price" hint="Used in revenue analytics">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[14px]">$</span>
          <input
            type="number"
            min={0}
            value={coachingPrice}
            onChange={(e) => setCoachingPrice(Number(e.target.value))}
            className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-input)] pl-7 pr-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </Field>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-4 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-[13px] font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save Prices
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}

// ─── Members section ──────────────────────────────────────────────────────────

function MembersSection({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<
    Array<{ id: string; role: string; user: { name: string | null; email: string; avatarUrl: string | null } }>
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const ROLE_COLOR: Record<string, string> = {
    OWNER: "bg-[rgba(0,113,227,0.1)] text-[var(--accent)]",
    ADMIN: "bg-[rgba(245,158,11,0.1)] text-amber-500",
    MEMBER: "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]",
  };

  if (loading) {
    return <p className="text-[13px] text-[var(--text-tertiary)]">Loading members…</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between py-2.5 border-b border-[var(--border-subtle)] last:border-0"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
              <span className="text-[var(--accent)] text-[11px] font-bold uppercase">
                {(m.user.name ?? m.user.email)[0]}
              </span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                {m.user.name ?? m.user.email}
              </p>
              {m.user.name && (
                <p className="text-[11px] text-[var(--text-tertiary)]">{m.user.email}</p>
              )}
            </div>
          </div>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-0.5 ${ROLE_COLOR[m.role] ?? ROLE_COLOR.MEMBER}`}
          >
            {m.role.toLowerCase()}
          </span>
        </div>
      ))}
      <p className="text-[12px] text-[var(--text-tertiary)] pt-2">
        To invite members, ask them to sign up and share this workspace ID:{" "}
        <code className="font-mono text-[var(--text-secondary)]">{workspaceId}</code>
      </p>
    </div>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

function DangerZone({ workspaceId }: { workspaceId: string }) {
  const { workspace, refresh } = useWorkspace();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== workspace?.name) {
      setError("Name doesn't match");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: workspace?.name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete");
        return;
      }
      refresh();
      router.push("/dashboard");
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 p-4 rounded-[10px] border border-[var(--status-error,#ff3b30)] bg-[rgba(255,59,48,0.04)]">
        <div>
          <p className="text-[13px] font-semibold text-[var(--status-error,#ff3b30)]">
            Delete Workspace
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
            Permanently deletes all social accounts, clips, funnels, leads, and analytics. This cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="shrink-0 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--status-error,#ff3b30)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      {showConfirm && (
        <div className="p-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-elevated)] space-y-3">
          <p className="text-[13px] text-[var(--text-primary)]">
            Type <strong>{workspace?.name}</strong> to confirm deletion:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError("");
            }}
            placeholder={workspace?.name}
            className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-input)] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--status-error,#ff3b30)] transition-colors"
          />
          {error && <p className="text-[12px] text-[var(--status-error,#ff3b30)]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setError("");
              }}
              className="flex-1 h-9 rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(0,0,0,0.04)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || confirmText !== workspace?.name}
              className="flex-1 h-9 rounded-[var(--radius-md)] bg-[var(--status-error,#ff3b30)] text-white text-[13px] font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {deleting && <Loader2 size={13} className="animate-spin" />}
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspaceSettingsPage() {
  const { workspace, isLoading } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !workspace) {
      router.push("/onboarding");
    }
  }, [isLoading, workspace, router]);

  if (isLoading || !workspace) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={24} className="animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
          Workspace Settings
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
          Manage your workspace — <span className="text-[var(--text-secondary)]">{workspace.name}</span>
        </p>
      </div>

      <Section
        icon={<Building2 size={18} className="text-[var(--accent)]" />}
        title="General"
        description="Workspace name and URL slug"
      >
        <GeneralSettings workspaceId={workspace.id} />
      </Section>

      <Section
        icon={<DollarSign size={18} className="text-[var(--accent)]" />}
        title="Revenue Settings"
        description="Deal values used in analytics calculations"
      >
        <RevenueSettings workspaceId={workspace.id} />
      </Section>

      <Section
        icon={<Users size={18} className="text-[var(--accent)]" />}
        title="Members"
        description="People who have access to this workspace"
      >
        <MembersSection workspaceId={workspace.id} />
      </Section>

      <Section
        icon={<AlertTriangle size={18} className="text-[var(--status-error,#ff3b30)]" />}
        title="Danger Zone"
        description="Irreversible actions — proceed with caution"
      >
        <DangerZone workspaceId={workspace.id} />
      </Section>
    </div>
  );
}
