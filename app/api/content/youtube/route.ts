import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  url: z
    .string()
    .url()
    .refine(
      (u) =>
        /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/.test(u),
      { message: "Must be a valid YouTube URL" }
    ),
  niche: z.string().max(100).optional(),
  targetAudience: z.string().max(200).optional(),
  maxClips: z.number().int().min(1).max(20).optional(),
});

// POST /api/content/youtube
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { workspaceId, url, niche, targetAudience } = parsed.data;

  try {
    await requireWorkspaceMember(workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const sourceVideo = await db.sourceVideo.create({
    data: {
      workspaceId,
      title: url,
      sourceType: "YOUTUBE_URL",
      sourceUrl: url,
      status: "PENDING",
      // Store niche/targetAudience in clipAnalysis for later use
      clipAnalysis: { niche, targetAudience } as object,
    },
  });

  return NextResponse.json({ sourceVideoId: sourceVideo.id }, { status: 201 });
}
