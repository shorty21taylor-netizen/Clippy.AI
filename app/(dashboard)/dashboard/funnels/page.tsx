"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Search } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FunnelCard, type FunnelSummary } from "@/components/funnels/funnel-card";
import { useWorkspace } from "@/lib/workspace-context";

export default function FunnelsPage() {
  const { workspace } = useWorkspace();

  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchFunnels = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/funnels?workspaceId=${workspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setFunnels(data.funnels ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);

  const handleCreate = async () => {
    if (!workspace || !newTitle.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, title: newTitle.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setCreateError(d.error ?? "Failed to create funnel");
        return;
      }
      const data = await res.json();
      setCreateOpen(false);
      setNewTitle("");
      window.location.href = `/dashboard/funnels/${data.funnel.id}`;
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!workspace) return;
    await fetch(`/api/funnels/${id}?workspaceId=${workspace.id}`, { method: "DELETE" });
    setFunnels((f) => f.filter((x) => x.id !== id));
  };

  const handleTogglePublish = async (id: string, publish: boolean) => {
    if (!workspace) return;
    const res = await fetch(`/api/funnels/${id}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id, publish }),
    });
    if (res.ok) {
      const data = await res.json();
      setFunnels((prev) =>
        prev.map((f) => f.id === id ? { ...f, publishedAt: data.funnel.publishedAt } : f)
      );
    }
  };

  const filtered = funnels.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Funnels" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] w-full mx-auto p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
                Landing Funnels
              </h2>
              <p className="text-sm text-[--text-secondary]">
                {funnels.length} funnel{funnels.length !== 1 ? "s" : ""} total
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search funnels…"
                  className="h-9 rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] pl-8 pr-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--accent] transition-colors w-56"
                />
              </div>
              <Button size="md" onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                New Funnel
              </Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[--text-tertiary]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-[--text-primary] font-semibold text-lg">
                {search ? "No funnels found" : "No funnels yet"}
              </p>
              <p className="text-sm text-[--text-secondary] mt-1 max-w-sm">
                {search
                  ? "Try a different search term."
                  : "Create your first landing funnel to start capturing leads."}
              </p>
              {!search && (
                <Button className="mt-5" onClick={() => setCreateOpen(true)}>
                  <Plus size={14} />
                  Create funnel
                </Button>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((funnel) => (
                <FunnelCard
                  key={funnel.id}
                  funnel={funnel}
                  onDelete={handleDelete}
                  onTogglePublish={handleTogglePublish}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewTitle(""); setCreateError(""); }}
        title="Create funnel"
        description="Give your landing funnel a title to get started."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
              Funnel title
            </label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="My Landing Page"
              className="w-full rounded-[--radius-md] bg-[--bg-input] border border-[--border-subtle] px-3.5 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--accent] transition-colors"
            />
          </div>
          {createError && (
            <p className="text-sm text-[--status-error]">{createError}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => { setCreateOpen(false); setNewTitle(""); setCreateError(""); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="lg"
              loading={creating}
              onClick={handleCreate}
              className="flex-1"
              disabled={!newTitle.trim()}
            >
              Create & Edit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
