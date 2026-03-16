"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Plus,
  Building2,
  Loader2,
  Settings,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

// ─── Slug helpers (client-side, mirrors lib/workspace.ts) ────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-[--accent]",
  ADMIN: "text-[--status-warning]",
  MEMBER: "text-[--text-tertiary]",
};

// ─── Create Workspace Modal ───────────────────────────────────────────────────

function CreateWorkspaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ws: { id: string; name: string; slug: string; role: string }) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      setSlugError(slug.length > 0 ? "Slug too short (min 2 chars)" : "");
      return;
    }
    if (slug.length > 48) {
      setSlugAvailable(false);
      setSlugError("Slug too long (max 48 chars)");
      return;
    }

    setSlugChecking(true);
    setSlugAvailable(null);
    setSlugError("");

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
        if (!data.available) setSlugError("This slug is already taken");
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug]);

  const handleSlugChange = (val: string) => {
    setSlugEdited(true);
    setSlug(slugify(val) || val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const canSubmit =
    name.trim().length >= 2 &&
    slug.length >= 2 &&
    slugAvailable === true &&
    !slugChecking &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create workspace");
        return;
      }
      const data = await res.json();
      onCreated({ ...data.workspace, role: "OWNER" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[0_24px_64px_rgba(0,0,0,0.5)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[10px] bg-[var(--accent-muted)] flex items-center justify-center">
              <Building2 size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">
                Create Workspace
              </h2>
              <p className="text-[12px] text-[var(--text-tertiary)]">
                A separate space for each brand or client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center hover:bg-[rgba(0,0,0,0.06)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Influence2Impact"
              maxLength={64}
              autoFocus
              className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-input)] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--border-subtle)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              URL Slug
            </label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="influence2impact"
                maxLength={48}
                className={cn(
                  "w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-input)] px-3.5 pr-8 text-[14px] text-[var(--text-primary)] border placeholder:text-[var(--text-placeholder)] focus:outline-none transition-colors",
                  slugError
                    ? "border-[var(--status-error)] focus:border-[var(--status-error)]"
                    : slugAvailable === true
                      ? "border-[var(--status-success)] focus:border-[var(--status-success)]"
                      : "border-[var(--border-subtle)] focus:border-[var(--accent)]"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {slugChecking && (
                  <Loader2 size={13} className="animate-spin text-[var(--text-tertiary)]" />
                )}
                {!slugChecking && slugAvailable === true && (
                  <Check size={13} className="text-[var(--status-success)]" />
                )}
                {!slugChecking && slugAvailable === false && (
                  <X size={13} className="text-[var(--status-error)]" />
                )}
              </div>
            </div>
            {slugError ? (
              <p className="text-[11px] text-[var(--status-error)]">{slugError}</p>
            ) : slug ? (
              <p className="text-[11px] text-[var(--text-tertiary)]">
                clippyai.com/<span className="text-[var(--text-secondary)]">{slug}</span>
              </p>
            ) : null}
          </div>

          {error && (
            <p className="text-[12px] text-[var(--status-error)] bg-[var(--status-error-muted,rgba(255,59,48,0.08))] rounded-[6px] px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[rgba(0,0,0,0.04)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workspace"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── WorkspaceSwitcher ────────────────────────────────────────────────────────

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { workspace: active, workspaces, setActiveWorkspace, refresh } = useWorkspace();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const switchTo = (ws: { id: string; name: string; slug: string; role: string }) => {
    setActiveWorkspace(ws);
    setOpen(false);
    router.refresh();
  };

  const handleCreated = (ws: { id: string; name: string; slug: string; role: string }) => {
    setShowCreateModal(false);
    refresh();
    setActiveWorkspace(ws);
    router.refresh();
  };

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <div className="h-8 w-8 rounded-[8px] bg-[rgba(0,0,0,0.05)] border border-[var(--border-subtle)] flex items-center justify-center">
          {active ? (
            <span className="text-[var(--accent)] text-[11px] font-bold uppercase">
              {active.name[0]}
            </span>
          ) : (
            <Building2 size={14} className="text-[var(--text-secondary)]" />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2",
            "bg-[rgba(0,0,0,0.04)] border border-[var(--border-subtle)]",
            "hover:border-[var(--border-default)] hover:bg-[rgba(0,0,0,0.06)] transition-all duration-150",
            "text-left"
          )}
        >
          <div className="h-6 w-6 rounded-[6px] bg-[var(--accent-muted)] border border-[rgba(0,113,227,0.20)] flex items-center justify-center shrink-0">
            <span className="text-[var(--accent)] text-[10px] font-bold uppercase">
              {active?.name?.[0] ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              {active?.name ?? "Select workspace"}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] truncate capitalize">
              {active?.role?.toLowerCase() ?? ""}
            </p>
          </div>
          <ChevronDown
            size={14}
            className={cn(
              "text-[var(--text-tertiary)] shrink-0 transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-full left-0 right-0 mt-1 z-50 rounded-[var(--radius-lg)] bg-[var(--bg-modal)] border border-[var(--border-subtle)] shadow-[var(--shadow-dropdown)] overflow-hidden"
            >
              {/* Workspace list */}
              <div className="p-1 max-h-[280px] overflow-y-auto">
                {workspaces.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                    No workspaces yet
                  </p>
                )}
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => switchTo(ws)}
                    className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 hover:bg-[rgba(0,0,0,0.04)] transition-colors duration-100 text-left"
                  >
                    <div className="h-6 w-6 rounded-[6px] bg-[var(--accent-muted)] border border-[rgba(0,113,227,0.20)] flex items-center justify-center shrink-0">
                      <span className="text-[var(--accent)] text-[10px] font-bold uppercase">
                        {ws.name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {ws.name}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] truncate capitalize font-medium",
                          ROLE_COLORS[ws.role] ?? "text-[var(--text-tertiary)]"
                        )}
                      >
                        {ws.role.toLowerCase()}
                      </p>
                    </div>
                    {active?.id === ws.id && (
                      <Check size={13} className="text-[var(--accent)] shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-[var(--border-subtle)] p-1">
                {/* Settings */}
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/dashboard/settings");
                  }}
                  className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 hover:bg-[rgba(0,0,0,0.04)] transition-colors duration-100 text-left"
                >
                  <div className="h-6 w-6 rounded-[6px] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    <Settings size={12} className="text-[var(--text-tertiary)]" />
                  </div>
                  <span className="text-[13px] text-[var(--text-secondary)]">
                    Workspace Settings
                  </span>
                </button>

                {/* Create new */}
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 hover:bg-[rgba(0,0,0,0.04)] transition-colors duration-100 text-left"
                >
                  <div className="h-6 w-6 rounded-[6px] border border-dashed border-[var(--border-default)] flex items-center justify-center shrink-0">
                    <Plus size={12} className="text-[var(--text-tertiary)]" />
                  </div>
                  <span className="text-[13px] text-[var(--text-secondary)]">
                    New workspace
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkspaceModal
            onClose={() => setShowCreateModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </>
  );
}
