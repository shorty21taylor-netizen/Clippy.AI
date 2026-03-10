import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  CLIP_DETECTION_SYSTEM_PROMPT,
  buildClipDetectionPrompt,
} from "@/lib/prompts/clip-detection";
import type { ClipType } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const CLIP_TYPE_MAP: Record<string, ClipType> = {
  hot_take: "HOT_TAKE",
  emotional: "EMOTIONAL",
  quotable: "QUOTABLE",
  story: "STORY",
  reveal: "REVEAL",
  relatable: "RELATABLE",
};

interface ClipResult {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  virality_score: number;
  virality_reason: string;
  clip_type: string;
  hook: string;
  suggested_caption: string;
  suggested_hashtags: string[];
  transcript_excerpt: string;
  needs_trim_start: number;
  needs_trim_end: number;
}

// POST /api/source-videos/[id]/analyze — SSE stream
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    videoTitle?: string;
    channelName?: string;
    niche?: string;
    targetAudience?: string;
  };

  const video = await db.sourceVideo.findUnique({ where: { id } });
  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(video.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  if (!video.transcript) {
    return NextResponse.json(
      { error: "Video must be transcribed first." },
      { status: 400 }
    );
  }

  let client: ReturnType<typeof getAnthropicClient>;
  try {
    client = getAnthropicClient();
  } catch {
    return NextResponse.json(
      { error: "AI service not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  await db.sourceVideo.update({
    where: { id },
    data: { status: "ANALYZING", errorMessage: null },
  });

  const userPrompt = buildClipDetectionPrompt({
    transcript: video.transcript,
    videoTitle: body.videoTitle || video.title,
    channelName: body.channelName,
    niche: body.niche,
    targetAudience: body.targetAudience,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let rawJson = "";
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "status", message: "Analyzing transcript with Claude..." })}\n\n`
          )
        );

        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          thinking: { type: "enabled", budget_tokens: 4000 },
          system: CLIP_DETECTION_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            rawJson += event.delta.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "progress", chars: rawJson.length })}\n\n`
              )
            );
          }
        }

        // Parse JSON response
        const cleaned = rawJson.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
        const result = JSON.parse(cleaned) as {
          video_summary: string;
          total_duration_seconds: number;
          clips: ClipResult[];
        };

        // Create Clip records in the database
        const clipRecords = await db.$transaction(
          result.clips.map((c) =>
            db.clip.create({
              data: {
                sourceVideoId: id,
                title: c.title,
                startTime: c.start_time,
                endTime: c.end_time,
                duration: c.duration_seconds,
                viralityScore: c.virality_score,
                clipType: CLIP_TYPE_MAP[c.clip_type] || "QUOTABLE",
                hook: c.hook || null,
                suggestedCaption: c.suggested_caption || null,
                suggestedHashtags: c.suggested_hashtags || [],
                viralityReason: c.virality_reason || null,
                transcriptExcerpt: c.transcript_excerpt || null,
                status: "GENERATED",
              },
            })
          )
        );

        // Update source video
        await db.sourceVideo.update({
          where: { id },
          data: {
            status: "ANALYZED",
            clipAnalysis: result as object,
          },
        });

        // Update title if provided in analysis
        if (body.videoTitle) {
          await db.sourceVideo.update({
            where: { id },
            data: { title: body.videoTitle },
          });
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              videoSummary: result.video_summary,
              clipsCount: clipRecords.length,
              clips: clipRecords,
            })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `AI error (${err.status}): ${err.message}`
            : err instanceof SyntaxError
            ? "AI returned malformed JSON. Please try again."
            : err instanceof Error
            ? err.message
            : "Analysis failed.";

        console.error("Analysis error:", message);
        await db.sourceVideo.update({
          where: { id },
          data: { status: "ERROR", errorMessage: message },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
