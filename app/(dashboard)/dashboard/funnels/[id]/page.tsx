"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Globe, EyeOff, ExternalLink, Users, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { BlockPalette } from "@/components/funnels/block-palette";
import { BlockEditor } from "@/components/funnels/block-editor";
import { useWorkspace } from "@/lib/workspace-context";
import { BLOCK_DEFAULTS, newBlockId, type Block, type BlockType } from "@/types/funnel";
import { cn } from "@/lib/utils";

interface FunnelDetail {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  blocks: Block[];
  _count: { leads: number };
}

export default function FunnelBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { workspace } = useWorkspace();

  const [funnel, setFunnel] = useState<FunnelDetail | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  // Auto-save debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFunnel = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/funnels/${id}?workspaceId=${workspace.id}`);
      if (!res.ok) { setError("Funnel not found"); return; }
      const data = await res.json();
      setFunnel(data.funnel);
      setBlocks(data.funnel.blocks ?? []);
    } finally {
      setLoading(false);
    }
  }, [workspace, id]);

  useEffect(() => { fetchFunnel(); }, [fetchFunnel]);

  const saveBlocks = useCallback(async (newBlocks: Block[]) => {
    if (!workspace || !funnel) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/funnels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, blocks: newBlocks }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [workspace, funnel, id]);

  // Debounced auto-save on block changes
  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveBlocks(newBlocks), 800);
  };

  const addBlock = (type: BlockType) => {
    const block: Block = {
      id: newBlockId(),
      type,
      data: { ...BLOCK_DEFAULTS[type] },
    };
    updateBlocks([...blocks, block]);
  };

  const changeBlock = (blockId: string, data: Record<string, unknown>) => {
    updateBlocks(blocks.map((b) => b.id === blockId ? { ...b, data } : b));
  };

  const moveUp = (blockId: string) => {
    const i = blocks.findIndex((b) => b.id === blockId);
    if (i <= 0) return;
    const next = [...blocks];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    updateBlocks(next);
  };

  const moveDown = (blockId: string) => {
    const i = blocks.findIndex((b) => b.id === blockId);
    if (i >= blocks.length - 1) return;
    const next = [...blocks];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    updateBlocks(next);
  };

  const deleteBlock = (blockId: string) => {
    updateBlocks(blocks.filter((b) => b.id !== blockId));
  };

  const togglePublish = async () => {
    if (!workspace || !funnel) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/funnels/${id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, publish: !funnel.publishedAt }),
      });
      if (res.ok) {
        const data = await res.json();
        setFunnel((f) => f ? { ...f, publishedAt: data.funnel.publishedAt } : f);
      }
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Funnel Builder" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[--text-tertiary]" />
        </div>
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Funnel Builder" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-[--status-error]">{error || "Funnel not found"}</p>
          <Link href="/dashboard/funnels">
            <Button variant="secondary">Back to Funnels</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPublished = Boolean(funnel.publishedAt);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle] bg-[--bg-card] shrink-0">
        <Link href="/dashboard/funnels" className="flex items-center gap-1.5 text-[--text-secondary] hover:text-[--text-primary] transition-colors text-sm">
          <ArrowLeft size={14} />
          Funnels
        </Link>
        <span className="text-[--border-subtle]">/</span>
        <span className="text-sm font-semibold text-[--text-primary] truncate max-w-[200px]">{funnel.title}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Save status */}
          <span className={cn(
            "text-xs transition-opacity duration-300",
            saving ? "text-[--accent] opacity-100" : saved ? "text-[--status-success] opacity-100" : "opacity-0"
          )}>
            {saving ? "Saving…" : "Saved"}
          </span>

          {/* Leads link */}
          <Link href={`/dashboard/funnels/${id}/leads`}>
            <Button variant="secondary" size="sm">
              <Users size={13} />
              {funnel._count.leads} leads
            </Button>
          </Link>

          {/* Preview */}
          <Link href={`/f/${funnel.slug}`} target="_blank">
            <Button variant="secondary" size="sm">
              <ExternalLink size={13} />
              Preview
            </Button>
          </Link>

          {/* Publish toggle */}
          <Button
            size="sm"
            variant={isPublished ? "secondary" : "primary"}
            loading={toggling}
            onClick={togglePublish}
          >
            {isPublished ? <EyeOff size={13} /> : <Globe size={13} />}
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Builder layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: block palette */}
        <aside className="w-52 shrink-0 border-r border-[--border-subtle] bg-[--bg-card] overflow-y-auto p-3">
          <BlockPalette onAdd={addBlock} />
        </aside>

        {/* Center: block list */}
        <main className="flex-1 overflow-y-auto bg-[--bg-surface] p-5">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <div className="text-5xl mb-4">🧱</div>
              <p className="text-[--text-primary] font-semibold">No blocks yet</p>
              <p className="text-sm text-[--text-secondary] mt-1">
                Click a block type in the left panel to add it.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              <AnimatePresence initial={false}>
                {blocks.map((block, i) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <BlockEditor
                      block={block}
                      index={i}
                      total={blocks.length}
                      onChange={changeBlock}
                      onMoveUp={moveUp}
                      onMoveDown={moveDown}
                      onDelete={deleteBlock}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
