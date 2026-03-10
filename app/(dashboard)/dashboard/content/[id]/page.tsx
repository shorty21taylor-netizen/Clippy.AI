"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wand2,
  Square,
  Save,
  CheckCircle2,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StreamOutput } from "@/components/content/stream-output";
import { PlatformIcon } from "@/components/social-accounts/platform-icon";
import { useContentStream, type GeneratedContent, EMPTY_CONTENT } from "@/hooks/use-content-stream";
import { useWorkspace } from "@/lib/workspace-context";
import { formatDate } from "@/lib/utils";

type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
type ContentStatus = "DRAFT" | "APPROVED" | "SCHEDULED" | "POSTED";

interface FullContentPiece {
  id: string;
  workspaceId: string;
  platform: Platform;
  title: string | null;
  rawInput: string;
  hook: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  scriptShort: string | null;
  youtubeTitle: string | null;
  thumbnailText: string | null;
  status: ContentStatus;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "POSTED", label: "Posted" },
];

const STATUS_VARIANT: Record<ContentStatus, "default" | "success" | "pending" | "accent"> = {
  DRAFT: "default",
  APPROVED: "success",
  SCHEDULED: "pending",
  POSTED: "accent",
};

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { workspace } = useWorkspace();

  const [piece, setPiece] = useState<FullContentPiece | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<ContentStatus>("DRAFT");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable content state (initialized from DB)
  const [editContent, setEditContent] = useState<GeneratedContent>(EMPTY_CONTENT);

  // Regeneration
  const {
    generate,
    content: streamContent,
    rawText: streamRaw,
    isStreaming,
    error: streamError,
    stop,
    setContent: setStreamContent,
  } = useContentStream();
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Load piece
  useEffect(() => {
    if (!workspace) return;

    const fetchPiece = async () => {
      const res = await fetch(`/api/content/${id}?workspaceId=${workspace.id}`);
      if (!res.ok) {
        setLoadError("Content piece not found.");
        return;
      }
      const data = await res.json();
      const p: FullContentPiece = data.piece;
      setPiece(p);
      setStatus(p.status);
      setEditContent({
        hook: p.hook ?? "",
        caption: p.caption ?? "",
        hashtags: p.hashtags.map((h) => `#${h}`).join(" "),
        cta: p.cta ?? "",
        script: p.scriptShort ?? "",
        youtubeTitle: p.youtubeTitle ?? "",
        thumbnailText: p.thumbnailText ?? "",
      });
    };

    fetchPiece();
  }, [workspace, id]);

  const activeContent = isRegenerating ? streamContent : editContent;

  const handleContentChange = useCallback(
    (field: keyof GeneratedContent, val: string) => {
      if (isRegenerating) {
        setStreamContent((prev) => ({ ...prev, [field]: val }));
      } else {
        setEditContent((prev) => ({ ...prev, [field]: val }));
      }
    },
    [isRegenerating, setStreamContent]
  );

  const handleRegenerate = useCallback(async () => {
    if (!workspace || !piece) return;
    setIsRegenerating(true);
    await generate({
      workspaceId: workspace.id,
      platform: piece.platform,
      rawInput: piece.rawInput,
    });
  }, [workspace, piece, generate]);

  // When regeneration finishes, commit to editContent
  useEffect(() => {
    if (isRegenerating && !isStreaming) {
      const hasContent = Object.values(streamContent).some((v) => v.length > 0);
      if (hasContent) {
        setEditContent(streamContent);
      }
      setIsRegenerating(false);
    }
  }, [isRegenerating, isStreaming, streamContent]);

  const handleSave = async () => {
    if (!workspace || !piece) return;
    setSaving(true);
    setSaveError("");

    const hashtagList = activeContent.hashtags
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#/, "").trim().toLowerCase())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          hook: activeContent.hook || null,
          caption: activeContent.caption || null,
          hashtags: hashtagList,
          cta: activeContent.cta || null,
          scriptShort: activeContent.script || null,
          youtubeTitle: activeContent.youtubeTitle || null,
          thumbnailText: activeContent.thumbnailText || null,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Save failed.");
        return;
      }

      const data = await res.json();
      setPiece((prev) => prev ? { ...prev, ...data.piece } : null);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/content/${id}?workspaceId=${workspace.id}`, {
        method: "DELETE",
      });
      if (res.ok) router.push("/dashboard/content");
    } finally {
      setDeleting(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <AlertCircle size={32} className="text-[--status-error]" />
        <p className="text-[--text-primary] font-medium">{loadError}</p>
        <Link href="/dashboard/content">
          <Button variant="secondary" size="md">
            <ArrowLeft size={14} /> Back to library
          </Button>
        </Link>
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[--text-tertiary]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-[--border-subtle] shrink-0 flex-wrap">
        <Link
          href="/dashboard/content"
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
        >
          <ArrowLeft size={15} />
          Library
        </Link>
        <div className="h-4 w-px bg-[--border-subtle]" />
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon platform={piece.platform} size={16} />
          <span className="text-sm font-medium text-[--text-primary] truncate max-w-[240px]">
            {piece.youtubeTitle ?? piece.title ?? piece.hook?.slice(0, 60) ?? "Untitled"}
          </span>
          <Badge variant={STATUS_VARIANT[piece.status]}>{piece.status.charAt(0) + piece.status.slice(1).toLowerCase()}</Badge>
        </div>
        <div className="ml-auto flex items-center gap-2.5 flex-wrap">
          <span className="text-xs text-[--text-tertiary]">
            {formatDate(piece.updatedAt)}
          </span>

          {isRegenerating ? (
            <Button variant="secondary" size="sm" onClick={stop}>
              <Square size={13} />
              Stop
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleRegenerate}>
              <Wand2 size={13} />
              Regenerate
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={13} />
          </Button>

          <Button size="sm" loading={saving} onClick={handleSave}>
            <Save size={13} />
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: metadata controls ───────────────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-[--border-subtle] overflow-y-auto">
          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide mb-1">
                Platform
              </p>
              <div className="flex items-center gap-2 rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] px-3 py-2.5">
                <PlatformIcon platform={piece.platform} size={16} />
                <span className="text-sm text-[--text-primary]">
                  {piece.platform.charAt(0) + piece.platform.slice(1).toLowerCase()}
                </span>
              </div>
            </div>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            {/* Raw input preview */}
            <div>
              <p className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide mb-1.5">
                Original input
              </p>
              <div className="rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] p-3 max-h-40 overflow-y-auto">
                <p className="text-xs text-[--text-secondary] whitespace-pre-wrap leading-relaxed">
                  {piece.rawInput.startsWith("http")
                    ? `🎥 ${piece.rawInput}`
                    : piece.rawInput}
                </p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-1.5 text-xs text-[--text-tertiary]">
              <p>Created {formatDate(piece.createdAt)}</p>
              <p>Updated {formatDate(piece.updatedAt)}</p>
            </div>

            {saveError && (
              <p className="text-xs text-[--status-error] flex items-center gap-1">
                <AlertCircle size={11} /> {saveError}
              </p>
            )}

            {streamError && (
              <p className="text-xs text-[--status-error] flex items-center gap-1">
                <AlertCircle size={11} /> {streamError}
              </p>
            )}

            {/* Hashtag count indicator */}
            {activeContent.hashtags && (
              <div className="rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] p-3">
                <p className="text-xs text-[--text-secondary]">
                  <span className="font-medium text-[--text-primary]">
                    {
                      activeContent.hashtags
                        .split(/[\s,]+/)
                        .filter((t) => t.startsWith("#")).length
                    }
                  </span>{" "}
                  hashtags
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: content editor ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto p-6">
            <StreamOutput
              content={activeContent}
              platform={piece.platform}
              rawText={isRegenerating ? streamRaw : ""}
              isStreaming={isRegenerating && isStreaming}
              editMode={!isStreaming}
              onChange={handleContentChange}
            />
          </div>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.95, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-[--radius-xl] bg-[--bg-modal] border border-[--border-default] p-6 shadow-[0_8px_48px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-[--status-error-muted] flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-[--status-error]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[--text-primary]">
                Delete content piece?
              </h3>
            </div>
            <p className="text-sm text-[--text-secondary] mb-5">
              This content will be permanently deleted along with all publish logs.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-10 rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-10 rounded-[--radius-md] bg-[--status-error] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
