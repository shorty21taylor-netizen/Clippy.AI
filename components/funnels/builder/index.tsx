"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { BuilderProvider, useBuilder } from "./context";
import { ToastProvider, useToast } from "./Toast";
import { TopBar } from "./TopBar";
import { LeftPanel } from "./LeftPanel";
import { Canvas } from "./Canvas";
import { RightPanel } from "./RightPanel";
import type { Block } from "@/types/funnel";

// ─── Funnel data shape (passed from server) ───────────────────────────────────

export interface FunnelData {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  blocks: Block[];
  leadsCount: number;
  workspaceId: string;
}

// ─── Inner component with access to builder context ───────────────────────────

function BuilderInner({ funnel }: { funnel: FunnelData }) {
  const { blocks, isDirty, markSaved } = useBuilder();
  const { addToast } = useToast();

  const [publishedAt, setPublishedAt] = useState<string | null>(
    funnel.publishedAt
  );
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "idle"
  >("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save: 2s debounce after changes
  const save = useCallback(
    async (blocksToSave: Block[]) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/funnels/${funnel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: funnel.workspaceId,
            blocks: blocksToSave,
          }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          markSaved();
          setTimeout(() => setSaveStatus("idle"), 2500);
        } else {
          setSaveStatus("unsaved");
          addToast({ type: "error", message: "Save failed — check your connection" });
        }
      } catch {
        setSaveStatus("unsaved");
        addToast({ type: "error", message: "Save failed — retrying…" });
      }
    },
    [funnel.id, funnel.workspaceId, markSaved, addToast]
  );

  useEffect(() => {
    if (!isDirty) return;
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(blocks), 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [blocks, isDirty, save]);

  // Manual save via Cmd+S
  const manualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    save(blocks);
  }, [blocks, save]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "s") {
        e.preventDefault();
        manualSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [manualSave]);

  const handlePublish = async (publish: boolean) => {
    const res = await fetch(`/api/funnels/${funnel.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: funnel.workspaceId }),
    });
    if (res.ok) {
      const data = await res.json();
      setPublishedAt(data.funnel.publishedAt ?? null);
      if (publish) {
        addToast({
          type: "success",
          message: "Page published! 🚀",
          action: {
            label: "View live →",
            href: `/f/${funnel.slug}`,
          },
        });
      } else {
        addToast({ type: "info", message: "Page unpublished" });
      }
    } else {
      addToast({ type: "error", message: "Publish failed. Please try again." });
    }
  };

  return (
    // Fixed full-screen overlay — covers the dashboard sidebar
    <div
      data-builder
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#09090b",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#fafafa",
      }}
    >
      <TopBar
        funnel={funnel}
        publishedAt={publishedAt}
        saveStatus={saveStatus}
        onPublish={handlePublish}
        onManualSave={manualSave}
      />
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <LeftPanel />
        <Canvas slug={funnel.slug} />
        <RightPanel />
      </div>
    </div>
  );
}

// ─── Public export — wrap with providers ─────────────────────────────────────

export function FunnelBuilder({ funnel }: { funnel: FunnelData }) {
  return (
    <ToastProvider>
      <BuilderProvider initialBlocks={funnel.blocks}>
        <BuilderInner funnel={funnel} />
      </BuilderProvider>
    </ToastProvider>
  );
}
