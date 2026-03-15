import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  CLIP_COPYWRITING_SYSTEM_PROMPT,
  buildCopywritingPrompt,
  type CopywritingResponse,
} from "@/lib/prompts/clip-copywriting";

const bodySchema = z.object({
  sourceVideoId: z.string().min(1),
  goal: z.string().min(1),
  goalSettings: z
    .object({
      niche: z.string().optional(),
      targetAudience: z.string().optional(),
      tone: z.string().optional(),
      linkUrl: z.string().optional(),
      productName: z.string().optional(),
      customGoalText: z.string().optional(),
    })
    .optional(),
});

// POST /api/clips/bulk-regenerate-copy
// Regenerates copy for ALL clips in a source video with a new goal.
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sourceVideoId, goal, goalSettings } = parsed.data;

  const video = await db.sourceVideo.findUnique({ where: { id: sourceVideoId } });
  if (!video) {
    return NextResponse.json({ error: "Source video not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(video.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const clips = await db.clip.findMany({
    where: { sourceVideoId },
    orderBy: { viralityScore: "desc" },
  });

  if (clips.length === 0) {
    return NextResponse.json({ error: "No clips found." }, { status: 400 });
  }

  let client: ReturnType<typeof getAnthropicClient>;
  try {
    client = getAnthropicClient();
  } catch {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  // Update the video's goal for future regenerations
  await db.sourceVideo.update({
    where: { id: sourceVideoId },
    data: {
      goal,
      goalSettings: (goalSettings as object) || null,
    },
  });

  const copyPrompt = buildCopywritingPrompt({
    clips: clips.map((c, i) => ({
      id: i + 1,
      transcript_excerpt: c.transcriptExcerpt || c.title,
      clip_type: c.clipType.toLowerCase(),
      title: c.title,
    })),
    goal,
    customGoalText: goalSettings?.customGoalText,
    niche: goalSettings?.niche,
    targetAudience: goalSettings?.targetAudience,
    tone: goalSettings?.tone,
    linkUrl: goalSettings?.linkUrl,
    productName: goalSettings?.productName,
  });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: CLIP_COPYWRITING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: copyPrompt }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const copyResult = JSON.parse(cleaned) as CopywritingResponse;

    // Update all clips with their new copy
    const updates = await db.$transaction(
      copyResult.clips.map((clipCopy, i) => {
        const dbClip = clips[i];
        if (!dbClip) return db.clip.update({ where: { id: clips[0].id }, data: {} });
        return db.clip.update({
          where: { id: dbClip.id },
          data: {
            hookText: clipCopy.hook_text || null,
            captions: clipCopy.captions as object,
            hashtagSets: clipCopy.hashtags as object,
            selectedCaptionStyle: "curiosity",
            goal,
          },
        });
      })
    );

    return NextResponse.json({
      ok: true,
      updatedCount: updates.length,
      clips: updates,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bulk copy regeneration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
