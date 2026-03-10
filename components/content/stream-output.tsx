"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Sparkles,
  Hash,
  MessageSquare,
  Zap,
  FileText,
  Youtube,
  Image,
} from "lucide-react";
import type { GeneratedContent } from "@/hooks/use-content-stream";
import { cn } from "@/lib/utils";

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="h-6 w-6 rounded flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(255,255,255,0.06)] transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check size={12} className="text-[--status-success]" /> : <Copy size={12} />}
    </button>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
interface SectionProps {
  icon: React.ReactNode;
  label: string;
  content: string;
  isActive?: boolean;
  isStreaming?: boolean;
  mono?: boolean;
  editMode?: boolean;
  onChange?: (val: string) => void;
}

function Section({
  icon,
  label,
  content,
  isActive,
  isStreaming,
  mono,
  editMode,
  onChange,
}: SectionProps) {
  const isEmpty = !content;

  return (
    <AnimatePresence mode="popLayout">
      {(!isEmpty || isActive) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "group rounded-[--radius-md] border transition-all duration-200",
            isActive && isStreaming
              ? "border-[--accent]/40 bg-[--accent-muted]"
              : "border-[--border-subtle] bg-[--bg-elevated]"
          )}
        >
          {/* Section header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[--border-subtle]">
            <div className="flex items-center gap-2 text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
              {icon}
              {label}
              {isActive && isStreaming && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-[--accent]"
                >
                  ●
                </motion.span>
              )}
            </div>
            {content && <CopyButton text={content} />}
          </div>

          {/* Content */}
          <div className="p-3.5">
            {isEmpty ? (
              <div className="h-4 w-3/4 rounded animate-pulse bg-[rgba(255,255,255,0.05)]" />
            ) : editMode && onChange ? (
              <textarea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                rows={Math.max(3, content.split("\n").length)}
                className={cn(
                  "w-full bg-transparent text-sm text-[--text-primary] resize-none",
                  "focus:outline-none leading-relaxed",
                  mono && "font-mono text-xs"
                )}
              />
            ) : (
              <p
                className={cn(
                  "text-sm text-[--text-primary] whitespace-pre-wrap leading-relaxed",
                  mono && "font-mono text-xs"
                )}
              >
                {content}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Thinking indicator ───────────────────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 py-6">
      <div className="relative h-8 w-8 shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[--accent]/20 border-t-[--accent]"
        />
        <Sparkles
          size={12}
          className="absolute inset-0 m-auto text-[--accent]"
        />
      </div>
      <div>
        <p className="text-sm font-medium text-[--text-primary]">
          Claude is writing your content
        </p>
        <motion.p
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-xs text-[--text-secondary]"
        >
          Using adaptive thinking for best results…
        </motion.p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface StreamOutputProps {
  content: GeneratedContent;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  rawText: string;
  isStreaming: boolean;
  editMode?: boolean;
  onChange?: (field: keyof GeneratedContent, val: string) => void;
}

type SectionDef = {
  key: keyof GeneratedContent;
  label: string;
  icon: React.ReactNode;
  mono?: boolean;
};

const SECTION_DEFS: SectionDef[] = [
  { key: "hook", label: "Hook", icon: <Zap size={12} /> },
  { key: "caption", label: "Caption", icon: <MessageSquare size={12} /> },
  { key: "hashtags", label: "Hashtags", icon: <Hash size={12} />, mono: true },
  { key: "cta", label: "Call to Action", icon: <Sparkles size={12} /> },
  { key: "script", label: "Script", icon: <FileText size={12} />, mono: true },
];

const YOUTUBE_EXTRA: SectionDef[] = [
  { key: "youtubeTitle", label: "YouTube Title", icon: <Youtube size={12} /> },
  { key: "thumbnailText", label: "Thumbnail Text", icon: <Image size={12} /> },
];

export function StreamOutput({
  content,
  platform,
  rawText,
  isStreaming,
  editMode,
  onChange,
}: StreamOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [rawText, isStreaming]);

  const hasAnyContent = Object.values(content).some((v) => v.length > 0);
  const isThinking = isStreaming && !hasAnyContent;

  // Determine which section is actively being written
  const getIsActive = (key: string): boolean => {
    if (!isStreaming || !rawText) return false;
    const tag = key.replace(/([A-Z])/g, "_$1").toUpperCase();
    const openTag = `[${tag}]`;
    const closeTag = `[/${tag}]`;
    const openIdx = rawText.indexOf(openTag);
    if (openIdx === -1) return false;
    const closeIdx = rawText.indexOf(closeTag, openIdx);
    // Active if we found the open tag but not yet the close tag
    return closeIdx === -1;
  };

  const sections = [
    ...SECTION_DEFS,
    ...(platform === "YOUTUBE" ? YOUTUBE_EXTRA : []),
  ];

  if (!isStreaming && !hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
        <div className="h-14 w-14 rounded-[--radius-lg] bg-[--bg-elevated] border border-[--border-subtle] flex items-center justify-center mb-4">
          <Sparkles size={22} className="text-[--text-tertiary]" />
        </div>
        <p className="text-[15px] font-medium text-[--text-primary]">
          Ready to generate
        </p>
        <p className="mt-1 text-sm text-[--text-secondary] max-w-xs">
          Fill in the form on the left and click{" "}
          <span className="text-[--accent]">Generate with Claude</span> to create
          platform-optimized content.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3 p-1 overflow-y-auto">
      {isThinking && <ThinkingIndicator />}

      {sections.map(({ key, label, icon, mono }) => (
        <Section
          key={key}
          icon={icon}
          label={label}
          content={content[key]}
          isActive={getIsActive(key)}
          isStreaming={isStreaming}
          mono={mono}
          editMode={editMode}
          onChange={onChange ? (val) => onChange(key, val) : undefined}
        />
      ))}
    </div>
  );
}
