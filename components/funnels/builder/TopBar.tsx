"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  Rocket,
  ChevronDown,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useBuilder, DeviceMode } from "./context";

interface FunnelData {
  id: string;
  title: string;
  slug: string;
  workspaceId: string;
}

interface TopBarProps {
  funnel: FunnelData;
  publishedAt: string | null;
  saveStatus: "saved" | "saving" | "unsaved" | "idle";
  onPublish: (publish: boolean) => Promise<void>;
  onManualSave: () => void;
}

const S = {
  bar: {
    height: "56px",
    background: "#18181b",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: "12px",
    flexShrink: 0,
    fontFamily: "'Inter', sans-serif",
    zIndex: 10,
  } as React.CSSProperties,
  separator: {
    width: "1px",
    height: "20px",
    background: "rgba(255,255,255,0.08)",
    flexShrink: 0,
  } as React.CSSProperties,
};

function SaveIndicator({ status }: { status: TopBarProps["saveStatus"] }) {
  if (status === "idle") return null;

  const config = {
    saving: { color: "#a1a1aa", label: "Saving…" },
    saved: { color: "#22c55e", label: "Saved" },
    unsaved: { color: "#f59e0b", label: "Unsaved changes" },
  }[status] ?? { color: "#a1a1aa", label: "" };

  return (
    <span
      style={{
        fontSize: "12px",
        color: config.color,
        display: "flex",
        alignItems: "center",
        gap: "5px",
        transition: "color 300ms",
        whiteSpace: "nowrap",
      }}
    >
      {status === "saving" && (
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            border: "2px solid #a1a1aa",
            borderTopColor: "transparent",
            display: "inline-block",
            animation: "spin 600ms linear infinite",
          }}
        />
      )}
      {status === "saved" && (
        <Check size={11} style={{ color: "#22c55e" }} />
      )}
      {status === "unsaved" && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#f59e0b",
            display: "inline-block",
          }}
        />
      )}
      {config.label}
    </span>
  );
}

function DeviceToggle() {
  const { deviceMode, setDeviceMode } = useBuilder();

  const devices: { mode: DeviceMode; icon: React.ReactNode; label: string }[] =
    [
      { mode: "desktop", icon: <Monitor size={15} />, label: "Desktop (1)" },
      { mode: "tablet", icon: <Tablet size={15} />, label: "Tablet (2)" },
      { mode: "mobile", icon: <Smartphone size={15} />, label: "Mobile (3)" },
    ];

  return (
    <div
      style={{
        display: "flex",
        background: "rgba(255,255,255,0.04)",
        borderRadius: "8px",
        padding: "3px",
        gap: "2px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {devices.map(({ mode, icon, label }) => {
        const active = deviceMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setDeviceMode(mode)}
            title={label}
            aria-label={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "28px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              transition: "background 150ms, color 150ms",
              background: active
                ? "rgba(59,130,246,0.15)"
                : "transparent",
              color: active ? "#3b82f6" : "#71717a",
            }}
            onMouseEnter={(e) => {
              if (!active)
                (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa";
            }}
            onMouseLeave={(e) => {
              if (!active)
                (e.currentTarget as HTMLButtonElement).style.color = "#71717a";
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

function PublishButton({
  publishedAt,
  slug,
  onPublish,
}: {
  publishedAt: string | null;
  slug: string;
  onPublish: (publish: boolean) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPublished = Boolean(publishedAt);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/f/${slug}`
      : `/f/${slug}`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handle = async (publish: boolean) => {
    setLoading(true);
    setShowMenu(false);
    await onPublish(publish);
    setLoading(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isPublished) {
    return (
      <div ref={menuRef} style={{ position: "relative" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "1px" }}
        >
          {/* Published indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 10px",
              height: "32px",
              borderRadius: "8px 0 0 8px",
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRight: "none",
              fontSize: "12px",
              color: "#22c55e",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
              }}
            />
            Published
          </div>
          {/* Dropdown arrow */}
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "32px",
              borderRadius: "0 8px 8px 0",
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderLeft: "none",
              cursor: "pointer",
              color: "#22c55e",
            }}
            aria-label="Publish options"
          >
            <ChevronDown
              size={13}
              style={{
                transform: showMenu ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 150ms",
              }}
            />
          </button>
        </div>

        {showMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "#27272a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "6px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              minWidth: "220px",
              zIndex: 50,
            }}
          >
            <a
              href={`/f/${slug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#a1a1aa",
                textDecoration: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background =
                  "transparent")
              }
            >
              <ExternalLink size={13} />
              View live page
            </a>

            <button
              onClick={copyUrl}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#a1a1aa",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
            >
              {copied ? <Check size={13} style={{ color: "#22c55e" }} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy URL"}
            </button>

            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,0.06)",
                margin: "4px 0",
              }}
            />

            <button
              onClick={() => handle(false)}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#ef4444",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(239,68,68,0.08)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
            >
              Unpublish page
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => handle(true)}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "0 14px",
        height: "32px",
        borderRadius: "8px",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        opacity: loading ? 0.7 : 1,
        boxShadow: "0 2px 8px rgba(59,130,246,0.35)",
        transition: "opacity 150ms, transform 150ms",
      }}
      onMouseEnter={(e) => {
        if (!loading)
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <Rocket size={13} />
      {loading ? "Publishing…" : "Publish"}
    </button>
  );
}

export function TopBar({
  funnel,
  publishedAt,
  saveStatus,
  onPublish,
  onManualSave,
}: TopBarProps) {
  const { undo, redo, canUndo, canRedo } = useBuilder();
  const [title, setTitle] = useState(funnel.title);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const commitTitle = async () => {
    setEditing(false);
    if (title.trim() === funnel.title) return;
    await fetch(`/api/funnels/${funnel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: funnel.workspaceId,
        title: title.trim() || funnel.title,
      }),
    });
  };

  const iconBtn = (
    icon: React.ReactNode,
    onClick: () => void,
    disabled: boolean,
    label: string
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "7px",
        border: "none",
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#52525b" : "#a1a1aa",
        transition: "background 150ms, color 150ms",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "rgba(255,255,255,0.06)";
          el.style.color = "#fafafa";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "transparent";
        el.style.color = disabled ? "#52525b" : "#a1a1aa";
      }}
    >
      {icon}
    </button>
  );

  return (
    <header style={S.bar}>
      {/* Back */}
      <Link
        href="/dashboard/funnels"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          color: "#71717a",
          textDecoration: "none",
          fontSize: "13px",
          transition: "color 150ms",
          flexShrink: 0,
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = "#fafafa")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = "#71717a")
        }
      >
        <ArrowLeft size={14} />
        <span style={{ display: "none" }}>Back</span>
      </Link>

      <div style={S.separator} />

      {/* Funnel name */}
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") {
              setTitle(funnel.title);
              setEditing(false);
            }
          }}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(59,130,246,0.5)",
            borderRadius: "6px",
            padding: "4px 8px",
            color: "#fafafa",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            minWidth: "160px",
            maxWidth: "280px",
          }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Click to rename"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#fafafa",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            padding: "4px 6px",
            borderRadius: "6px",
            transition: "background 150ms",
            maxWidth: "240px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.05)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "transparent")
          }
        >
          {title}
        </button>
      )}

      <SaveIndicator status={saveStatus} />

      {/* Center — device toggle */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <DeviceToggle />
      </div>

      {/* Right side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {iconBtn(<Undo2 size={15} />, undo, !canUndo, "Undo (Ctrl+Z)")}
        {iconBtn(<Redo2 size={15} />, redo, !canRedo, "Redo (Ctrl+Shift+Z)")}

        <div style={S.separator} />

        {/* Preview */}
        <a
          href={`/f/${funnel.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "0 10px",
            height: "32px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#a1a1aa",
            fontSize: "13px",
            textDecoration: "none",
            fontWeight: 500,
            transition: "background 150ms, color 150ms",
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "rgba(255,255,255,0.08)";
            el.style.color = "#fafafa";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "rgba(255,255,255,0.05)";
            el.style.color = "#a1a1aa";
          }}
        >
          <Eye size={13} />
          Preview
        </a>

        <PublishButton
          publishedAt={publishedAt}
          slug={funnel.slug}
          onPublish={onPublish}
        />
      </div>

      {/* Global styles for the spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
}
