"use client";

import React from "react";
import { BLOCK_LABELS, BLOCK_ICONS, type BlockType } from "@/types/funnel";
import { cn } from "@/lib/utils";

const BLOCK_TYPES: BlockType[] = [
  "hero", "text", "image", "video", "form",
  "cta", "features", "testimonial", "divider", "spacer",
];

interface BlockPaletteProps {
  onAdd: (type: BlockType) => void;
}

export function BlockPalette({ onAdd }: BlockPaletteProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-widest mb-2">
        Blocks
      </p>
      {BLOCK_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          className={cn(
            "flex items-center gap-2.5 rounded-[--radius-md] px-3 py-2.5 text-left transition-all",
            "bg-[--bg-elevated] border border-[--border-subtle]",
            "hover:border-[--accent]/40 hover:bg-[--accent-muted]",
            "active:scale-95"
          )}
        >
          <span className="text-base leading-none">{BLOCK_ICONS[type]}</span>
          <span className="text-sm font-medium text-[--text-primary]">
            {BLOCK_LABELS[type]}
          </span>
        </button>
      ))}
    </div>
  );
}
