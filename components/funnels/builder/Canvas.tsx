"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Plus,
} from "lucide-react";
import { useBuilder } from "./context";
import { BlockRenderer } from "@/components/funnels/block-renderers";
import { BLOCK_LABELS } from "@/types/funnel";
import type { Block, BlockType } from "@/types/funnel";

// ─── Mini toolbar shown above a selected block ────────────────────────────────

function MiniToolbar({
  blockId,
  blockIndex,
  total,
}: {
  blockId: string;
  blockIndex: number;
  total: number;
}) {
  const { duplicateBlock, deleteBlock, moveBlock } = useBuilder();

  const btn = (
    icon: React.ReactNode,
    onClick: (e: React.MouseEvent) => void,
    label: string,
    danger = false
  ) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={label}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "26px",
        borderRadius: "5px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: danger ? "#ef4444" : "#a1a1aa",
        transition: "background 120ms, color 120ms",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = danger
          ? "rgba(239,68,68,0.12)"
          : "rgba(255,255,255,0.08)";
        el.style.color = danger ? "#ef4444" : "#fafafa";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "transparent";
        el.style.color = danger ? "#ef4444" : "#a1a1aa";
      }}
    >
      {icon}
    </button>
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "-40px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "4px 6px",
        background: "#27272a",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 30,
        animation: "builder-element-in 150ms ease-out",
        whiteSpace: "nowrap",
      }}
    >
      {btn(<ChevronUp size={14} />, () => moveBlock(blockId, "up"), "Move up", false)}
      {btn(<ChevronDown size={14} />, () => moveBlock(blockId, "down"), "Move down", false)}
      <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />
      {btn(<Copy size={13} />, () => duplicateBlock(blockId), "Duplicate (Ctrl+D)", false)}
      {btn(<Trash2 size={13} />, () => deleteBlock(blockId), "Delete", true)}
    </div>
  );
}

// ─── Individual sortable canvas block ────────────────────────────────────────

function SortableCanvasBlock({
  block,
  index,
  total,
  slug,
}: {
  block: Block;
  index: number;
  total: number;
  slug: string;
}) {
  const { selectedBlockId, selectBlock } = useBuilder();
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedBlockId === block.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    cursor: "default",
  };

  const overlayStyle: React.CSSProperties = isSelected
    ? {
        position: "absolute",
        inset: 0,
        outline: "2px solid #3b82f6",
        boxShadow: "0 0 0 2px #3b82f6, 0 0 20px rgba(59,130,246,0.18)",
        pointerEvents: "none",
        zIndex: 20,
        borderRadius: "2px",
        animation: "builder-glow-pulse 2s ease infinite",
      }
    : hovered
    ? {
        position: "absolute",
        inset: 0,
        outline: "1px dashed rgba(59,130,246,0.4)",
        pointerEvents: "none",
        zIndex: 20,
        borderRadius: "2px",
      }
    : {};

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    top: "4px",
    left: "4px",
    zIndex: 25,
    padding: "2px 7px",
    borderRadius: "5px",
    fontSize: "10px",
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.02em",
    background: isSelected ? "#3b82f6" : "rgba(59,130,246,0.7)",
    color: "#fff",
    pointerEvents: "none",
    opacity: isSelected || hovered ? 1 : 0,
    transition: "opacity 150ms",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectBlock(isSelected ? null : block.id)}
    >
      {/* Selection/hover overlay */}
      {(isSelected || hovered) && <div style={overlayStyle} />}

      {/* Type label */}
      <div style={labelStyle}>{BLOCK_LABELS[block.type]}</div>

      {/* Drag handle */}
      {(isSelected || hovered) && (
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "50%",
            left: "-28px",
            transform: "translateY(-50%)",
            zIndex: 25,
            width: "24px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "grab",
            color: "#71717a",
            borderRadius: "4px",
            transition: "color 150ms",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.color = "#3b82f6")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.color = "#71717a")
          }
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* Mini toolbar when selected */}
      {isSelected && (
        <MiniToolbar blockId={block.id} blockIndex={index} total={total} />
      )}

      {/* Block content — rendered with light theme via data-canvas-content on parent */}
      <BlockRenderer block={block} slug={slug} />
    </div>
  );
}

// ─── Add block button between blocks ─────────────────────────────────────────

function AddBlockDivider({ afterId }: { afterId?: string }) {
  const { addBlock } = useBuilder();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const quickTypes: BlockType[] = ["hero", "text", "form", "features", "testimonial", "cta"];

  return (
    <div
      style={{ position: "relative", height: "24px", display: "flex", alignItems: "center" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); if (!menuOpen) setMenuOpen(false); }}
    >
      {/* Line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "1px",
          background: hovered ? "rgba(59,130,246,0.4)" : "transparent",
          transition: "background 200ms",
        }}
      />

      {/* + button */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "#3b82f6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            boxShadow: "0 0 0 4px #0c0c0e",
            zIndex: 30,
          }}
        >
          <Plus size={13} />
        </button>
      )}

      {/* Quick-add menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#27272a",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "10px",
            padding: "6px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "4px",
            minWidth: "180px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {quickTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                addBlock(type, afterId);
                setMenuOpen(false);
                setHovered(false);
              }}
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#a1a1aa",
                fontSize: "11px",
                fontFamily: "'Inter', sans-serif",
                transition: "background 120ms, color 120ms",
                textAlign: "center",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "rgba(255,255,255,0.06)";
                el.style.color = "#fafafa";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "transparent";
                el.style.color = "#a1a1aa";
              }}
            >
              {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyCanvas() {
  const { addBlock } = useBuilder();

  const quickStart: BlockType[] = ["hero", "form", "features"];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 40px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          fontSize: "28px",
        }}
      >
        ✦
      </div>
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#fafafa",
          margin: 0,
          marginBottom: "8px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Start building your page
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "#71717a",
          maxWidth: "300px",
          lineHeight: 1.6,
          margin: 0,
          marginBottom: "32px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Click elements from the left panel, or start with a template section below.
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {quickStart.map((type) => (
          <button
            key={type}
            onClick={() => addBlock(type)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "#a1a1aa",
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(59,130,246,0.1)";
              el.style.borderColor = "rgba(59,130,246,0.3)";
              el.style.color = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(255,255,255,0.04)";
              el.style.borderColor = "rgba(255,255,255,0.10)";
              el.style.color = "#a1a1aa";
            }}
          >
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────

const DEVICE_WIDTHS: Record<string, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const DEVICE_MAX_WIDTHS: Record<string, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export function Canvas({ slug }: { slug: string }) {
  const {
    blocks,
    deviceMode,
    selectBlock,
    selectedBlockId,
    reorderBlocks,
  } = useBuilder();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const fromIndex = blocks.findIndex((b) => b.id === active.id);
        const toIndex = blocks.findIndex((b) => b.id === over.id);
        if (fromIndex !== -1 && toIndex !== -1) {
          reorderBlocks(fromIndex, toIndex);
        }
      }
    },
    [blocks, reorderBlocks]
  );

  const isTablet = deviceMode === "tablet";
  const isMobile = deviceMode === "mobile";
  const isNarrow = isTablet || isMobile;

  return (
    <main
      onClick={() => {
        if (selectedBlockId) selectBlock(null);
      }}
      style={{
        flex: 1,
        overflow: "auto",
        background: "#0c0c0e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isNarrow ? "32px 24px" : "32px 40px",
        position: "relative",
      }}
    >
      {/* Device frame wrapper */}
      <div
        style={{
          width: DEVICE_WIDTHS[deviceMode],
          maxWidth: DEVICE_MAX_WIDTHS[deviceMode],
          transition: "width 300ms ease, max-width 300ms ease",
          boxShadow: isNarrow
            ? "0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6)"
            : "0 20px 60px rgba(0,0,0,0.4)",
          borderRadius: isNarrow ? "12px" : "4px",
          overflow: "hidden",
          flexShrink: 0,
          minHeight: "600px",
          position: "relative",
        }}
      >
        {/* Page content — light theme reset for live preview */}
        <div
          data-canvas-content
          style={{
            background: "#ffffff",
            color: "#09090b",
            minHeight: "600px",
            paddingLeft: "32px", // room for drag handles
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {blocks.length === 0 ? (
            <div style={{ background: "#0c0c0e" }}>
              <EmptyCanvas />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    <SortableCanvasBlock
                      block={block}
                      index={index}
                      total={blocks.length}
                      slug={slug}
                    />
                    <AddBlockDivider afterId={block.id} />
                  </React.Fragment>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Device label */}
      {isNarrow && (
        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: "#52525b",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          {deviceMode === "tablet" ? "768px — Tablet" : "375px — Mobile"}
        </div>
      )}
    </main>
  );
}
