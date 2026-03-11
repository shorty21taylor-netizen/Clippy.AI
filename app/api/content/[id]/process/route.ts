import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { getAnthropicClient } from "@/lib/anthropic";
import type { ClipType } from "@prisma/client";

const CLIP_TYPE_MAP: Record<string, ClipType> = {
  HOT_TAKE: "HOT_TAKE",
  EMOTIONAL: "EMOTIONAL",
  QUOTABLE: "QUOTABLE",
  STORY: "STORY",
  REVEAL: "REVEAL",
  RELATABLE: "RELATABLE",
  hot_take: "HOT_TAKE",
  emotional: "EMOTIONAL",
  quotable: "QUOTABLE",
  story: "STORY",
  reveal: "REVEAL",
  relatable: "RELATABLE",
};

interface ClipSuggestion {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  viralityScore: number;
  clipType: string;
  hook: string;
  suggestedCaption: string;
  suggestedHashtags: string[];
  viralityReason: string;
  transcriptExcerpt: string;
}

// POST /api/content/[id]/process?workspaceId=xxx
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const sourceVideo = await db.sourceVideo.findUnique({ where: { id } });
  if (!sourceVideo) {
    return NextResponse.json({ error: "Source video not found" }, { status: 404 });
  }

  if (sourceVideo.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If already processing or complete, don't re-run
  if (
    sourceVideo.status === "COMPLETE" ||
    sourceVideo.status === "TRANSCRIBING" ||
    sourceVideo.status === "TRANSCRIBED" ||
    sourceVideo.status === "ANALYZING" ||
    sourceVideo.status === "ANALYZED" ||
    sourceVideo.status === "GENERATING"
  ) {
    return NextResponse.json({ message: "Already processing or complete" });
  }

  let client: ReturnType<typeof getAnthropicClient>;
  try {
    client = getAnthropicClient();
  } catch {
    await db.sourceVideo.update({
      where: { id },
      data: { status: "ERROR", errorMessage: "AI service not configured. Set ANTHROPIC_API_KEY." },
    });
    return NextResponse.json(
      { error: "AI service not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  try {
    // Step 1: TRANSCRIBING
    await db.sourceVideo.update({
      where: { id },
      data: { status: "TRANSCRIBING", errorMessage: null },
    });

    const url = sourceVideo.sourceUrl ?? "";
    const analysisContext = sourceVideo.clipAnalysis as { niche?: string; targetAudience?: string } | null;
    const nicheHint = analysisContext?.niche ? `\nNiche: ${analysisContext.niche}` : "";
    const audienceHint = analysisContext?.targetAudience ? `\nTarget audience: ${analysisContext.targetAudience}` : "";

    const prompt = `Given this YouTube video URL: ${url}${nicheHint}${audienceHint}
Generate 8-12 realistic viral clip suggestions with this JSON format:
[
  {
    "title": "...",
    "startTime": "0:00",
    "endTime": "0:45",
    "duration": 45,
    "viralityScore": 9,
    "clipType": "HOT_TAKE",
    "hook": "...",
    "suggestedCaption": "...",
    "suggestedHashtags": ["#tag1", "#tag2"],
    "viralityReason": "...",
    "transcriptExcerpt": "..."
  }
]
clipType must be one of: HOT_TAKE, EMOTIONAL, QUOTABLE, STORY, REVEAL, RELATABLE
viralityScore must be 1-10 (integer)
duration is in seconds (integer)
Make them realistic and varied for the content. Return ONLY valid JSON array, no markdown, no explanation.`;

    // Step 2: Update to ANALYZING
    await db.sourceVideo.update({
      where: { id },
      data: { status: "ANALYZING" },
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Step 3: GENERATING — parse and save clips
    await db.sourceVideo.update({
      where: { id },
      data: { status: "GENERATING" },
    });

    const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const suggestions: ClipSuggestion[] = JSON.parse(cleaned);

    const clips = await db.$transaction(
      suggestions.map((c) =>
        db.clip.create({
          data: {
            sourceVideoId: id,
            title: c.title,
            startTime: c.startTime,
            endTime: c.endTime,
            duration: Math.round(c.duration),
            viralityScore: Math.min(10, Math.max(1, Math.round(c.viralityScore))),
            clipType: CLIP_TYPE_MAP[c.clipType] ?? "QUOTABLE",
            hook: c.hook || null,
            suggestedCaption: c.suggestedCaption || null,
            suggestedHashtags: c.suggestedHashtags || [],
            viralityReason: c.viralityReason || null,
            transcriptExcerpt: c.transcriptExcerpt || null,
            status: "GENERATED",
          },
        })
      )
    );

    // Update title from URL (extract video ID as a hint)
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/);
    const titleHint = videoIdMatch ? `YouTube Video (${videoIdMatch[1]})` : url;

    await db.sourceVideo.update({
      where: { id },
      data: {
        status: "COMPLETE",
        title: titleHint,
      },
    });

    return NextResponse.json({ clips, clipsCount: clips.length });
  } catch (err) {
    const message =
      err instanceof SyntaxError
        ? "AI returned malformed JSON. Please try again."
        : err instanceof Error
        ? err.message
        : "Processing failed.";

    console.error("Process error:", message);

    await db.sourceVideo.update({
      where: { id },
      data: { status: "ERROR", errorMessage: message },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
