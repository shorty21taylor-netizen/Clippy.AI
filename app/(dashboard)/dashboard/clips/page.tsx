"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Wand2,
  Clock,
  TrendingUp,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Film,
  Hash,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetectedClip {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  transcript_excerpt: string;
  virality_score: number;
  virality_reason: string;
  hook: string;
  suggested_caption: string;
  suggested_hashtags: string[];
  clip_type: "hot_take" | "emotional" | "quotable" | "story" | "reveal" | "relatable";
  needs_trim_start: number;
  needs_trim_end: number;
}

// ─── Clip type config ─────────────────────────────────────────────────────────

const CLIP_TYPE_CONFIG: Record<
  DetectedClip["clip_type"],
  { label: string; variant: "blue" | "violet" | "emerald" | "amber" | "error" | "pending" }
> = {
  hot_take:  { label: "Hot Take",   variant: "error" },
  emotional: { label: "Emotional",  variant: "violet" },
  quotable:  { label: "Quotable",   variant: "blue" },
  story:     { label: "Story",      variant: "amber" },
  reveal:    { label: "Reveal",     variant: "emerald" },
  relatable: { label: "Relatable",  variant: "pending" },
};

// ─── Virality score ring ──────────────────────────────────────────────────────

function ViralityScore({ score }: { score: number }) {
  const color =
    score >= 9 ? "#F43F5E" :
    score >= 7 ? "#10B981" :
    score >= 5 ? "#F59E0B" : "#71717A";

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg border-2"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wide">Viral</span>
    </div>
  );
}

// ─── Single clip card ─────────────────────────────────────────────────────────

function ClipCard({ clip, index }: { clip: DetectedClip; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const typeConfig = CLIP_TYPE_CONFIG[clip.clip_type] ?? { label: clip.clip_type, variant: "blue" as const };

  const copyToClipboard = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const durationStr = `${Math.floor(clip.duration_seconds / 60)}:${String(clip.duration_seconds % 60).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-[var(--radius-lg)] bg-[--bg-surface] border border-[--border-default] shadow-[var(--shadow-sm)] overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-start gap-4 p-4">
        <ViralityScore score={clip.virality_score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge variant={typeConfig.variant as "blue" | "violet" | "emerald" | "amber" | "error" | "pending"}>
              {typeConfig.label}
            </Badge>
            <span className="text-[11px] text-[--text-tertiary] flex items-center gap-1">
              <Clock size={10} />
              {clip.start_time} – {clip.end_time} · {durationStr}
            </span>
            {(clip.needs_trim_start > 0 || clip.needs_trim_end > 0) && (
              <span className="text-[11px] text-[--accent-amber] flex items-center gap-1">
                <Scissors size={10} />
                Trim needed
              </span>
            )}
          </div>

          <h3 className="text-[15px] font-semibold text-[--text-primary] leading-snug tracking-[-0.01em]">
            {clip.title}
          </h3>

          <p className="mt-1.5 text-[13px] text-[--text-secondary] leading-relaxed line-clamp-2">
            &ldquo;{clip.transcript_excerpt}&rdquo;
          </p>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-subtle] transition-all"
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Virality reason strip */}
      <div className="px-4 pb-3 flex items-start gap-2">
        <TrendingUp size={12} className="text-[--accent-emerald] shrink-0 mt-[3px]" />
        <p className="text-[12px] text-[--text-secondary] leading-relaxed">
          <span className="font-medium text-[--accent-emerald]">Why it works: </span>
          {clip.virality_reason}
        </p>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3 space-y-4"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              {/* Hook */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide flex items-center gap-1">
                    <Sparkles size={10} /> Opening Hook
                  </span>
                  <button
                    onClick={() => copyToClipboard(clip.hook, "hook")}
                    className="text-[11px] text-[--text-tertiary] hover:text-[--accent] flex items-center gap-1 transition-colors"
                  >
                    <Copy size={10} />
                    {copied === "hook" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[13px] text-[--text-primary] bg-[--bg-subtle] rounded-[var(--radius-sm)] px-3 py-2 leading-relaxed">
                  {clip.hook}
                </p>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide flex items-center gap-1">
                    <Film size={10} /> Suggested Caption
                  </span>
                  <button
                    onClick={() => copyToClipboard(clip.suggested_caption, "caption")}
                    className="text-[11px] text-[--text-tertiary] hover:text-[--accent] flex items-center gap-1 transition-colors"
                  >
                    <Copy size={10} />
                    {copied === "caption" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[13px] text-[--text-primary] bg-[--bg-subtle] rounded-[var(--radius-sm)] px-3 py-2 leading-relaxed">
                  {clip.suggested_caption}
                </p>
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide flex items-center gap-1">
                    <Hash size={10} /> Hashtags
                  </span>
                  <button
                    onClick={() => copyToClipboard(clip.suggested_hashtags.map((h) => `#${h}`).join(" "), "tags")}
                    className="text-[11px] text-[--text-tertiary] hover:text-[--accent] flex items-center gap-1 transition-colors"
                  >
                    <Copy size={10} />
                    {copied === "tags" ? "Copied!" : "Copy all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {clip.suggested_hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[12px] text-[--accent-indigo] bg-[--accent-blue-light] rounded-full px-2.5 py-0.5"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Trim guide */}
              {(clip.needs_trim_start > 0 || clip.needs_trim_end > 0) && (
                <div className="rounded-[var(--radius-sm)] bg-[--accent-amber-light] border border-[--accent-amber-border] px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-[--accent-amber] mb-0.5">
                    Trim guide
                  </p>
                  <p className="text-[12px] text-[--text-secondary]">
                    {clip.needs_trim_start > 0 && `Cut ${clip.needs_trim_start}s from start. `}
                    {clip.needs_trim_end > 0 && `Cut ${clip.needs_trim_end}s from end.`}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] bg-[--bg-surface] border border-[--border-default] p-4 flex gap-4"
        >
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 px-8">
      <div
        className="h-16 w-16 rounded-[20px] flex items-center justify-center mb-5"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(59,130,246,0.10))", border: "1px solid rgba(99,102,241,0.20)" }}
      >
        <Scissors size={28} className="text-[--accent-indigo]" />
      </div>
      <h3 className="text-[18px] font-bold text-[--text-primary] tracking-[-0.02em] mb-2">
        Find your viral moments
      </h3>
      <p className="text-[14px] text-[--text-secondary] max-w-[320px] leading-relaxed">
        Paste a transcript from any long-form video. Claude will identify the 8–15
        best moments to clip, ranked by virality potential.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 text-left max-w-[380px]">
        {[
          { label: "Hot takes & controversy", desc: "Drives comments & reach" },
          { label: "Emotional peaks", desc: "Vulnerability, passion, laughter" },
          { label: "Quotable one-liners", desc: "Caption-ready moments" },
          { label: "Story hooks", desc: "Tension within first 5 seconds" },
        ].map((tip) => (
          <div
            key={tip.label}
            className="rounded-[var(--radius-md)] bg-[--bg-surface] border border-[--border-default] px-3 py-2.5"
          >
            <p className="text-[12px] font-semibold text-[--text-primary]">{tip.label}</p>
            <p className="text-[11px] text-[--text-secondary]">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClipFinderPage() {
  const { workspace } = useWorkspace();

  // Form state
  const [transcript, setTranscript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [channelName, setChannelName] = useState("");
  const [niche, setNiche] = useState("");
  const [showMeta, setShowMeta] = useState(false);

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clips, setClips] = useState<DetectedClip[]>([]);
  const [videoSummary, setVideoSummary] = useState("");

  const canAnalyze = transcript.trim().length >= 100 && !loading;

  const handleAnalyze = useCallback(async () => {
    if (!workspace || !canAnalyze) return;
    setLoading(true);
    setError("");
    setClips([]);
    setVideoSummary("");

    try {
      const res = await fetch("/api/clips/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          transcript: transcript.trim(),
          videoTitle: videoTitle.trim() || undefined,
          channelName: channelName.trim() || undefined,
          niche: niche.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed. Please try again.");
        return;
      }

      setClips(data.clips ?? []);
      setVideoSummary(data.videoSummary ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [workspace, transcript, videoTitle, channelName, niche, canAnalyze]);

  const hasResults = clips.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Clip Finder" />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: input panel ───────────────────────────────────────────── */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-[--border-subtle] overflow-y-auto">
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[--text-primary] tracking-[-0.01em]">
                Transcript
              </h2>
              <p className="text-[12px] text-[--text-secondary] mt-0.5">
                Paste a timestamped transcript from YouTube, Riverside, Descript, or any source.
              </p>
            </div>

            {/* Transcript */}
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`[00:00] Welcome back everyone, today we're talking about...\n[00:15] I want to share something that changed everything for me...\n[01:30] Most people get this completely wrong...`}
              rows={14}
              className="w-full rounded-[var(--radius-md)] bg-[--bg-input] border border-[--border-default] px-3.5 py-3 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] focus:shadow-[0_0_0_4px_rgba(99,102,241,0.10)] transition-all resize-none leading-relaxed font-mono"
            />
            <p className="text-[11px] text-[--text-tertiary]">
              {transcript.length < 100
                ? `${100 - transcript.length} more characters needed`
                : `${transcript.length.toLocaleString()} characters · ready to analyze`}
            </p>

            {/* Optional metadata toggle */}
            <button
              onClick={() => setShowMeta((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              {showMeta ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Video metadata{" "}
              <span className="text-[--text-tertiary]">(optional)</span>
            </button>

            <AnimatePresence>
              {showMeta && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden space-y-3"
                >
                  {[
                    { label: "Video title", value: videoTitle, onChange: setVideoTitle, placeholder: "e.g. Why I Quit My $200k Job" },
                    { label: "Channel / Creator", value: channelName, onChange: setChannelName, placeholder: "e.g. Alex Hormozi" },
                    { label: "Niche", value: niche, onChange: setNiche, placeholder: "e.g. Entrepreneurship, Fitness" },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={field.placeholder}
                        className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors"
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analyze button */}
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              loading={loading}
              className="w-full"
            >
              {!loading && <Wand2 size={15} />}
              {loading ? "Analyzing transcript…" : "Find viral clips"}
            </Button>

            {error && (
              <p className="text-[12px] text-[--status-error] flex items-start gap-1.5">
                <AlertCircle size={13} className="shrink-0 mt-[1px]" />
                {error}
              </p>
            )}

            {loading && (
              <p className="text-[11px] text-[--text-tertiary] text-center leading-relaxed">
                Claude is reading your transcript and scoring each moment for virality potential. This takes 20–40 seconds.
              </p>
            )}
          </div>
        </div>

        {/* ── Right: results panel ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[760px] mx-auto p-6">
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="status-dot" />
                  <p className="text-[13px] text-[--text-secondary]">
                    Analyzing transcript for viral moments…
                  </p>
                </div>
                <ResultsSkeleton />
              </div>
            ) : hasResults ? (
              <div className="space-y-4 page-enter">
                {/* Summary header */}
                <div className="rounded-[var(--radius-lg)] bg-[--bg-surface] border border-[--border-default] shadow-[var(--shadow-sm)] p-4 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[--text-tertiary] uppercase tracking-wide mb-1">
                        Video Summary
                      </p>
                      <p className="text-[14px] text-[--text-primary] leading-snug">
                        {videoSummary}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p
                        className={cn(
                          "text-[32px] font-bold tracking-[-0.03em]",
                          "gradient-text"
                        )}
                      >
                        {clips.length}
                      </p>
                      <p className="text-[11px] text-[--text-tertiary]">clips found</p>
                    </div>
                  </div>

                  {/* Score distribution */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {[
                      { label: "10", count: clips.filter((c) => c.virality_score === 10).length, color: "#F43F5E" },
                      { label: "9", count: clips.filter((c) => c.virality_score === 9).length, color: "#F43F5E" },
                      { label: "8", count: clips.filter((c) => c.virality_score === 8).length, color: "#10B981" },
                      { label: "7", count: clips.filter((c) => c.virality_score === 7).length, color: "#10B981" },
                    ].filter((b) => b.count > 0).map((b) => (
                      <span
                        key={b.label}
                        className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                        style={{ background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}33` }}
                      >
                        {b.count}× score {b.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Clip cards */}
                {clips.map((clip, i) => (
                  <ClipCard key={clip.id} clip={clip} index={i} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
