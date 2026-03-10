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
  title: z.string().max(200).optional(),
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

  const { workspaceId, url, title } = parsed.data;

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const sourceVideo = await db.sourceVideo.create({
    data: {
      workspaceId,
      title: title || url,
      sourceType: "YOUTUBE_URL",
      sourceUrl: url,
      status: "PENDING",
    },
  });

  return NextResponse.json({ sourceVideo }, { status: 201 });
}
