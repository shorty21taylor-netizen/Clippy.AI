"use client";

import React, { useState, useRef } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useBuilder } from "./context";
import { BLOCK_ICONS, BLOCK_LABELS } from "@/types/funnel";
import type { Block } from "@/types/funnel";

// ─── Layer row ────────────────────────────────────────────────────────────────

interface LayerRowProps {
  block: Block;
  index: number;
  total: number;
  isSelected: boolean;
}

function LayerRow({ block, index, total, isSelected }: LayerRowProps) {
  const {
    selectBlock,
    updateBlockName,
    toggleBlockHidden,
    toggleBlockLocked,
    deleteBlock,
    duplicateBlock,
    moveBlock,
  } = useBuilder();

  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [nameVal, setNameVal] = useState(block.name ?? BLOCK_LABELS[block.type]);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = nameVal.trim();
    const final = trimmed || BLOCK_LABELS[block.type];
    setNameVal(final);
    updateBlockName(block.id, final === BLOCK_LABELS[block.type] ? "" : final);
    setEditing(false);
  };

  const displayName = block.name?.trim() || BLOCK_LABELS[block.type];
  const isHidden = !!block.hidden;
  const isLocked = !!block.locked;

  return (
    <div
      onClick={() => selectBlock(block.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 8px 5px 4px",
        borderRadius: "6px",
        background: isSelected
          ? "rgba(59,130,246,0.12)"
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "transparent",
        border: `1px solid ${isSelected ? "rgba(59,130,246,0.25)" : "transparent"}`,
        cursor: "pointer",
        marginBottom: "2px",
        transition: "background 100ms, border-color 100ms",
        opacity: isHidden ? 0.45 : 1,
      }}
    >
      {/* Drag handle */}
      <GripVertical
        size={12}
        style={{ color: "#3f3f46", flexShrink: 0, cursor: "grab" }}
      />

      {/* Block icon */}
      <span style={{ fontSize: "13px", flexShrink: 0, lineHeight: 1 }}>
        {BLOCK_ICONS[block.type]}
      </span>

      {/* Name (editable) */}
      {editing ? (
        <input
          ref={inputRef}
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") { setNameVal(displayName); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            background: "#27272a",
            border: "1px solid rgba(59,130,246,0.5)",
            borderRadius: "4px",
            padding: "1px 5px",
            color: "#fafafa",
            fontSize: "12px",
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            minWidth: 0,
          }}
        />
      ) : (
        <span
          onDoubleClick={startEdit}
          title="Double-click to rename"
          style={{
            flex: 1,
            fontSize: "12px",
            color: isSelected ? "#93c5fd" : "#a1a1aa",
            fontFamily: "'Inter', sans-serif",
            fontWeight: isSelected ? 500 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {displayName}
        </span>
      )}

      {/* Action icons — visible on hover or selected */}
      {(hovered || isSelected) && !editing && (
        <div
          style={{ display: "flex", gap: "2px", flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Move up */}
          <ActionBtn
            title="Move up"
            disabled={index === 0}
            onClick={() => moveBlock(block.id, "up")}
          >
            <ChevronUp size={11} />
          </ActionBtn>
          {/* Move down */}
          <ActionBtn
            title="Move down"
            disabled={index === total - 1}
            onClick={() => moveBlock(block.id, "down")}
          >
            <ChevronDown size={11} />
          </ActionBtn>
          {/* Hide/show */}
          <ActionBtn
            title={isHidden ? "Show" : "Hide"}
            onClick={() => toggleBlockHidden(block.id)}
          >
            {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </ActionBtn>
          {/* Lock/unlock */}
          <ActionBtn
            title={isLocked ? "Unlock" : "Lock"}
            onClick={() => toggleBlockLocked(block.id)}
          >
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
          </ActionBtn>
          {/* Duplicate */}
          <ActionBtn title="Duplicate" onClick={() => duplicateBlock(block.id)}>
            <Copy size={11} />
          </ActionBtn>
          {/* Delete */}
          <ActionBtn
            title="Delete"
            danger
            onClick={() => deleteBlock(block.id)}
          >
            <Trash2 size={11} />
          </ActionBtn>
        </div>
      )}

      {/* Persistent lock icon */}
      {isLocked && !(hovered || isSelected) && (
        <Lock size={10} style={{ color: "#52525b", flexShrink: 0 }} />
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? danger
            ? "rgba(239,68,68,0.15)"
            : "rgba(255,255,255,0.08)"
          : "none",
        border: "none",
        borderRadius: "4px",
        padding: "3px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled
          ? "#3f3f46"
          : hov
          ? danger
            ? "#f87171"
            : "#a1a1aa"
          : "#52525b",
        display: "flex",
        alignItems: "center",
        transition: "background 100ms, color 100ms",
      }}
    >
      {children}
    </button>
  );
}

// ─── Layers panel content ─────────────────────────────────────────────────────

export function LayersPanel() {
  const { blocks, selectedBlockId } = useBuilder();

  if (blocks.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "20px", marginBottom: "8px" }}>📋</span>
        <p
          style={{
            fontSize: "12px",
            color: "#52525b",
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.5,
          }}
        >
          No blocks yet. Add elements from the panel above.
        </p>
      </div>
    );
  }

  // Render in reverse order so top of list = top of visual stack
  const reversed = [...blocks].reverse();

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
      {reversed.map((block, revIdx) => {
        const realIndex = blocks.length - 1 - revIdx;
        return (
          <LayerRow
            key={block.id}
            block={block}
            index={realIndex}
            total={blocks.length}
            isSelected={block.id === selectedBlockId}
          />
        );
      })}
    </div>
  );
}
