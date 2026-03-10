"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wand2,
  Square,
  Save,
  CheckCircle2,
  Upload,
  FileVideo,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StreamOutput } from "@/components/content/stream-output";
import { PlatformIcon } from "@/components/social-accounts/platform-icon";
import { useContentStream, type GeneratedContent } from "@/hooks/use-content-stream";
import { useWorkspace } from "@/lib/workspace-context";

type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";

// ─── Video upload area ────────────────────────────────────────────────────────
interface VideoUploadProps {
  onUrl: (url: string) => void;
  workspaceId: string;
}

function VideoUpload({ onUrl, workspaceId }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    async (f: File) => {
      const allowed = ["video/mp4", "video/mov", "video/quicktime", "video/webm"];
      if (!allowed.includes(f.type)) {
        setError("Please upload an MP4, MOV, or WebM video file.");
        return;
      }
      if (f.size > 500 * 1024 * 1024) {
        setError("File must be under 500 MB.");
        return;
      }

      setFile(f);
      setError("");
      setUploading(true);

      try {
        // Get presigned URL
        const res = await fetch("/api/content/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            filename: f.name,
            contentType: f.type,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Upload failed. Configure AWS S3 settings.");
          return;
        }

        const { uploadUrl, fileUrl } = await res.json();

        // Upload directly to S3
        await fetch(uploadUrl, {
          method: "PUT",
          body: f,
          headers: { "Content-Type": f.type },
        });

        onUrl(fileUrl);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [workspaceId, onUrl]
  );

  return (
    <div className="space-y-2">
      {!file ? (
        <label
          className="flex flex-col items-center gap-2 rounded-[--radius-md] border border-dashed border-[--border-default] px-4 py-6 cursor-pointer hover:border-[--accent]/40 hover:bg-[--accent-muted] transition-all"
        >
          <Upload size={18} className="text-[--text-tertiary]" />
          <span className="text-xs text-[--text-secondary] text-center">
            Drop a video, or{" "}
            <span className="text-[--accent]">click to browse</span>
            <br />
            MP4, MOV, WebM · max 500 MB
          </span>
          <input
            type="file"
            accept="video/mp4,video/mov,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] px-3 py-2.5">
          <FileVideo size={16} className="text-[--accent] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[--text-primary] truncate">{file.name}</p>
            <p className="text-xs text-[--text-secondary]">
              {uploading ? "Uploading…" : "Ready"}
            </p>
          </div>
          <button
            onClick={() => {
              setFile(null);
              setError("");
            }}
            className="text-[--text-tertiary] hover:text-[--text-secondary]"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <p className="text-xs text-[--status-error] flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Main creation page ───────────────────────────────────────────────────────
export default function NewContentPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();

  const [platform, setPlatform] = useState<Platform>("INSTAGRAM");
  const [inputMode, setInputMode] = useState<"text" | "video">("text");
  const [rawText, setRawText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const {
    generate,
    content,
    rawText: streamRaw,
    isStreaming,
    error: streamError,
    stop,
    reset,
    setContent,
  } = useContentStream();

  const rawInput = inputMode === "text" ? rawText : videoUrl;
  const canGenerate = Boolean(rawInput.trim()) && !isStreaming;
  const hasContent = Object.values(content).some((v) => v.length > 0);

  const handleGenerate = useCallback(async () => {
    if (!workspace || !rawInput.trim()) return;
    reset();
    await generate({
      workspaceId: workspace.id,
      platform,
      rawInput: rawInput.trim(),
    });
  }, [workspace, platform, rawInput, generate, reset]);

  const handleSave = useCallback(
    async (status: "DRAFT" | "APPROVED" = "DRAFT") => {
      if (!workspace || !rawInput.trim()) return;
      setSaving(true);
      setSaveError("");

      // Parse hashtags from the hashtags string
      const hashtagList = content.hashtags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean);

      try {
        const res = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: workspace.id,
            platform,
            rawInput,
            title: title || content.youtubeTitle || content.hook?.slice(0, 80) || "Untitled",
            hook: content.hook || null,
            caption: content.caption || null,
            hashtags: hashtagList,
            cta: content.cta || null,
            scriptShort: content.script || null,
            youtubeTitle: content.youtubeTitle || null,
            thumbnailText: content.thumbnailText || null,
            status,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setSaveError(data.error ?? "Save failed.");
          return;
        }

        const { piece } = await res.json();
        router.push(`/dashboard/content/${piece.id}`);
      } catch {
        setSaveError("Network error. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [workspace, platform, rawInput, content, title, router]
  );

  const handleContentChange = useCallback(
    (field: keyof GeneratedContent, val: string) => {
      setContent((prev) => ({ ...prev, [field]: val }));
    },
    [setContent]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-[--border-subtle] shrink-0">
        <Link
          href="/dashboard/content"
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
        <div className="h-4 w-px bg-[--border-subtle]" />
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} size={16} />
          <span className="text-sm font-medium text-[--text-primary]">
            New content
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {hasContent && !isStreaming && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSave("DRAFT")}
                loading={saving}
              >
                <Save size={13} />
                Save draft
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave("APPROVED")}
                loading={saving}
              >
                <CheckCircle2 size={13} />
                Save &amp; approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Split pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: input form ───────────────────────────────────────────── */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-[--border-subtle] overflow-y-auto">
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[--text-primary] mb-0.5">
                Content input
              </h2>
              <p className="text-xs text-[--text-secondary]">
                Paste a raw script, idea, or upload a video — Claude will generate
                platform-optimized content.
              </p>
            </div>

            {/* Platform */}
            <Select
              label="Platform"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value as Platform);
                reset();
              }}
            >
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
            </Select>

            {/* Input mode toggle */}
            <div>
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                Input type
              </span>
              <div className="mt-1.5 flex rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] p-1">
                {(["text", "video"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className={cn(
                      "flex-1 rounded-[6px] py-1.5 text-sm font-medium transition-all duration-150",
                      inputMode === mode
                        ? "bg-[--accent] text-white shadow-sm"
                        : "text-[--text-secondary] hover:text-[--text-primary]"
                    )}
                  >
                    {mode === "text" ? "Text / Script" : "Video URL"}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            {inputMode === "text" ? (
              <div>
                <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                  Raw script or idea
                </span>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Paste your raw content here…\n\nExamples:\n- A transcript from a voice note\n- Key talking points\n- An existing caption to repurpose\n- A content idea you want to expand`}
                  rows={10}
                  className="mt-1.5 w-full rounded-[--radius-md] bg-[--bg-input] border border-[--border-subtle] px-3.5 py-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent] transition-colors resize-none leading-relaxed"
                />
              </div>
            ) : (
              <div>
                <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                  Video upload
                </span>
                <div className="mt-1.5">
                  {workspace && (
                    <VideoUpload
                      workspaceId={workspace.id}
                      onUrl={(url) => setVideoUrl(url)}
                    />
                  )}
                  {videoUrl && (
                    <p className="mt-2 text-xs text-[--status-success] break-all">
                      ✓ Uploaded: {videoUrl.split("/").pop()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Optional title */}
            <div>
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                Internal title <span className="normal-case font-normal">(optional)</span>
              </span>
              <input
                type="text"
                placeholder="e.g. Summer campaign — hook A"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-[--radius-md] bg-[--bg-input] border border-[--border-subtle] px-3.5 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent] transition-colors"
              />
            </div>

            {/* Generate button */}
            <div className="space-y-2">
              {isStreaming ? (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={stop}
                  className="w-full"
                >
                  <Square size={14} />
                  Stop generation
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="w-full"
                >
                  <Wand2 size={14} />
                  Generate with Claude
                </Button>
              )}

              {(streamError || saveError) && (
                <p className="text-xs text-[--status-error] flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {streamError ?? saveError}
                </p>
              )}

              {hasContent && !isStreaming && (
                <p className="text-xs text-center text-[--text-tertiary]">
                  You can edit the generated content on the right before saving.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: streaming output ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto p-6">
            <StreamOutput
              content={content}
              platform={platform}
              rawText={streamRaw}
              isStreaming={isStreaming}
              editMode={hasContent && !isStreaming}
              onChange={handleContentChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny cn inline — avoids import cycle
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
