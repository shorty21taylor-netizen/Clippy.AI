"use client";

import React, { useState } from "react";
import {
  Target,
  AlignLeft,
  ImageIcon,
  Play,
  FileText,
  MousePointer,
  Star,
  Quote,
  Minus,
  ArrowUpDown,
  GripVertical,
  Layers,
} from "lucide-react";
import { useBuilder } from "./context";
import { LayersPanel } from "./LayersPanel";
import type { BlockType } from "@/types/funnel";

interface ElementItem {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const ELEMENTS: ElementItem[] = [
  // Layout
  { type: "spacer",      label: "Spacer",       icon: <ArrowUpDown size={16} />, group: "Layout" },
  { type: "divider",     label: "Divider",       icon: <Minus size={16} />,       group: "Layout" },
  // Content
  { type: "hero",        label: "Hero",          icon: <Target size={16} />,      group: "Content" },
  { type: "text",        label: "Text",          icon: <AlignLeft size={16} />,   group: "Content" },
  { type: "image",       label: "Image",         icon: <ImageIcon size={16} />,   group: "Content" },
  { type: "video",       label: "Video",         icon: <Play size={16} />,        group: "Content" },
  // Conversion
  { type: "form",        label: "Lead Form",     icon: <FileText size={16} />,    group: "Conversion" },
  { type: "cta",         label: "CTA Button",    icon: <MousePointer size={16} />, group: "Conversion" },
  // Social Proof
  { type: "features",    label: "Features",      icon: <Star size={16} />,        group: "Social Proof" },
  { type: "testimonial", label: "Testimonial",   icon: <Quote size={16} />,       group: "Social Proof" },
];

const GROUPS = ["Layout", "Content", "Conversion", "Social Proof"];

function ElementCard({ item }: { item: ElementItem }) {
  const { addBlock } = useBuilder();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => addBlock(item.type)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Add ${item.label}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "0 12px",
        height: "42px",
        borderRadius: "8px",
        border: "1px solid transparent",
        background: hovered ? "rgba(255,255,255,0.05)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 150ms, border-color 150ms",
        borderColor: hovered ? "rgba(255,255,255,0.08)" : "transparent",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span
        style={{
          color: hovered ? "#a1a1aa" : "#71717a",
          transition: "color 150ms",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {item.icon}
      </span>
      <span
        style={{
          fontSize: "13px",
          color: hovered ? "#fafafa" : "#a1a1aa",
          transition: "color 150ms",
          flex: 1,
          fontWeight: 400,
        }}
      >
        {item.label}
      </span>
      <GripVertical
        size={13}
        style={{
          color: "#3f3f46",
          opacity: hovered ? 1 : 0,
          transition: "opacity 150ms",
          flexShrink: 0,
        }}
      />
    </button>
  );
}

function GroupSection({
  group,
  items,
}: {
  group: string;
  items: ElementItem[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ marginBottom: "4px" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "6px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#71717a",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {group}
        <span
          style={{
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 150ms",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div>
          {items.map((item) => (
            <ElementCard key={item.type} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LeftPanel() {
  const [activeTab, setActiveTab] = useState<"elements" | "layers">("elements");

  return (
    <aside
      style={{
        width: "260px",
        flexShrink: 0,
        background: "#18181b",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Tab header */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          display: "flex",
          padding: "0 8px",
        }}
      >
        {(["elements", "layers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              height: "40px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab ? "#3b82f6" : "transparent"}`,
              color: activeTab === tab ? "#60a5fa" : "#52525b",
              fontSize: "11px",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              transition: "color 150ms, border-color 150ms",
            }}
          >
            {tab === "layers" ? <Layers size={11} /> : null}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "elements" ? (
        <>
          {/* Element groups */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 4px" }}>
            {GROUPS.map((group) => {
              const items = ELEMENTS.filter((e) => e.group === group);
              return <GroupSection key={group} group={group} items={items} />;
            })}
          </div>
          {/* Footer tip */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              fontSize: "11px",
              color: "#52525b",
              lineHeight: 1.5,
            }}
          >
            Click an element to add it to the canvas
          </div>
        </>
      ) : (
        <>
          {/* Layers panel header */}
          <div
            style={{
              padding: "8px 12px 6px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "10px", color: "#52525b", fontFamily: "'Inter', sans-serif" }}>
              Double-click to rename · drag to reorder
            </span>
          </div>
          <LayersPanel />
        </>
      )}
    </aside>
  );
}
