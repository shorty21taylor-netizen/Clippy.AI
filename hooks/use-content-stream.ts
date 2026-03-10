"use client";

import { useState, useCallback, useRef } from "react";

export interface GeneratedContent {
  hook: string;
  caption: string;
  hashtags: string;
  cta: string;
  script: string;
  youtubeTitle: string;
  thumbnailText: string;
}

export const EMPTY_CONTENT: GeneratedContent = {
  hook: "",
  caption: "",
  hashtags: "",
  cta: "",
  script: "",
  youtubeTitle: "",
  thumbnailText: "",
};

type SectionKey = keyof GeneratedContent;

// Map XML-style tags in Claude's output → content fields
const SECTION_MAP: Record<string, SectionKey> = {
  HOOK: "hook",
  CAPTION: "caption",
  HASHTAGS: "hashtags",
  CTA: "cta",
  SCRIPT: "script",
  YOUTUBE_TITLE: "youtubeTitle",
  THUMBNAIL_TEXT: "thumbnailText",
};

function parseContent(raw: string): GeneratedContent {
  const result = { ...EMPTY_CONTENT };

  for (const [tag, key] of Object.entries(SECTION_MAP)) {
    const openTag = `[${tag}]`;
    const closeTag = `[/${tag}]`;
    const start = raw.indexOf(openTag);
    if (start === -1) continue;

    const end = raw.indexOf(closeTag, start);
    if (end === -1) {
      // Section is still being written — show what's accumulated so far
      result[key] = raw.slice(start + openTag.length);
    } else {
      result[key] = raw.slice(start + openTag.length, end).trim();
    }
  }

  return result;
}

export interface UseContentStreamReturn {
  generate: (params: {
    workspaceId: string;
    platform: string;
    rawInput: string;
  }) => Promise<void>;
  content: GeneratedContent;
  rawText: string;
  isStreaming: boolean;
  error: string | null;
  stop: () => void;
  reset: () => void;
  setContent: React.Dispatch<React.SetStateAction<GeneratedContent>>;
}

export function useContentStream(): UseContentStreamReturn {
  const [rawText, setRawText] = useState("");
  const [content, setContent] = useState<GeneratedContent>(EMPTY_CONTENT);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setRawText("");
    setContent(EMPTY_CONTENT);
    setError(null);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const generate = useCallback(
    async (params: {
      workspaceId: string;
      platform: string;
      rawInput: string;
    }) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setRawText("");
      setContent(EMPTY_CONTENT);
      setIsStreaming(true);
      setError(null);

      try {
        const res = await fetch("/api/content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Generation failed. Please try again.");
          return;
        }

        if (!res.body) {
          setError("No response body from server.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last (possibly incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                return;
              }
              if (typeof parsed.text === "string") {
                accumulated += parsed.text;
                setRawText(accumulated);
                setContent(parseContent(accumulated));
              }
            } catch {
              // Ignore malformed SSE frames
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Network error. Please check your connection and try again.");
        }
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { generate, content, rawText, isStreaming, error, stop, reset, setContent };
}
