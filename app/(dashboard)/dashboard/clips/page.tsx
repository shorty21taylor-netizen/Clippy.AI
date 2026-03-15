"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors, Play, Check, X, ChevronDown, ChevronUp, AlertCircle,
  Loader2, Instagram, Youtube, Upload, CheckCircle2, Clock, TrendingUp,
  Flame, Heart, Quote, BookOpen, Lightbulb, Smile, Share2, Wand2,
  RefreshCw, Users, ShoppingBag, Megaphone, Link, GraduationCap,
  Target, Hash, Sparkles, Edit2,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClipType = "HOT_TAKE" | "EMOTIONAL" | "QUOTABLE" | "STORY" | "REVEAL" | "RELATABLE";
type ClipStatus = "GENERATED" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "REJECTED";
type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
type CaptionPlatform = "tiktok" | "instagram";
type CaptionStyle = "curiosity" | "direct" | "storytelling";

interface CaptionVariant { style: CaptionStyle; text: string; cta: string; }
interface ClipCaptions { tiktok: CaptionVariant[]; instagram: CaptionVariant[]; }
interface ClipHashtags { tiktok: string[]; instagram: string[]; }

interface Clip {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  viralityScore: number;
  clipType: ClipType;
  hook: string | null;
  suggestedCaption: string | null;
  suggestedHashtags: string[];
  viralityReason: string | null;
  transcriptExcerpt: string | null;
  videoPath: string | null;
  thumbnailPath: string | null;
  status: ClipStatus;
  hookText: string | null;
  captions: ClipCaptions | null;
  hashtagSets: ClipHashtags | null;
  selectedCaptionStyle: CaptionStyle | null;
  goal: string | null;
}

interface SocialAccount {
  id: string;
  platform: Platform;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface GoalOption { value: string; label: string; description: string; icon: React.ElementType; }

// ─── Config ───────────────────────────────────────────────────────────────────

const CLIP_TYPE_CONFIG: Record<ClipType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  HOT_TAKE:  { label: "Hot Take",  color: "#F97316", bg: "rgba(249,115,22,0.12)",  icon: Flame },
  EMOTIONAL: { label: "Emotional", color: "#A855F7", bg: "rgba(168,85,247,0.12)",  icon: Heart },
  QUOTABLE:  { label: "Quotable",  color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: Quote },
  STORY:     { label: "Story",     color: "#10B981", bg: "rgba(16,185,129,0.12)",  icon: BookOpen },
  REVEAL:    { label: "Reveal",    color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: Lightbulb },
  RELATABLE: { label: "Relatable", color: "#EC4899", bg: "rgba(236,72,153,0.12)", icon: Smile },
};

const GOALS: GoalOption[] = [
  { value: "grow_audience",  label: "Grow My Audience",   description: "Maximize reach & followers",       icon: Users },
  { value: "get_clients",    label: "Get Clients / Leads", description: "Drive inquiries & leads",          icon: Target },
  { value: "sell_product",   label: "Sell a Product",      description: "Promote and convert sales",        icon: ShoppingBag },
  { value: "build_brand",    label: "Build My Brand",      description: "Authority & recognition",          icon: Megaphone },
  { value: "drive_traffic",  label: "Drive Traffic",       description: "Send viewers to your link",        icon: Link },
  { value: "educate",        label: "Educate & Share",     description: "Teach and provide value",          icon: GraduationCap },
];

const CAPTION_STYLES: { value: CaptionStyle; label: string }[] = [
  { value: "curiosity",    label: "Curiosity" },
  { value: "direct",       label: "Direct" },
  { value: "storytelling", label: "Story" },
];

const NICHES = ["Entrepreneurship","Fitness","Finance","Technology","Lifestyle","Education","Entertainment","Health","Gaming","Food","Travel","Other"];
const TONES  = ["Professional","Casual","Inspiring","Humorous","Bold","Educational"];

// ─── Utils ────────────────────────────────────────────────────────────────────

function getViralityColor(score: number): string {
  if (score >= 9) return "#F59E0B";
  if (score >= 7) return "#10B981";
  if (score >= 5) return "#EAB308";
  return "#71717A";
}

function formatDuration(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Upload", "Processing", "Review Clips", "Post"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all",
                done ? "bg-emerald-500 text-white" : active ? "bg-[#4F46E5] text-white" : "bg-[--bg-subtle] text-[--text-tertiary] border border-[--border-default]"
              )}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className={cn("text-[11px] whitespace-nowrap", active ? "text-[--text-primary] font-medium" : "text-[--text-tertiary]")}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={cn("flex-1 h-[2px] mb-5 mx-1 transition-all", i < current ? "bg-emerald-500" : "bg-[--border-default]")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Clip Thumbnail ───────────────────────────────────────────────────────────

function ClipThumbnail({ thumbnailPath }: { thumbnailPath: string | null }) {
  return (
    <div className="relative w-full bg-[--bg-subtle] flex items-center justify-center" style={{ aspectRatio: "9/16", maxHeight: 200 }}>
      {thumbnailPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailPath} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-[--text-tertiary]">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            <Play size={18} className="ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rewrite Caption Modal ────────────────────────────────────────────────────

function RewriteCaptionModal({
  open, clipId, currentCaption, platform, goal, clipContext, style, onAccept, onClose,
}: {
  open: boolean; clipId: string; currentCaption: string; platform: CaptionPlatform;
  goal: string | null; clipContext: string | null; style: CaptionStyle;
  onAccept: (newText: string) => void; onClose: () => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const handleRewrite = async () => {
    if (!instruction.trim()) return;
    setStreaming(true); setResult(""); setError("");
    try {
      const res = await fetch(`/api/clips/${clipId}/rewrite-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCaption, instruction: instruction.trim(), platform, goal: goal || undefined, clipContext: clipContext || undefined, style }),
      });
      if (!res.ok || !res.body) throw new Error("Failed to start rewrite");
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = ""; let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw) as { text?: string; error?: string };
            if (parsed.error) { setError(parsed.error); break; }
            if (parsed.text) { text += parsed.text; setResult(text); }
          } catch { /* ignore */ }
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Rewrite failed"); }
    finally { setStreaming(false); }
  };

  const handleClose = () => {
    readerRef.current?.cancel();
    setInstruction(""); setResult(""); setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Rewrite Caption with AI" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">Current Caption</label>
          <div className="rounded-[8px] bg-[--bg-subtle] border border-[--border-default] px-3 py-2.5 text-[13px] text-[--text-secondary] leading-relaxed">
            {currentCaption || <span className="italic">No caption</span>}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">Instruction</label>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3}
            placeholder="e.g. Make it more urgent, add an emoji, focus on the pain point..."
            className="w-full rounded-[8px] bg-[--bg-input] border border-[--border-default] px-3 py-2.5 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors resize-none" />
        </div>
        <Button onClick={handleRewrite} disabled={!instruction.trim() || streaming} loading={streaming} className="w-full">
          <Wand2 size={14} className="mr-2" />Rewrite
        </Button>
        {error && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        {result && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block">New Caption</label>
            <div className={cn("rounded-[8px] bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5 text-[13px] text-[--text-primary] leading-relaxed", streaming && "animate-pulse")}>
              {result}
            </div>
            {!streaming && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onAccept(result); handleClose(); }} className="flex-1">
                  <Check size={13} className="mr-1.5" />Accept
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setResult(""); setInstruction(""); }}>Try Again</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Change Goal Modal ────────────────────────────────────────────────────────

function ChangeGoalModal({
  open, sourceVideoId, currentGoal, onDone, onClose,
}: {
  open: boolean; sourceVideoId: string; currentGoal: string | null;
  onDone: (clips: Clip[]) => void; onClose: () => void;
}) {
  const [goal, setGoal] = useState(currentGoal ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegenerate = async () => {
    if (!goal) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/clips/bulk-regenerate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVideoId, goal }),
      });
      const data = await res.json() as { clips?: Clip[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to regenerate");
      onDone(data.clips ?? []);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Regeneration failed"); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change Goal & Regenerate Copy" size="lg">
      <div className="space-y-5">
        <p className="text-[13px] text-[--text-secondary]">
          Select a new goal to regenerate AI-written captions, hooks, and hashtags for all clips.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => {
            const GoalIcon = g.icon;
            return (
              <button key={g.value} onClick={() => setGoal(g.value)}
                className={cn("flex items-start gap-3 p-3 rounded-[10px] border text-left transition-all",
                  goal === g.value ? "border-[#4F46E5]/50 bg-[#4F46E5]/5 text-[--text-primary]" : "border-[--border-default] hover:border-[--border-strong] text-[--text-secondary]")}>
                <GoalIcon size={16} className={cn("mt-0.5 shrink-0", goal === g.value ? "text-[#4F46E5]" : "")} />
                <div>
                  <div className="text-[13px] font-semibold">{g.label}</div>
                  <div className="text-[11px] mt-0.5 opacity-70">{g.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        {error && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <Button onClick={handleRegenerate} disabled={!goal || loading} loading={loading} className="w-full">
          <RefreshCw size={14} className="mr-2" />Regenerate All Copy
        </Button>
      </div>
    </Modal>
  );
}

// ─── Review Clip Card ─────────────────────────────────────────────────────────

function ReviewClipCard({
  clip, onApprove, onReject, onCopyUpdate,
}: {
  clip: Clip; onApprove: (id: string) => void; onReject: (id: string) => void;
  onCopyUpdate: (id: string, updated: Partial<Clip>) => void;
}) {
  const [activePlatform, setActivePlatform] = useState<CaptionPlatform>("tiktok");
  const [activeStyle, setActiveStyle] = useState<CaptionStyle>((clip.selectedCaptionStyle as CaptionStyle) || "curiosity");
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [showRewrite, setShowRewrite] = useState(false);
  const [savingCaption, setSavingCaption] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);

  const typeConfig = CLIP_TYPE_CONFIG[clip.clipType];
  const TypeIcon = typeConfig.icon;
  const viralColor = getViralityColor(clip.viralityScore);
  const isApproved = clip.status === "APPROVED";
  const isRejected = clip.status === "REJECTED";

  const captions = clip.captions;
  const hashtagSets = clip.hashtagSets;
  const platformVariants = captions?.[activePlatform] ?? [];
  const activeVariant = platformVariants.find((v) => v.style === activeStyle) ?? platformVariants[0] ?? null;
  const hashtags = hashtagSets?.[activePlatform] ?? [];
  const hasCopy = !!(captions && (captions.tiktok?.length || captions.instagram?.length));

  const handleSaveCaption = async () => {
    if (!captions || !activeVariant) return;
    setSavingCaption(true);
    const updatedCaptions: ClipCaptions = {
      tiktok: [...(captions.tiktok ?? [])],
      instagram: [...(captions.instagram ?? [])],
    };
    const idx = updatedCaptions[activePlatform].findIndex((v) => v.style === activeStyle);
    if (idx !== -1) updatedCaptions[activePlatform][idx] = { ...updatedCaptions[activePlatform][idx], text: captionDraft };
    try {
      await fetch(`/api/clips/${clip.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions: updatedCaptions }),
      });
      onCopyUpdate(clip.id, { captions: updatedCaptions });
    } finally { setSavingCaption(false); setEditingCaption(false); }
  };

  const handleAcceptRewrite = async (newText: string) => {
    if (!captions) return;
    const updatedCaptions: ClipCaptions = {
      tiktok: [...(captions.tiktok ?? [])],
      instagram: [...(captions.instagram ?? [])],
    };
    const idx = updatedCaptions[activePlatform].findIndex((v) => v.style === activeStyle);
    if (idx !== -1) updatedCaptions[activePlatform][idx] = { ...updatedCaptions[activePlatform][idx], text: newText };
    await fetch(`/api/clips/${clip.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captions: updatedCaptions }),
    });
    onCopyUpdate(clip.id, { captions: updatedCaptions });
  };

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isRejected ? 0.4 : 1, y: 0 }}
        whileHover={!isRejected ? { scale: 1.005 } : {}}
        transition={{ duration: 0.2 }}
        className={cn("rounded-[12px] border overflow-hidden flex flex-col transition-all",
          isApproved ? "border-emerald-400/40 bg-emerald-500/5 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]"
            : "border-[--border-default] bg-[--bg-surface] hover:border-[--accent-indigo]/30 hover:shadow-md")}>
        {/* Thumbnail */}
        <div className="relative">
          <ClipThumbnail thumbnailPath={clip.thumbnailPath} />
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
            {formatDuration(clip.duration)}
          </span>
          {isApproved && (
            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col gap-2.5 flex-1">
          {/* Score + type */}
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} style={{ color: viralColor }} />
            <span className="text-[12px] font-bold" style={{ color: viralColor }}>{clip.viralityScore}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ml-auto"
              style={{ background: typeConfig.bg, color: typeConfig.color }}>
              <TypeIcon size={10} />{typeConfig.label}
            </span>
          </div>

          {/* Hook text */}
          {clip.hookText && (
            <div className="rounded-[6px] bg-[#4F46E5]/5 border border-[#4F46E5]/15 px-2.5 py-1.5">
              <p className="text-[10px] font-semibold text-[#4F46E5] uppercase tracking-wide mb-0.5">Hook</p>
              <p className="text-[12px] text-[--text-primary] leading-relaxed">{clip.hookText}</p>
            </div>
          )}

          {hasCopy ? (
            <>
              {/* Platform toggle */}
              <div className="flex rounded-[6px] border border-[--border-default] overflow-hidden">
                {(["tiktok", "instagram"] as const).map((p) => (
                  <button key={p} onClick={() => setActivePlatform(p)}
                    className={cn("flex-1 py-1 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all",
                      activePlatform === p ? "bg-[--accent-indigo] text-white" : "text-[--text-secondary] hover:text-[--text-primary]")}>
                    {p === "tiktok" ? <Share2 size={10} /> : <Instagram size={10} />}
                    {p === "tiktok" ? "TikTok" : "Instagram"}
                  </button>
                ))}
              </div>

              {/* Style tabs */}
              <div className="flex gap-1">
                {CAPTION_STYLES.map((s) => (
                  <button key={s.value} onClick={() => setActiveStyle(s.value)}
                    className={cn("flex-1 py-0.5 px-1 text-[10px] font-medium rounded-[4px] transition-all",
                      activeStyle === s.value ? "bg-[--bg-subtle] text-[--text-primary]" : "text-[--text-tertiary] hover:text-[--text-secondary]")}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Caption */}
              {activeVariant && (
                <div>
                  {editingCaption ? (
                    <div className="space-y-1.5">
                      <textarea value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} rows={4} autoFocus
                        className="w-full rounded-[6px] bg-[--bg-input] border border-[--accent-indigo] px-2.5 py-2 text-[12px] text-[--text-primary] focus:outline-none resize-none" />
                      <div className="flex gap-1.5">
                        <button onClick={handleSaveCaption} disabled={savingCaption}
                          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-500">
                          {savingCaption ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => setEditingCaption(false)} className="text-[11px] text-[--text-tertiary] hover:text-[--text-secondary]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[12px] text-[--text-secondary] leading-relaxed cursor-pointer hover:text-[--text-primary] group"
                      onClick={() => { setCaptionDraft(activeVariant.text); setEditingCaption(true); }}>
                      {activeVariant.text}
                      <Edit2 size={10} className="inline ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </div>
                  )}
                  {activeVariant.cta && !editingCaption && (
                    <p className="text-[11px] text-[#4F46E5] mt-1 font-medium">{activeVariant.cta}</p>
                  )}
                </div>
              )}

              {/* Hashtags */}
              {hashtags.length > 0 && (
                <div>
                  <button onClick={() => setShowHashtags((v) => !v)}
                    className="flex items-center gap-1 text-[11px] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors">
                    <Hash size={10} />{hashtags.length} hashtags
                    {showHashtags ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                  <AnimatePresence>
                    {showHashtags && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="text-[11px] text-[--text-tertiary] mt-1 leading-relaxed">{hashtags.map((h) => `#${h}`).join(" ")}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button onClick={() => setShowRewrite(true)}
                className="flex items-center gap-1.5 text-[11px] text-[--text-secondary] hover:text-[--accent-indigo] transition-colors">
                <Wand2 size={10} />Rewrite with AI
              </button>
            </>
          ) : (
            <div>
              <h3 className="text-[12px] font-semibold text-[--text-primary] leading-snug line-clamp-2 mb-1">{clip.title}</h3>
              {clip.hook && <p className="text-[11px] text-[--text-secondary] italic line-clamp-2">&ldquo;{clip.hook}&rdquo;</p>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-3 pt-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button onClick={() => onApprove(clip.id)} disabled={isApproved}
            className={cn("flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[8px] text-[12px] font-medium transition-all",
              isApproved ? "bg-emerald-500 text-white cursor-default"
                : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 hover:border-emerald-500")}>
            <Check size={12} />{isApproved ? "Approved" : "Approve"}
          </button>
          <button onClick={() => onReject(clip.id)} disabled={isRejected}
            className={cn("flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[8px] text-[12px] font-medium transition-all",
              isRejected ? "bg-red-500/10 text-red-400 cursor-default"
                : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500")}>
            <X size={12} />{isRejected ? "Rejected" : "Reject"}
          </button>
        </div>
      </motion.div>

      {showRewrite && activeVariant && (
        <RewriteCaptionModal open={showRewrite} clipId={clip.id} currentCaption={activeVariant.text}
          platform={activePlatform} goal={clip.goal} clipContext={clip.transcriptExcerpt}
          style={activeStyle} onAccept={handleAcceptRewrite} onClose={() => setShowRewrite(false)} />
      )}
    </>
  );
}

// ─── All Clips Card ────────────────────────────────────────────────────────────

function AllClipsCard({ clip }: { clip: Clip }) {
  const typeConfig = CLIP_TYPE_CONFIG[clip.clipType];
  const TypeIcon = typeConfig.icon;
  const viralColor = getViralityColor(clip.viralityScore);
  const statusColors: Record<ClipStatus, { bg: string; color: string }> = {
    GENERATED: { bg: "rgba(99,102,241,0.1)",  color: "#6366F1" },
    APPROVED:  { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
    SCHEDULED: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
    PUBLISHED: { bg: "rgba(59,130,246,0.1)",  color: "#3B82F6" },
    REJECTED:  { bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
  };
  const sc = statusColors[clip.status];
  return (
    <div className="rounded-[12px] border border-[--border-default] bg-[--bg-surface] overflow-hidden flex flex-col hover:border-[--accent-indigo]/30 hover:shadow-md transition-all">
      <div className="relative">
        <ClipThumbnail thumbnailPath={clip.thumbnailPath} />
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">{formatDuration(clip.duration)}</span>
        <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{clip.status}</span>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={11} style={{ color: viralColor }} />
          <span className="text-[12px] font-bold" style={{ color: viralColor }}>{clip.viralityScore}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-auto"
            style={{ background: typeConfig.bg, color: typeConfig.color }}>
            <TypeIcon size={9} />{typeConfig.label}
          </span>
        </div>
        <h3 className="text-[13px] font-semibold text-[--text-primary] leading-snug line-clamp-2">{clip.title}</h3>
        {clip.hookText && <p className="text-[11px] text-[--text-tertiary] italic line-clamp-1">{clip.hookText}</p>}
      </div>
    </div>
  );
}

// ─── Processing View ──────────────────────────────────────────────────────────

type ProcessingStage = "transcribe" | "analyzing" | "copywriting" | "done" | "error";
const PROCESSING_STAGES = [
  { key: "transcribe",   label: "Download & Transcribe" },
  { key: "analyzing",    label: "Find Viral Moments" },
  { key: "copywriting",  label: "Write Copy" },
];

function ProcessingView({
  sourceVideoId, onComplete, onError,
}: {
  sourceVideoId: string;
  onComplete: (clips: Clip[]) => void;
  onError: () => void;
}) {
  const [stage, setStage] = useState<ProcessingStage>("transcribe");
  const [message, setMessage] = useState("Downloading & transcribing audio…");
  const [progress, setProgress] = useState(5);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    async function run() {
      // Step 1: Transcribe
      setStage("transcribe"); setMessage("Downloading & transcribing audio…"); setProgress(10);
      try {
        const res = await fetch(`/api/source-videos/${sourceVideoId}/transcribe`, {
          method: "POST", signal: controller.signal,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Transcription failed");
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStage("error"); setErrorMsg((e instanceof Error ? e.message : "Transcription failed"));
        return;
      }

      // Step 2: Analyze (SSE)
      setStage("analyzing"); setMessage("Finding viral moments with AI…"); setProgress(40);
      try {
        const res = await fetch(`/api/source-videos/${sourceVideoId}/analyze`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}), signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("Analysis failed to start");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const ev = JSON.parse(raw) as {
                type: string; stage?: string; message?: string; chars?: number;
                clips?: Clip[]; error?: string;
              };
              if (ev.type === "status") {
                if (ev.stage === "copywriting") {
                  setStage("copywriting"); setMessage(ev.message ?? "Writing copy…"); setProgress(75);
                } else {
                  setMessage(ev.message ?? "");
                  setProgress((p) => Math.min(p + 5, 70));
                }
              } else if (ev.type === "progress") {
                if (ev.stage === "copywriting") {
                  setProgress((p) => Math.min(75 + (ev.chars ?? 0) / 200, 95));
                } else {
                  setProgress((p) => Math.min(40 + (ev.chars ?? 0) / 150, 70));
                }
              } else if (ev.type === "complete") {
                setStage("done"); setProgress(100);
                setTimeout(() => onComplete(ev.clips ?? []), 600);
              } else if (ev.type === "error") {
                throw new Error(ev.error ?? "Analysis failed");
              }
            } catch (pe) {
              if (pe instanceof SyntaxError) continue;
              throw pe;
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStage("error"); setErrorMsg(e instanceof Error ? e.message : "Analysis failed");
      }
    }

    run();
    return () => controller.abort();
  }, [sourceVideoId, onComplete]);

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="text-[16px] font-semibold text-[--text-primary] mb-2">Processing failed</h3>
        <p className="text-[13px] text-[--text-secondary] mb-5 max-w-sm">{errorMsg}</p>
        <Button onClick={onError} variant="secondary" size="sm">Try Again</Button>
      </div>
    );
  }

  const stageOrder = ["transcribe", "analyzing", "copywriting", "done"];
  const currentIdx = stageOrder.indexOf(stage);

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
          <Loader2 size={28} className="text-[#4F46E5] animate-spin" />
        </div>
        <h3 className="text-[17px] font-semibold text-[--text-primary] mb-1">Processing your video</h3>
        <AnimatePresence mode="wait">
          <motion.p key={message} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-[13px] text-[--text-secondary]">{message}</motion.p>
        </AnimatePresence>
      </div>
      <div className="h-2 rounded-full bg-[--bg-subtle] overflow-hidden mb-6">
        <motion.div className="h-full rounded-full" style={{ background: "var(--gradient-primary)" }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <div className="space-y-3">
        {PROCESSING_STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = s.key === stage;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                done ? "bg-emerald-500" : active ? "bg-[#4F46E5]" : "bg-[--bg-subtle] border border-[--border-default]")}>
                {done ? <Check size={10} className="text-white" /> : active ? <Loader2 size={10} className="text-white animate-spin" /> : null}
              </div>
              <span className={cn("text-[13px]",
                done ? "text-emerald-600 line-through" : active ? "text-[--text-primary] font-medium" : "text-[--text-tertiary]")}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Post Panel ───────────────────────────────────────────────────────────────

function PostPanel({
  approvedClips, workspaceId, onDone,
}: {
  approvedClips: Clip[]; workspaceId: string; onDone: () => void;
}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState("");
  const [clipCaptions, setClipCaptions] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const clip of approvedClips) {
      const style = (clip.selectedCaptionStyle ?? "curiosity") as CaptionStyle;
      const variant = clip.captions?.tiktok?.find((v) => v.style === style) ?? clip.captions?.tiktok?.[0] ?? null;
      m[clip.id] = variant?.text ?? clip.suggestedCaption ?? "";
    }
    return m;
  });

  const platformIcons: Record<Platform, React.ElementType> = { INSTAGRAM: Instagram, TIKTOK: Share2, YOUTUBE: Youtube };

  useEffect(() => {
    fetch(`/api/social-accounts?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d: { accounts?: SocialAccount[] }) => setAccounts(d.accounts ?? []))
      .finally(() => setLoadingAccounts(false));
  }, [workspaceId]);

  const grouped = accounts.reduce<Partial<Record<Platform, SocialAccount[]>>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = [];
    acc[a.platform]!.push(a);
    return acc;
  }, {});

  const handlePost = async () => {
    if (selectedAccountIds.length === 0) return;
    setPosting(true); setPostError("");
    try {
      for (const clip of approvedClips) {
        await fetch("/api/publish/bulk", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clipId: clip.id, socialAccountIds: selectedAccountIds, caption: clipCaptions[clip.id] || undefined }),
        });
      }
      setPosted(true);
    } catch { setPostError("Failed to queue posts. Please try again."); }
    finally { setPosting(false); }
  };

  if (posted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <h3 className="text-[18px] font-bold text-[--text-primary] mb-2">Posts queued!</h3>
        <p className="text-[13px] text-[--text-secondary] mb-6">
          {approvedClips.length} clip{approvedClips.length !== 1 ? "s" : ""} queued across {selectedAccountIds.length} account{selectedAccountIds.length !== 1 ? "s" : ""}.
        </p>
        <Button onClick={onDone}>Start New Project</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-[--text-primary] mb-1">
          Post {approvedClips.length} approved clip{approvedClips.length !== 1 ? "s" : ""}
        </h3>
        <p className="text-[12px] text-[--text-secondary]">Review captions and select accounts to post to.</p>
      </div>
      <div className="space-y-3">
        {approvedClips.map((clip) => (
          <div key={clip.id} className="rounded-[10px] border border-[--border-default] bg-[--bg-surface] p-3 flex gap-3">
            <div className="w-12 h-12 rounded-[6px] bg-[--bg-subtle] flex items-center justify-center shrink-0 overflow-hidden">
              {clip.thumbnailPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clip.thumbnailPath} alt="" className="w-full h-full object-cover" />
              ) : <Play size={14} className="text-[--text-tertiary]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[--text-primary] truncate mb-1">{clip.title}</p>
              <textarea value={clipCaptions[clip.id] ?? ""} rows={2}
                onChange={(e) => setClipCaptions((prev) => ({ ...prev, [clip.id]: e.target.value }))}
                className="w-full rounded-[6px] bg-[--bg-input] border border-[--border-default] px-2.5 py-1.5 text-[12px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors resize-none"
                placeholder="Caption…" />
            </div>
          </div>
        ))}
      </div>
      <div>
        <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-2">Post to</label>
        {loadingAccounts ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : accounts.length === 0 ? (
          <p className="text-[13px] text-[--text-secondary] py-4 text-center border border-dashed border-[--border-default] rounded-[8px]">
            No connected accounts. Connect accounts in Social Accounts.
          </p>
        ) : (
          <div className="space-y-3">
            {(Object.keys(grouped) as Platform[]).map((platform) => {
              const PlatformIcon = platformIcons[platform];
              return (
                <div key={platform}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <PlatformIcon size={13} className="text-[--text-tertiary]" />
                    <span className="text-[11px] font-semibold text-[--text-tertiary] uppercase tracking-wide">{platform}</span>
                  </div>
                  <div className="space-y-1">
                    {(grouped[platform] ?? []).map((acc) => (
                      <label key={acc.id} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-[8px] border cursor-pointer transition-all",
                        selectedAccountIds.includes(acc.id) ? "border-[#4F46E5]/40 bg-[#4F46E5]/5" : "border-[--border-default] hover:border-[--border-strong]")}>
                        <input type="checkbox" checked={selectedAccountIds.includes(acc.id)} className="accent-[#4F46E5]"
                          onChange={() => setSelectedAccountIds((prev) => prev.includes(acc.id) ? prev.filter((x) => x !== acc.id) : [...prev, acc.id])} />
                        <div className="h-7 w-7 rounded-full bg-[--bg-subtle] flex items-center justify-center text-[11px] font-bold text-[--text-secondary] shrink-0">
                          {(acc.displayName ?? acc.username)[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[--text-primary] truncate">{acc.displayName ?? acc.username}</p>
                          <p className="text-[11px] text-[--text-tertiary] truncate">@{acc.username}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {postError && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle size={12} />{postError}</p>}
      <Button onClick={handlePost} disabled={selectedAccountIds.length === 0 || posting} loading={posting} className="w-full">
        Post Now
      </Button>
    </div>
  );
}

// ─── Input Step ───────────────────────────────────────────────────────────────

function InputStep({ workspaceId, onSubmit }: { workspaceId: string; onSubmit: (sourceVideoId: string, goal: string) => void }) {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [oEmbed, setOEmbed] = useState<{ title: string; thumbnail_url: string; author_name: string } | null>(null);
  const [oEmbedLoading, setOEmbedLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [goal, setGoal] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [niche, setNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const oEmbedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValidYouTubeUrl = (u: string) =>
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/.test(u);

  const handleUrlChange = (v: string) => {
    setUrl(v);
    setUrlError(v && !isValidYouTubeUrl(v) ? "Please enter a valid YouTube URL" : "");
    setOEmbed(null);
    if (oEmbedTimerRef.current) clearTimeout(oEmbedTimerRef.current);
    if (isValidYouTubeUrl(v)) {
      oEmbedTimerRef.current = setTimeout(async () => {
        setOEmbedLoading(true);
        try {
          const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(v)}&format=json`);
          if (res.ok) setOEmbed(await res.json() as { title: string; thumbnail_url: string; author_name: string });
        } catch { /* ignore */ } finally { setOEmbedLoading(false); }
      }, 700);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) setFile(f);
  };

  const canSubmit = !!goal && (mode === "url" ? isValidYouTubeUrl(url) : !!file);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setSubmitError("");
    try {
      const goalSettings = {
        niche: niche || undefined,
        targetAudience: targetAudience || undefined,
        tone: tone || undefined,
        linkUrl: linkUrl || undefined,
        productName: productName || undefined,
      };
      let sourceVideoId: string;
      if (mode === "url") {
        const res = await fetch("/api/source-videos/youtube", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, url, goal, goalSettings }),
        });
        const data = await res.json() as { sourceVideo?: { id: string }; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to start");
        sourceVideoId = data.sourceVideo!.id;
      } else {
        const formData = new FormData();
        formData.append("workspaceId", workspaceId);
        formData.append("file", file!);
        formData.append("goal", goal);
        formData.append("goalSettings", JSON.stringify(goalSettings));
        const res = await fetch("/api/source-videos/upload", { method: "POST", body: formData });
        const data = await res.json() as { sourceVideo?: { id: string }; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        sourceVideoId = data.sourceVideo!.id;
      }
      onSubmit(sourceVideoId, goal);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to start. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {/* Mode toggle */}
      <div className="flex rounded-[10px] border border-[--border-default] overflow-hidden bg-[--bg-surface]">
        {([["url", Youtube, "YouTube URL"], ["file", Upload, "Upload Video"]] as const).map(([m, Icon, label]) => (
          <button key={m} onClick={() => { setMode(m); setFile(null); setUrl(""); setOEmbed(null); setUrlError(""); }}
            className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all",
              mode === m ? "bg-[--accent-indigo] text-white" : "text-[--text-secondary] hover:text-[--text-primary]")}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* URL input */}
      {mode === "url" && (
        <div className="rounded-[12px] border border-[--border-default] bg-[--bg-surface] p-5 space-y-3">
          <div className="space-y-1.5">
            <input type="url" value={url} onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={cn("h-11 w-full rounded-[var(--radius-md)] bg-[--bg-input] border px-3.5 text-[14px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none transition-all",
                urlError ? "border-red-400" : "border-[--border-default] focus:border-[--accent-indigo] focus:shadow-[0_0_0_4px_rgba(99,102,241,0.10)]")} />
            {urlError && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={11} />{urlError}</p>}
          </div>
          {oEmbedLoading && <div className="flex items-center gap-2 text-[12px] text-[--text-secondary]"><Loader2 size={13} className="animate-spin" />Loading preview…</div>}
          {oEmbed && (
            <div className="flex items-start gap-3 rounded-[8px] bg-[--bg-subtle] border border-[--border-default] p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={oEmbed.thumbnail_url} alt="" className="w-20 h-14 object-cover rounded-[5px] shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[--text-primary] line-clamp-2 leading-snug">{oEmbed.title}</p>
                <p className="text-[11px] text-[--text-tertiary] mt-0.5">{oEmbed.author_name}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File upload */}
      {mode === "file" && (
        <div
          className={cn("rounded-[12px] border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center cursor-pointer transition-all",
            dragging ? "border-[--accent-indigo] bg-[--accent-indigo]/5"
              : file ? "border-emerald-400/50 bg-emerald-500/5"
              : "border-[--border-default] bg-[--bg-surface] hover:border-[--border-strong]")}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", file ? "bg-emerald-500/10" : "bg-[--bg-subtle]")}>
            {file ? <Check size={22} className="text-emerald-500" /> : <Upload size={20} className="text-[--text-tertiary]" />}
          </div>
          <div>
            <p className="text-[14px] font-medium text-[--text-primary]">
              {file ? file.name : "Drop a video here or click to browse"}
            </p>
            <p className="text-[12px] text-[--text-tertiary] mt-0.5">
              {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "MP4, MOV, AVI, MKV up to 500 MB"}
            </p>
          </div>
          {file && (
            <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="text-[11px] text-red-500 hover:text-red-400 transition-colors">Remove</button>
          )}
        </div>
      )}

      {/* Goal selector */}
      <div>
        <label className="text-[13px] font-semibold text-[--text-primary] block mb-2">
          What&apos;s your goal? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GOALS.map((g) => {
            const GoalIcon = g.icon;
            return (
              <button key={g.value} onClick={() => setGoal(g.value)}
                className={cn("flex items-start gap-2.5 p-3 rounded-[10px] border text-left transition-all",
                  goal === g.value ? "border-[#4F46E5]/50 bg-[#4F46E5]/5 text-[--text-primary]"
                    : "border-[--border-default] hover:border-[--border-strong] text-[--text-secondary]")}>
                <GoalIcon size={15} className={cn("mt-0.5 shrink-0", goal === g.value ? "text-[#4F46E5]" : "")} />
                <div>
                  <div className="text-[12px] font-semibold leading-tight">{g.label}</div>
                  <div className="text-[11px] mt-0.5 opacity-70 leading-tight">{g.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced settings */}
      <div>
        <button onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] text-[--text-secondary] hover:text-[--text-primary] transition-colors">
          {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Advanced settings (niche, tone, link…)
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">Niche</label>
                  <select value={niche} onChange={(e) => setNiche(e.target.value)}
                    className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] focus:outline-none focus:border-[--accent-indigo] transition-colors">
                    <option value="">Select niche…</option>
                    {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">Target Audience</label>
                  <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Young professionals"
                    className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">Tone</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)}
                    className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] focus:outline-none focus:border-[--accent-indigo] transition-colors">
                    <option value="">Default</option>
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">Link URL</label>
                  <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://yourlink.com"
                    className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">Product / Brand Name</label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. My Coaching Program"
                    className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {submitError && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle size={12} />{submitError}</p>}

      <Button onClick={handleSubmit} disabled={!canSubmit || submitting} loading={submitting} className="w-full" size="lg">
        <Sparkles size={15} className="mr-2" />Find Viral Clips
      </Button>
    </div>
  );
}

// ─── New Project Tab ──────────────────────────────────────────────────────────

function NewProjectTab({ workspaceId }: { workspaceId: string }) {
  const [step, setStep] = useState(0);
  const [sourceVideoId, setSourceVideoId] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [localClipStatuses, setLocalClipStatuses] = useState<Record<string, ClipStatus>>({});
  const [localClipCopy, setLocalClipCopy] = useState<Record<string, Partial<Clip>>>({});
  const [sortBy, setSortBy] = useState<"viralityScore" | "duration">("viralityScore");
  const [filterType, setFilterType] = useState<"ALL" | ClipType>("ALL");
  const [showChangeGoal, setShowChangeGoal] = useState(false);

  const handleInputSubmit = useCallback((svId: string, g: string) => {
    setSourceVideoId(svId); setGoal(g); setStep(1);
  }, []);

  const handleProcessingComplete = useCallback((newClips: Clip[]) => {
    setClips(newClips); setStep(2);
  }, []);

  const handleProcessingError = useCallback(() => {
    setStep(0); setSourceVideoId(null);
  }, []);

  const handleApprove = useCallback(async (clipId: string) => {
    setLocalClipStatuses((prev) => ({ ...prev, [clipId]: "APPROVED" }));
    await fetch(`/api/clips/${clipId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
  }, []);

  const handleReject = useCallback(async (clipId: string) => {
    setLocalClipStatuses((prev) => ({ ...prev, [clipId]: "REJECTED" }));
    await fetch(`/api/clips/${clipId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
  }, []);

  const handleCopyUpdate = useCallback((clipId: string, updated: Partial<Clip>) => {
    setLocalClipCopy((prev) => ({ ...prev, [clipId]: { ...(prev[clipId] ?? {}), ...updated } }));
  }, []);

  const mergedClips = clips.map((c) => ({
    ...c,
    status: (localClipStatuses[c.id] ?? c.status) as ClipStatus,
    ...(localClipCopy[c.id] ?? {}),
  }));

  const approvedClips = mergedClips.filter((c) => c.status === "APPROVED");

  const filteredClips = mergedClips
    .filter((c) => filterType === "ALL" || c.clipType === filterType)
    .sort((a, b) => sortBy === "viralityScore" ? b.viralityScore - a.viralityScore : b.duration - a.duration);

  const handleGoalChangeDone = (updatedClips: Clip[]) => {
    setClips((prev) => prev.map((c) => updatedClips.find((u) => u.id === c.id) ?? c));
    setLocalClipCopy({});
    setShowChangeGoal(false);
  };

  const handleReset = () => {
    setStep(0); setSourceVideoId(null); setGoal(null);
    setClips([]); setLocalClipStatuses({}); setLocalClipCopy({});
  };

  return (
    <div className="flex flex-col min-h-0">
      <StepIndicator current={step} />

      {step === 0 && <InputStep workspaceId={workspaceId} onSubmit={handleInputSubmit} />}

      {step === 1 && sourceVideoId && (
        <ProcessingView sourceVideoId={sourceVideoId} onComplete={handleProcessingComplete} onError={handleProcessingError} />
      )}

      {step === 2 && (
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-[16px] font-semibold text-[--text-primary]">{mergedClips.length} Clips Found</h3>
              {goal && (
                <p className="text-[12px] text-[--text-secondary] mt-0.5">
                  Goal: <span className="font-medium">{GOALS.find((g) => g.value === goal)?.label ?? goal}</span>
                  {" · "}
                  <button onClick={() => setShowChangeGoal(true)} className="text-[--accent-indigo] hover:underline">
                    Change goal &amp; regenerate
                  </button>
                </p>
              )}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "viralityScore" | "duration")}
              className="h-8 rounded-[8px] bg-[--bg-input] border border-[--border-default] px-2.5 text-[12px] text-[--text-primary] focus:outline-none focus:border-[--accent-indigo] transition-colors">
              <option value="viralityScore">Sort: Virality</option>
              <option value="duration">Sort: Duration</option>
            </select>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {(["ALL", "HOT_TAKE", "EMOTIONAL", "QUOTABLE", "STORY", "REVEAL", "RELATABLE"] as const).map((type) => {
              const count = type === "ALL" ? mergedClips.length : mergedClips.filter((c) => c.clipType === type).length;
              if (type !== "ALL" && count === 0) return null;
              const cfg = type !== "ALL" ? CLIP_TYPE_CONFIG[type] : null;
              return (
                <button key={type} onClick={() => setFilterType(type)}
                  className={cn("px-3 py-1 rounded-full text-[12px] font-medium transition-all border",
                    filterType === type ? "border-[#4F46E5] text-[#4F46E5] bg-[#4F46E5]/10" : "border-[--border-default] text-[--text-secondary] hover:border-[--border-strong]")}
                  style={filterType === type && cfg ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg } : {}}>
                  {type === "ALL" ? "All" : CLIP_TYPE_CONFIG[type].label} ({count})
                </button>
              );
            })}
          </div>

          {/* Clips grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
            {filteredClips.map((clip) => (
              <ReviewClipCard key={clip.id} clip={clip}
                onApprove={handleApprove} onReject={handleReject} onCopyUpdate={handleCopyUpdate} />
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <PostPanel approvedClips={approvedClips} workspaceId={workspaceId} onDone={handleReset} />
      )}

      {/* Batch actions bar */}
      {step === 2 && approvedClips.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-3 bg-[--bg-surface] border border-[--border-default] rounded-[12px] px-4 py-2.5 shadow-xl">
            <span className="text-[13px] font-medium text-[--text-primary]">
              {approvedClips.length} clip{approvedClips.length !== 1 ? "s" : ""} approved
            </span>
            <Button size="sm" onClick={() => setStep(3)}>Post All Approved</Button>
            <button
              onClick={() => setLocalClipStatuses((prev) => {
                const next = { ...prev };
                approvedClips.forEach((c) => delete next[c.id]);
                return next;
              })}
              className="text-[12px] text-[--text-secondary] hover:text-[--text-primary] transition-colors">
              Clear
            </button>
          </motion.div>
        </div>
      )}

      {showChangeGoal && sourceVideoId && (
        <ChangeGoalModal open={showChangeGoal} sourceVideoId={sourceVideoId} currentGoal={goal}
          onDone={handleGoalChangeDone} onClose={() => setShowChangeGoal(false)} />
      )}
    </div>
  );
}

// ─── All Clips Tab ────────────────────────────────────────────────────────────

function AllClipsTab({ workspaceId }: { workspaceId: string }) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClipStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"viralityScore" | "createdAt">("viralityScore");

  const fetchClips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ workspaceId });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("sort", sortBy);
      params.set("limit", "50");
      const res = await fetch(`/api/clips?${params}`);
      if (!res.ok) return;
      const data = await res.json() as { clips?: Clip[] };
      setClips(data.clips ?? []);
    } finally { setLoading(false); }
  }, [workspaceId, statusFilter, sortBy]);

  useEffect(() => { fetchClips(); }, [fetchClips]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {(["ALL", "GENERATED", "APPROVED", "PUBLISHED", "REJECTED"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-1 rounded-full text-[12px] font-medium transition-all border",
                statusFilter === s ? "border-[#4F46E5] text-[#4F46E5] bg-[#4F46E5]/10" : "border-[--border-default] text-[--text-secondary] hover:border-[--border-strong]")}>
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "viralityScore" | "createdAt")}
          className="h-8 rounded-[8px] bg-[--bg-input] border border-[--border-default] px-2.5 text-[12px] text-[--text-primary] focus:outline-none focus:border-[--accent-indigo] transition-colors">
          <option value="viralityScore">Sort: Virality Score</option>
          <option value="createdAt">Sort: Date</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[12px] border border-[--border-default] bg-[--bg-surface] overflow-hidden">
              <Skeleton className="w-full" style={{ aspectRatio: "9/16", maxHeight: 200 }} />
              <div className="p-3 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-full" /></div>
            </div>
          ))}
        </div>
      ) : clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-[20px] flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(59,130,246,0.10))", border: "1px solid rgba(99,102,241,0.20)" }}>
            <Scissors size={28} className="text-[--accent-indigo]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[--text-primary] mb-2">No clips yet</h3>
          <p className="text-[13px] text-[--text-secondary] max-w-[280px] leading-relaxed">Start a new project to generate clips.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clips.map((clip) => <AllClipsCard key={clip.id} clip={clip} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClipFinderPage() {
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"new" | "all">("new");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Clip Finder" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-1 mb-6 border-b border-[--border-subtle]">
            {(["new", "all"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-4 py-2 text-[14px] font-medium transition-all border-b-2 -mb-px",
                  activeTab === tab ? "border-[#4F46E5] text-[#4F46E5]" : "border-transparent text-[--text-secondary] hover:text-[--text-primary]")}>
                {tab === "new" ? "New Project" : "All Clips"}
              </button>
            ))}
          </div>

          {activeTab === "new" ? (
            workspace ? <NewProjectTab workspaceId={workspace.id} /> : (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-2 text-[--text-secondary]">
                  <Clock size={16} /><span className="text-[13px]">Loading workspace…</span>
                </div>
              </div>
            )
          ) : (
            workspace ? <AllClipsTab workspaceId={workspace.id} /> : (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-2 text-[--text-secondary]">
                  <Clock size={16} /><span className="text-[13px]">Loading workspace…</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
