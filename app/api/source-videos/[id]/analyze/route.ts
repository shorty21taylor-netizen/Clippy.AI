import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  CLIP_DETECTION_SYSTEM_PROMPT,
  buildClipDetectionPrompt,
} from "@/lib/prompts/clip-detection";
import {
  CLIP_COPYWRITING_SYSTEM_PROMPT,
  buildCopywritingPrompt,
  type CopywritingResponse,
} from "@/lib/prompts/clip-copywriting";
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

  // Extract goal settings stored on the video record
  const goalSettings = (video.goalSettings ?? {}) as {
    niche?: string;
    targetAudience?: string;
    tone?: string;
    linkUrl?: string;
    productName?: string;
    customGoalText?: string;
  };

  const userPrompt = buildClipDetectionPrompt({
    transcript: video.transcript,
    videoTitle: body.videoTitle || video.title,
    channelName: body.channelName,
    niche: body.niche || goalSettings.niche,
    targetAudience: body.targetAudience || goalSettings.targetAudience,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let rawJson = "";
      try {
        send({ type: "status", stage: "analyzing", message: "Finding viral moments with AI..." });

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
            send({ type: "progress", stage: "analyzing", chars: rawJson.length });
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
                goal: video.goal || null,
                status: "GENERATED",
              },
            })
          )
        );

        send({ type: "status", stage: "analyzing", message: `Found ${clipRecords.length} viral moments. Writing copy...` });

        // ─── Stage 4: Copywriting ─────────────────────────────────────────────
        // Only if the video has a goal (new flow) and we have an Anthropic client
        if (video.goal && clipRecords.length > 0) {
          send({ type: "status", stage: "copywriting", message: "Writing hooks, captions, and CTAs with AI..." });

          try {
            const copyPrompt = buildCopywritingPrompt({
              clips: clipRecords.map((c, i) => ({
                id: i + 1,
                transcript_excerpt: c.transcriptExcerpt || c.title,
                clip_type: c.clipType.toLowerCase(),
                title: c.title,
              })),
              goal: video.goal,
              customGoalText: goalSettings.customGoalText,
              niche: goalSettings.niche,
              targetAudience: goalSettings.targetAudience,
              tone: goalSettings.tone,
              linkUrl: goalSettings.linkUrl,
              productName: goalSettings.productName,
            });

            let copyJson = "";
            const copyStream = client.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: 8000,
              system: CLIP_COPYWRITING_SYSTEM_PROMPT,
              messages: [{ role: "user", content: copyPrompt }],
            });

            for await (const event of copyStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                copyJson += event.delta.text;
                send({ type: "progress", stage: "copywriting", chars: copyJson.length });
              }
            }

            const cleanedCopy = copyJson.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
            const copyResult = JSON.parse(cleanedCopy) as CopywritingResponse;

            // Update each clip with the copy data
            await db.$transaction(
              copyResult.clips.map((copyClip, i) => {
                const dbClip = clipRecords[i];
                if (!dbClip) return db.clip.update({ where: { id: clipRecords[0].id }, data: {} });
                return db.clip.update({
                  where: { id: dbClip.id },
                  data: {
                    hookText: copyClip.hook_text || null,
                    captions: copyClip.captions as object,
                    hashtagSets: copyClip.hashtags as object,
                    selectedCaptionStyle: "curiosity",
                  },
                });
              })
            );

            send({ type: "status", stage: "copywriting", message: "Copy written for all clips." });
          } catch (copyErr) {
            // Copywriting failure is non-fatal — clips still exist without copy
            console.error("Copywriting stage failed:", copyErr);
            send({ type: "warning", message: "Copy generation failed. You can regenerate per-clip later." });
          }
        }

        // Update source video to ANALYZED
        await db.sourceVideo.update({
          where: { id },
          data: {
            status: "ANALYZED",
            clipAnalysis: result as object,
          },
        });

        if (body.videoTitle) {
          await db.sourceVideo.update({
            where: { id },
            data: { title: body.videoTitle },
          });
        }

        // Fetch updated clips with copy data
        const updatedClips = await db.clip.findMany({
          where: { sourceVideoId: id },
          orderBy: { viralityScore: "desc" },
        });

        send({
          type: "complete",
          videoSummary: result.video_summary,
          clipsCount: clipRecords.length,
          clips: updatedClips,
        });
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

        send({ type: "error", error: message });
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
