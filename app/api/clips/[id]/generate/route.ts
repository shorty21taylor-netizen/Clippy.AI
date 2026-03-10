import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { saveFile, getAbsolutePath } from "@/lib/storage";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import { unlink } from "fs/promises";

const execFileAsync = promisify(execFile);

function timeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// POST /api/clips/[id]/generate
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clip = await db.clip.findUnique({
    where: { id },
    include: { sourceVideo: true },
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

  // Determine source video file path
  let sourcePath: string;
  if (clip.sourceVideo.sourceFilePath) {
    sourcePath = getAbsolutePath(clip.sourceVideo.sourceFilePath);
  } else if (clip.sourceVideo.sourceUrl) {
    // Download from YouTube to temp if not already cached
    const tmpPath = path.join(os.tmpdir(), `${clip.sourceVideo.id}-source.mp4`);
    try {
      await execFileAsync("yt-dlp", [
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "-o", tmpPath,
        "--no-playlist",
        "--max-filesize", "500M",
        clip.sourceVideo.sourceUrl,
      ], { timeout: 600_000 }); // 10 min timeout
      sourcePath = tmpPath;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to download source video";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: "No source video file available." }, { status: 400 });
  }

  const startSec = timeToSeconds(clip.startTime);
  const endSec = timeToSeconds(clip.endTime);
  const duration = endSec - startSec;

  const tmpOutput = path.join(os.tmpdir(), `clip-${id}-${Date.now()}.mp4`);

  try {
    // FFmpeg: cut, crop to 9:16, encode
    await execFileAsync("ffmpeg", [
      "-ss", String(startSec),
      "-i", sourcePath,
      "-t", String(duration),
      "-vf", "crop=ih*9/16:ih,scale=1080:1920",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y",
      tmpOutput,
    ], { timeout: 300_000 });

    // Save to storage
    const { readFile } = await import("fs/promises");
    const clipBuffer = await readFile(tmpOutput);
    const filename = `clip-${id}.mp4`;
    const videoPath = await saveFile(
      `clips/${clip.sourceVideo.workspaceId}`,
      filename,
      clipBuffer
    );

    // Update clip record
    await db.clip.update({
      where: { id },
      data: { videoPath, status: "GENERATED" },
    });

    // If all clips are generated, update source video status
    const ungeneratedClips = await db.clip.count({
      where: {
        sourceVideoId: clip.sourceVideoId,
        videoPath: null,
      },
    });
    if (ungeneratedClips === 0) {
      await db.sourceVideo.update({
        where: { id: clip.sourceVideoId },
        data: { status: "COMPLETE" },
      });
    }

    return NextResponse.json({ clip: { id, videoPath, status: "GENERATED" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "FFmpeg processing failed";
    console.error("Clip generation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    try { await unlink(tmpOutput); } catch { /* ignore */ }
  }
}
