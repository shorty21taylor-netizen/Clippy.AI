"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Play,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Instagram,
  Youtube,
  Upload,
  CheckCircle2,
  Clock,
  TrendingUp,
  Flame,
  Heart,
  Quote,
  BookOpen,
  Lightbulb,
  Smile,
  Share2,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type IngestionStatus =
  | "PENDING"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "ANALYZING"
  | "ANALYZED"
  | "GENERATING"
  | "COMPLETE"
  | "ERROR";

type ClipType =
  | "HOT_TAKE"
  | "EMOTIONAL"
  | "QUOTABLE"
  | "STORY"
  | "REVEAL"
  | "RELATABLE";

type ClipStatus = "GENERATED" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "REJECTED";
type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";

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
}

interface SocialAccount {
  id: string;
  platform: Platform;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// ─── Clip type config ─────────────────────────────────────────────────────────

const CLIP_TYPE_CONFIG: Record<
  ClipType,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  HOT_TAKE:  { label: "Hot Take",  color: "#F97316", bg: "rgba(249,115,22,0.12)", icon: Flame },
  EMOTIONAL: { label: "Emotional", color: "#A855F7", bg: "rgba(168,85,247,0.12)", icon: Heart },
  QUOTABLE:  { label: "Quotable",  color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: Quote },
  STORY:     { label: "Story",     color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: BookOpen },
  REVEAL:    { label: "Reveal",    color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: Lightbulb },
  RELATABLE: { label: "Relatable", color: "#EC4899", bg: "rgba(236,72,153,0.12)", icon: Smile },
};

function getViralityColor(score: number): string {
  if (score >= 9) return "#F59E0B"; // gold
  if (score >= 7) return "#10B981"; // green
  if (score >= 5) return "#EAB308"; // yellow
  return "#71717A"; // gray
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = ["Upload", "Processing", "Review Clips", "Post"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-[#4F46E5] text-white"
                    : "bg-[--bg-subtle] text-[--text-tertiary] border border-[--border-default]"
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  active ? "text-[--text-primary] font-medium" : "text-[--text-tertiary]"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-[2px] mb-5 mx-1 transition-all",
                  i < current ? "bg-emerald-500" : "bg-[--border-default]"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Clip Thumbnail Placeholder ───────────────────────────────────────────────

function ClipThumbnail({ thumbnailPath }: { thumbnailPath: string | null }) {
  return (
    <div
      className="relative w-full bg-[--bg-subtle] flex items-center justify-center"
      style={{ aspectRatio: "9/16", maxHeight: 200 }}
    >
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

// ─── Clip Card (Step 3) ───────────────────────────────────────────────────────

function ReviewClipCard({
  clip,
  onApprove,
  onReject,
}: {
  clip: Clip;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const typeConfig = CLIP_TYPE_CONFIG[clip.clipType];
  const TypeIcon = typeConfig.icon;
  const viralColor = getViralityColor(clip.viralityScore);

  const isApproved = clip.status === "APPROVED";
  const isRejected = clip.status === "REJECTED";

  const durationStr = `${Math.floor(clip.duration / 60)}:${String(clip.duration % 60).padStart(2, "0")}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: isRejected ? 0.4 : 1,
        y: 0,
        scale: 1,
      }}
      whileHover={!isRejected ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-[12px] border overflow-hidden flex flex-col transition-all",
        isApproved
          ? "border-emerald-400/40 bg-emerald-500/5 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]"
          : "border-[--border-default] bg-[--bg-surface] hover:border-[--accent-indigo]/30 hover:shadow-md"
      )}
    >
      {/* Thumbnail */}
      <div className="relative">
        <ClipThumbnail thumbnailPath={clip.thumbnailPath} />
        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
          {durationStr}
        </span>
        {isApproved && (
          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Virality score */}
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} style={{ color: viralColor }} />
          <span className="text-[13px] font-bold" style={{ color: viralColor }}>
            {clip.viralityScore} Virality Score
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-semibold text-[--text-primary] leading-snug line-clamp-2">
          {clip.title}
        </h3>

        {/* Clip type badge */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: typeConfig.bg, color: typeConfig.color }}
          >
            <TypeIcon size={10} />
            {typeConfig.label}
          </span>
        </div>

        {/* Hook preview */}
        {clip.hook && (
          <p className="text-[12px] text-[--text-secondary] italic leading-relaxed line-clamp-2">
            &ldquo;{clip.hook}&rdquo;
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex gap-2 p-3 pt-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={() => onApprove(clip.id)}
          disabled={isApproved}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[8px] text-[12px] font-medium transition-all",
            isApproved
              ? "bg-emerald-500 text-white cursor-default"
              : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 hover:border-emerald-500"
          )}
        >
          <Check size={12} />
          {isApproved ? "Approved" : "Approve"}
        </button>
        <button
          onClick={() => onReject(clip.id)}
          disabled={isRejected}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[8px] text-[12px] font-medium transition-all",
            isRejected
              ? "bg-red-500/10 text-red-400 cursor-default"
              : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500"
          )}
        >
          <X size={12} />
          {isRejected ? "Rejected" : "Reject"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── All Clips Card (Tab 2) ────────────────────────────────────────────────────

function AllClipsCard({ clip }: { clip: Clip }) {
  const typeConfig = CLIP_TYPE_CONFIG[clip.clipType];
  const TypeIcon = typeConfig.icon;
  const viralColor = getViralityColor(clip.viralityScore);
  const durationStr = `${Math.floor(clip.duration / 60)}:${String(clip.duration % 60).padStart(2, "0")}`;

  const statusColors: Record<ClipStatus, { bg: string; color: string }> = {
    GENERATED: { bg: "rgba(99,102,241,0.1)", color: "#6366F1" },
    APPROVED:  { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    SCHEDULED: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    PUBLISHED: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    REJECTED:  { bg: "rgba(239,68,68,0.1)",  color: "#EF4444" },
  };
  const sc = statusColors[clip.status];

  return (
    <div className="rounded-[12px] border border-[--border-default] bg-[--bg-surface] overflow-hidden flex flex-col hover:border-[--accent-indigo]/30 hover:shadow-md transition-all">
      <div className="relative">
        <ClipThumbnail thumbnailPath={clip.thumbnailPath} />
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
          {durationStr}
        </span>
        <span
          className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: sc.bg, color: sc.color }}
        >
          {clip.status}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={11} style={{ color: viralColor }} />
          <span className="text-[12px] font-bold" style={{ color: viralColor }}>
            {clip.viralityScore}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-auto"
            style={{ background: typeConfig.bg, color: typeConfig.color }}
          >
            <TypeIcon size={9} />
            {typeConfig.label}
          </span>
        </div>
        <h3 className="text-[13px] font-semibold text-[--text-primary] leading-snug line-clamp-2">
          {clip.title}
        </h3>
      </div>
    </div>
  );
}

// ─── Processing Stage View ────────────────────────────────────────────────────

const STAGES: { label: string; statuses: IngestionStatus[] }[] = [
  { label: "Downloading video",  statuses: ["TRANSCRIBING"] },
  { label: "Transcribing audio", statuses: ["TRANSCRIBING", "TRANSCRIBED"] },
  { label: "Analyzing content",  statuses: ["ANALYZING", "ANALYZED"] },
  { label: "Generating clips",   statuses: ["GENERATING", "COMPLETE"] },
];

const STATUS_MESSAGES = [
  "Extracting key moments…",
  "Scoring virality potential…",
  "Analyzing hooks and stories…",
  "Identifying emotional peaks…",
  "Finding quotable moments…",
  "Ranking clips by impact…",
];

function ProcessingView({
  status,
  onError,
}: {
  status: IngestionStatus;
  onError: () => void;
}) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const statusProgress: Record<IngestionStatus, number> = {
      PENDING: 5,
      TRANSCRIBING: 20,
      TRANSCRIBED: 40,
      ANALYZING: 55,
      ANALYZED: 70,
      GENERATING: 85,
      COMPLETE: 100,
      ERROR: 0,
    };
    setProgress(statusProgress[status] ?? 10);
  }, [status]);

  if (status === "ERROR") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="text-[16px] font-semibold text-[--text-primary] mb-2">Processing failed</h3>
        <p className="text-[13px] text-[--text-secondary] mb-5">An error occurred while processing your video.</p>
        <Button onClick={onError} variant="secondary" size="sm">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
          <Loader2 size={28} className="text-[#4F46E5] animate-spin" />
        </div>
        <h3 className="text-[17px] font-semibold text-[--text-primary] mb-1">
          Finding your viral clips
        </h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[13px] text-[--text-secondary]"
          >
            {STATUS_MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-[--bg-subtle] overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--gradient-primary)" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {STAGES.map((stage) => {
          const done = stage.statuses.some((s) => {
            const order = ["PENDING","TRANSCRIBING","TRANSCRIBED","ANALYZING","ANALYZED","GENERATING","COMPLETE"];
            return order.indexOf(status) > order.indexOf(s);
          });
          const active = stage.statuses.includes(status);
          return (
            <div key={stage.label} className="flex items-center gap-3">
              <div
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                  done ? "bg-emerald-500" : active ? "bg-[#4F46E5]" : "bg-[--bg-subtle] border border-[--border-default]"
                )}
              >
                {done ? (
                  <Check size={10} className="text-white" />
                ) : active ? (
                  <Loader2 size={10} className="text-white animate-spin" />
                ) : null}
              </div>
              <span
                className={cn(
                  "text-[13px]",
                  done ? "text-emerald-600 line-through" : active ? "text-[--text-primary] font-medium" : "text-[--text-tertiary]"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4: Post Panel ────────────────────────────────────────────────────────

function PostPanel({
  approvedClips,
  workspaceId,
  onDone,
}: {
  approvedClips: Clip[];
  workspaceId: string;
  onDone: () => void;
}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [caption, setCaption] = useState(approvedClips[0]?.suggestedCaption ?? "");
  const [hashtags, setHashtags] = useState(
    (approvedClips[0]?.suggestedHashtags ?? []).join(" ")
  );
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch(`/api/social-accounts?workspaceId=${workspaceId}`);
        if (!res.ok) return;
        const data = await res.json();
        setAccounts(data.accounts ?? []);
      } finally {
        setLoadingAccounts(false);
      }
    }
    fetchAccounts();
  }, [workspaceId]);

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePost = async () => {
    if (selectedAccountIds.length === 0 || approvedClips.length === 0) return;
    setPosting(true);
    setPostError("");
    try {
      // Post each approved clip to selected accounts
      for (const clip of approvedClips) {
        await fetch("/api/publish/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clipId: clip.id,
            socialAccountIds: selectedAccountIds,
            caption: caption || undefined,
            hashtags: hashtags
              .split(/\s+/)
              .filter(Boolean)
              .map((h) => h.replace(/^#/, "")),
          }),
        });
      }
      setPosted(true);
    } catch {
      setPostError("Failed to queue posts. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const platformIcons: Record<Platform, React.ElementType> = {
    INSTAGRAM: Instagram,
    TIKTOK: Share2,
    YOUTUBE: Youtube,
  };

  const grouped = accounts.reduce<Record<Platform, SocialAccount[]>>(
    (acc, a) => {
      if (!acc[a.platform]) acc[a.platform] = [];
      acc[a.platform].push(a);
      return acc;
    },
    {} as Record<Platform, SocialAccount[]>
  );

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
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-[--text-primary] mb-1">
          Ready to post {approvedClips.length} clip{approvedClips.length !== 1 ? "s" : ""}
        </h3>
        <p className="text-[12px] text-[--text-secondary]">
          Select accounts and customize your caption before posting.
        </p>
      </div>

      {/* Approved clips preview */}
      <div className="flex gap-2 flex-wrap">
        {approvedClips.map((clip) => (
          <div
            key={clip.id}
            className="w-16 h-16 rounded-[8px] bg-[--bg-subtle] flex items-center justify-center border border-[--border-default] relative overflow-hidden"
          >
            <Play size={16} className="text-[--text-tertiary]" />
            <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-1 rounded">
              {`${Math.floor(clip.duration / 60)}:${String(clip.duration % 60).padStart(2, "0")}`}
            </span>
          </div>
        ))}
      </div>

      {/* Account selection */}
      <div>
        <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-2">
          Post to
        </label>
        {loadingAccounts ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
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
                    <span className="text-[11px] font-semibold text-[--text-tertiary] uppercase tracking-wide">
                      {platform}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {grouped[platform].map((acc) => (
                      <label
                        key={acc.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-[8px] border cursor-pointer transition-all",
                          selectedAccountIds.includes(acc.id)
                            ? "border-[#4F46E5]/40 bg-[#4F46E5]/5"
                            : "border-[--border-default] hover:border-[--border-strong]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAccountIds.includes(acc.id)}
                          onChange={() => toggleAccount(acc.id)}
                          className="accent-[#4F46E5]"
                        />
                        <div className="h-7 w-7 rounded-full bg-[--bg-subtle] flex items-center justify-center text-[11px] font-bold text-[--text-secondary] shrink-0">
                          {(acc.displayName ?? acc.username)[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[--text-primary] truncate">
                            {acc.displayName ?? acc.username}
                          </p>
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

      {/* Caption */}
      <div>
        <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1.5">
          Caption
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="w-full rounded-[var(--radius-md)] bg-[--bg-input] border border-[--border-default] px-3.5 py-2.5 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors resize-none"
          placeholder="Your caption…"
        />
      </div>

      {/* Hashtags */}
      <div>
        <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1.5">
          Hashtags
        </label>
        <input
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          className="h-9 w-full rounded-[var(--radius-md)] bg-[--bg-input] border border-[--border-default] px-3.5 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors"
          placeholder="#viral #trending #fyp"
        />
      </div>

      {postError && (
        <p className="text-[12px] text-red-500 flex items-center gap-1.5">
          <AlertCircle size={12} />
          {postError}
        </p>
      )}

      <Button
        onClick={handlePost}
        disabled={selectedAccountIds.length === 0 || posting}
        loading={posting}
        className="w-full"
      >
        Post Now
      </Button>
    </div>
  );
}

// ─── Tab 1: New Project Flow ───────────────────────────────────────────────────

function NewProjectTab({ workspaceId }: { workspaceId: string }) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [niche, setNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sourceVideoId, setSourceVideoId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<IngestionStatus>("PENDING");
  const [clips, setClips] = useState<Clip[]>([]);
  const [sortBy, setSortBy] = useState<"viralityScore" | "duration">("viralityScore");
  const [filterType, setFilterType] = useState<"ALL" | ClipType>("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [localClipStatuses, setLocalClipStatuses] = useState<Record<string, ClipStatus>>({});
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processCalledRef = useRef(false);

  const isValidYouTubeUrl = (u: string) =>
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/.test(u);

  const handleUrlChange = (v: string) => {
    setUrl(v);
    if (v && !isValidYouTubeUrl(v)) {
      setUrlError("Please enter a valid YouTube URL");
    } else {
      setUrlError("");
    }
  };

  const handleFindClips = async () => {
    if (!isValidYouTubeUrl(url)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/content/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, url, niche: niche || undefined, targetAudience: targetAudience || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUrlError(data.error ?? "Failed to start processing");
        return;
      }
      setSourceVideoId(data.sourceVideoId);
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger process + poll status when in step 1
  useEffect(() => {
    if (step !== 1 || !sourceVideoId) return;

    // Trigger processing once
    if (!processCalledRef.current) {
      processCalledRef.current = true;
      fetch(`/api/content/${sourceVideoId}/process?workspaceId=${workspaceId}`, {
        method: "POST",
      });
    }

    // Poll status every 2s
    const poll = async () => {
      try {
        const res = await fetch(`/api/content/${sourceVideoId}/status?workspaceId=${workspaceId}`);
        if (!res.ok) return;
        const data = await res.json();
        const sv = data.sourceVideo;
        setProcessingStatus(sv.status);
        if (sv.status === "COMPLETE") {
          setClips(sv.clips ?? []);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => setStep(2), 800);
        } else if (sv.status === "ERROR") {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        // ignore
      }
    };

    pollingRef.current = setInterval(poll, 2000);
    poll();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, sourceVideoId, workspaceId]);

  const handleApprove = useCallback(async (clipId: string) => {
    setLocalClipStatuses((prev) => ({ ...prev, [clipId]: "APPROVED" }));
    await fetch(`/api/clips/${clipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
  }, []);

  const handleReject = useCallback(async (clipId: string) => {
    setLocalClipStatuses((prev) => ({ ...prev, [clipId]: "REJECTED" }));
    await fetch(`/api/clips/${clipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
  }, []);

  const mergedClips = clips.map((c) => ({
    ...c,
    status: localClipStatuses[c.id] ?? c.status,
  }));

  const approvedClips = mergedClips.filter((c) => c.status === "APPROVED");

  const filteredClips = mergedClips
    .filter((c) => filterType === "ALL" || c.clipType === filterType)
    .sort((a, b) =>
      sortBy === "viralityScore"
        ? b.viralityScore - a.viralityScore
        : b.duration - a.duration
    );

  const handleTryAgain = () => {
    processCalledRef.current = false;
    setProcessingStatus("PENDING");
    setStep(0);
    setSourceVideoId(null);
    setClips([]);
    setLocalClipStatuses({});
  };

  return (
    <div className="flex flex-col min-h-0">
      <StepIndicator current={step} />

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="max-w-xl mx-auto w-full space-y-5">
          <div className="rounded-[12px] border border-[--border-default] bg-[--bg-surface] p-6 space-y-4">
            <div>
              <h3 className="text-[15px] font-semibold text-[--text-primary] mb-0.5">
                YouTube URL
              </h3>
              <p className="text-[12px] text-[--text-secondary]">
                Paste any YouTube video URL to find its best viral clips.
              </p>
            </div>
            <div className="space-y-1.5">
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className={cn(
                  "h-11 w-full rounded-[var(--radius-md)] bg-[--bg-input] border px-3.5 text-[14px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none transition-all",
                  urlError
                    ? "border-red-400 focus:border-red-400"
                    : "border-[--border-default] focus:border-[--accent-indigo] focus:shadow-[0_0_0_4px_rgba(99,102,241,0.10)]"
                )}
              />
              {urlError && (
                <p className="text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {urlError}
                </p>
              )}
            </div>
            <Button
              onClick={handleFindClips}
              disabled={!isValidYouTubeUrl(url) || submitting}
              loading={submitting}
              className="w-full"
            >
              Find Viral Clips
            </Button>
          </div>

          {/* File upload (UI only) */}
          <div
            className="rounded-[12px] border-2 border-dashed border-[--border-default] bg-[--bg-surface] p-8 flex flex-col items-center gap-3 text-center cursor-not-allowed opacity-60"
            title="File upload coming soon"
          >
            <div className="h-12 w-12 rounded-full bg-[--bg-subtle] flex items-center justify-center">
              <Upload size={20} className="text-[--text-tertiary]" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[--text-secondary]">Upload a video file</p>
              <p className="text-[12px] text-[--text-tertiary] mt-0.5">MP4, MOV, AVI up to 2GB — Coming soon</p>
            </div>
          </div>

          {/* Advanced settings */}
          <div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Advanced settings
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">
                        Niche
                      </label>
                      <select
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] focus:outline-none focus:border-[--accent-indigo] transition-colors"
                      >
                        <option value="">Select niche…</option>
                        <option value="Entrepreneurship">Entrepreneurship</option>
                        <option value="Fitness">Fitness</option>
                        <option value="Finance">Finance</option>
                        <option value="Technology">Technology</option>
                        <option value="Lifestyle">Lifestyle</option>
                        <option value="Education">Education</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Health">Health</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Food">Food</option>
                        <option value="Travel">Travel</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide block mb-1">
                        Target Audience
                      </label>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. Young professionals 25-35"
                        className="h-9 w-full rounded-[var(--radius-sm)] bg-[--bg-input] border border-[--border-default] px-3 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent-indigo] transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Step 1: Processing */}
      {step === 1 && (
        <ProcessingView status={processingStatus} onError={handleTryAgain} />
      )}

      {/* Step 2: Review Clips */}
      {step === 2 && (
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-[16px] font-semibold text-[--text-primary]">
              {mergedClips.length} Clips Found
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "viralityScore" | "duration")}
                className="h-8 rounded-[8px] bg-[--bg-input] border border-[--border-default] px-2.5 text-[12px] text-[--text-primary] focus:outline-none focus:border-[--accent-indigo] transition-colors"
              >
                <option value="viralityScore">Sort: Virality Score</option>
                <option value="duration">Sort: Duration</option>
              </select>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {(["ALL", "HOT_TAKE", "EMOTIONAL", "QUOTABLE", "STORY", "REVEAL", "RELATABLE"] as const).map(
              (type) => {
                const count =
                  type === "ALL"
                    ? mergedClips.length
                    : mergedClips.filter((c) => c.clipType === type).length;
                if (type !== "ALL" && count === 0) return null;
                const cfg = type !== "ALL" ? CLIP_TYPE_CONFIG[type] : null;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[12px] font-medium transition-all border",
                      filterType === type
                        ? "border-[#4F46E5] text-[#4F46E5] bg-[#4F46E5]/10"
                        : "border-[--border-default] text-[--text-secondary] hover:border-[--border-strong]"
                    )}
                    style={
                      filterType === type && cfg
                        ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg }
                        : {}
                    }
                  >
                    {type === "ALL" ? "All" : CLIP_TYPE_CONFIG[type].label} ({count})
                  </button>
                );
              }
            )}
          </div>

          {/* Clips grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24">
            {filteredClips.map((clip) => (
              <ReviewClipCard
                key={clip.id}
                clip={clip}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Post */}
      {step === 3 && (
        <PostPanel
          approvedClips={approvedClips}
          workspaceId={workspaceId}
          onDone={() => {
            setStep(0);
            setUrl("");
            setSourceVideoId(null);
            setClips([]);
            setLocalClipStatuses({});
            processCalledRef.current = false;
          }}
        />
      )}

      {/* Batch actions bar */}
      {step === 2 && approvedClips.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4">
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-3 bg-[--bg-surface] border border-[--border-default] rounded-[12px] px-4 py-2.5 shadow-xl"
          >
            <span className="text-[13px] font-medium text-[--text-primary]">
              {approvedClips.length} clip{approvedClips.length !== 1 ? "s" : ""} approved
            </span>
            <Button size="sm" onClick={() => setStep(3)}>
              Post All Approved
            </Button>
            <button
              onClick={() => {
                setLocalClipStatuses({});
                // Also reset via API
                approvedClips.forEach((c) => {
                  fetch(`/api/clips/${c.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "GENERATED" }),
                  });
                });
              }}
              className="text-[12px] text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              Clear
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: All Clips ─────────────────────────────────────────────────────────

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
      const data = await res.json();
      setClips(data.clips ?? []);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, statusFilter, sortBy]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const statuses: Array<ClipStatus | "ALL"> = ["ALL", "GENERATED", "APPROVED", "PUBLISHED", "REJECTED"];

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-[12px] font-medium transition-all border",
                statusFilter === s
                  ? "border-[#4F46E5] text-[#4F46E5] bg-[#4F46E5]/10"
                  : "border-[--border-default] text-[--text-secondary] hover:border-[--border-strong]"
              )}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "viralityScore" | "createdAt")}
          className="h-8 rounded-[8px] bg-[--bg-input] border border-[--border-default] px-2.5 text-[12px] text-[--text-primary] focus:outline-none focus:border-[--accent-indigo] transition-colors"
        >
          <option value="viralityScore">Sort: Virality Score</option>
          <option value="createdAt">Sort: Date</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[12px] border border-[--border-default] bg-[--bg-surface] overflow-hidden">
              <Skeleton className="w-full" style={{ aspectRatio: "9/16", maxHeight: 200 }} />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="h-16 w-16 rounded-[20px] flex items-center justify-center mb-5"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(59,130,246,0.10))",
              border: "1px solid rgba(99,102,241,0.20)",
            }}
          >
            <Scissors size={28} className="text-[--accent-indigo]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[--text-primary] mb-2">No clips yet</h3>
          <p className="text-[13px] text-[--text-secondary] max-w-[280px] leading-relaxed">
            Start a new project to generate clips.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clips.map((clip) => (
            <AllClipsCard key={clip.id} clip={clip} />
          ))}
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
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-[--border-subtle]">
            {(["new", "all"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-[14px] font-medium transition-all border-b-2 -mb-px",
                  activeTab === tab
                    ? "border-[#4F46E5] text-[#4F46E5]"
                    : "border-transparent text-[--text-secondary] hover:text-[--text-primary]"
                )}
              >
                {tab === "new" ? "New Project" : "All Clips"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "new" ? (
            workspace ? (
              <NewProjectTab workspaceId={workspace.id} />
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-2 text-[--text-secondary]">
                  <Clock size={16} />
                  <span className="text-[13px]">Loading workspace…</span>
                </div>
              </div>
            )
          ) : (
            workspace ? (
              <AllClipsTab workspaceId={workspace.id} />
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-2 text-[--text-secondary]">
                  <Clock size={16} />
                  <span className="text-[13px]">Loading workspace…</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
