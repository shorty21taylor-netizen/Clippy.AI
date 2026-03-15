import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { getAnthropicClient } from "@/lib/anthropic";

const bodySchema = z.object({
  currentCaption: z.string().min(1),
  instruction: z.string().min(1).max(500),
  platform: z.enum(["tiktok", "instagram"]),
  goal: z.string().optional(),
  clipContext: z.string().optional(),
  style: z.string().optional(),
});

// POST /api/clips/[id]/rewrite-caption
// Rewrites a single caption variant using Claude based on a user instruction.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const clip = await db.clip.findUnique({
    where: { id },
    include: { sourceVideo: { select: { workspaceId: true } } },
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

  let client: ReturnType<typeof getAnthropicClient>;
  try {
    client = getAnthropicClient();
  } catch {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  const { currentCaption, instruction, platform, goal, clipContext, style } = parsed.data;
  const charLimit = platform === "tiktok" ? 300 : 500;

  const prompt = `You are an expert social media copywriter. Rewrite the following ${platform === "tiktok" ? "TikTok" : "Instagram"} caption based on the instruction.

Current caption:
"${currentCaption}"

Caption style: ${style || "curiosity"}
${goal ? `Creator's goal: ${goal}` : ""}
${clipContext ? `Clip context: ${clipContext}` : ""}

Instruction: ${instruction}

Rules:
- Keep the caption under ${charLimit} characters
- Maintain the CTA and goal focus
- Keep the same style (${style || "curiosity"})
- Return ONLY the new caption text. No explanation, no quotes, no labels.`;

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Rewrite failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
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
