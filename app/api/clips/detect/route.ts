import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  CLIP_DETECTION_SYSTEM_PROMPT,
  buildClipDetectionPrompt,
} from "@/lib/prompts/clip-detection";
import { requireWorkspaceMember } from "@/lib/workspace";
import { db } from "@/lib/db";

const bodySchema = z.object({
  workspaceId:    z.string().min(1),
  transcript:     z.string().min(100, "Transcript must be at least 100 characters"),
  videoTitle:     z.string().max(200).optional(),
  channelName:    z.string().max(100).optional(),
  niche:          z.string().max(100).optional(),
  targetAudience: z.string().max(150).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { workspaceId, transcript, videoTitle, channelName, niche, targetAudience } =
    parsed.data;

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
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

  const userPrompt = buildClipDetectionPrompt({
    transcript,
    videoTitle,
    channelName,
    niche,
    targetAudience,
  });

  let rawJson: string;
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8000,
      thinking: { type: "enabled", budget_tokens: 5000 },
      system: CLIP_DETECTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract only text blocks (skip thinking blocks)
    rawJson = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    console.error("Anthropic error:", err);
    return NextResponse.json(
      { error: "AI generation failed. Please try again." },
      { status: 502 }
    );
  }

  // Parse the JSON response
  let result: {
    video_summary: string;
    total_duration_seconds: number;
    clips: unknown[];
  };
  try {
    // Strip any accidental markdown fences
    const cleaned = rawJson.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    result = JSON.parse(cleaned);
  } catch {
    console.error("JSON parse failed. Raw output:", rawJson.slice(0, 500));
    return NextResponse.json(
      { error: "AI returned malformed JSON. Please try again." },
      { status: 502 }
    );
  }

  // Persist to DB
  const detection = await db.clipDetection.create({
    data: {
      workspaceId,
      videoTitle:     videoTitle ?? null,
      channelName:    channelName ?? null,
      niche:          niche ?? null,
      targetAudience: targetAudience ?? null,
      videoSummary:   result.video_summary ?? null,
      totalDuration:  result.total_duration_seconds ?? null,
      clipsJson:      (result.clips ?? []) as object[],
      clipsCount:     Array.isArray(result.clips) ? result.clips.length : 0,
    },
  });

  return NextResponse.json({ detection, clips: result.clips, videoSummary: result.video_summary }, { status: 201 });
}
