import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import { buildPrompt, type ContentPlatform } from "@/lib/content-prompts";
import { requireWorkspaceMember } from "@/lib/workspace";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const body = await req.json() as {
    workspaceId: string;
    platform: ContentPlatform;
    rawInput: string;
  };
  const { workspaceId, platform, rawInput } = body;

  if (!workspaceId || !platform || !rawInput?.trim()) {
    return NextResponse.json(
      { error: "workspaceId, platform, and rawInput are required." },
      { status: 400 }
    );
  }

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

  const { system, user } = buildPrompt(platform, rawInput.trim());

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          system,
          messages: [{ role: "user", content: user }],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            // Only stream text deltas — thinking blocks are silently filtered
            const data = JSON.stringify({ text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `AI error (${err.status}): ${err.message}`
            : "Unexpected error during generation.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
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
