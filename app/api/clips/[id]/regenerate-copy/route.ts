import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  CLIP_COPYWRITING_SYSTEM_PROMPT,
  buildCopywritingPrompt,
  type CopywritingResponse,
} from "@/lib/prompts/clip-copywriting";

// POST /api/clips/[id]/regenerate-copy
// Regenerates all 3 caption variants for a single clip.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clip = await db.clip.findUnique({
    where: { id },
    include: {
      sourceVideo: {
        select: {
          workspaceId: true,
          goal: true,
          goalSettings: true,
        },
      },
    },
  });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(clip.sourceVideo.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const goal = clip.goal || clip.sourceVideo.goal;
  if (!goal) {
    return NextResponse.json({ error: "No goal set for this clip." }, { status: 400 });
  }

  let client: ReturnType<typeof getAnthropicClient>;
  try {
    client = getAnthropicClient();
  } catch {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  const goalSettings = (clip.sourceVideo.goalSettings ?? {}) as {
    niche?: string;
    targetAudience?: string;
    tone?: string;
    linkUrl?: string;
    productName?: string;
    customGoalText?: string;
  };

  const copyPrompt = buildCopywritingPrompt({
    clips: [
      {
        id: 1,
        transcript_excerpt: clip.transcriptExcerpt || clip.title,
        clip_type: clip.clipType.toLowerCase(),
        title: clip.title,
      },
    ],
    goal,
    customGoalText: goalSettings.customGoalText,
    niche: goalSettings.niche,
    targetAudience: goalSettings.targetAudience,
    tone: goalSettings.tone,
    linkUrl: goalSettings.linkUrl,
    productName: goalSettings.productName,
  });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: CLIP_COPYWRITING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: copyPrompt }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const copyResult = JSON.parse(cleaned) as CopywritingResponse;
    const clipCopy = copyResult.clips[0];

    if (!clipCopy) {
      return NextResponse.json({ error: "No copy generated." }, { status: 500 });
    }

    const updated = await db.clip.update({
      where: { id },
      data: {
        hookText: clipCopy.hook_text || null,
        captions: clipCopy.captions as object,
        hashtagSets: clipCopy.hashtags as object,
        selectedCaptionStyle: "curiosity",
      },
    });

    return NextResponse.json({ clip: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Copy regeneration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
