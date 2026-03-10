import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { getAbsolutePath } from "@/lib/storage";
import { execFile } from "child_process";
import { readFile, unlink } from "fs/promises";
import { promisify } from "util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

// POST /api/source-videos/[id]/transcribe
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  // Mark as transcribing
  await db.sourceVideo.update({
    where: { id },
    data: { status: "TRANSCRIBING", errorMessage: null },
  });

  const tmpDir = os.tmpdir();
  const audioPath = path.join(tmpDir, `${id}-audio.mp3`);
  let audioFilePath: string;

  try {
    if (video.sourceType === "YOUTUBE_URL" && video.sourceUrl) {
      // Download audio from YouTube using yt-dlp
      await execFileAsync("yt-dlp", [
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "4",
        "-o", audioPath,
        "--no-playlist",
        "--max-filesize", "100M",
        video.sourceUrl,
      ], { timeout: 300_000 }); // 5 min timeout
      audioFilePath = audioPath;
    } else if (video.sourceFilePath) {
      // Extract audio from uploaded file using FFmpeg
      const sourcePath = getAbsolutePath(video.sourceFilePath);
      await execFileAsync("ffmpeg", [
        "-i", sourcePath,
        "-vn",
        "-acodec", "libmp3lame",
        "-q:a", "4",
        "-y",
        audioPath,
      ], { timeout: 300_000 });
      audioFilePath = audioPath;
    } else {
      await db.sourceVideo.update({
        where: { id },
        data: { status: "ERROR", errorMessage: "No source file or URL found." },
      });
      return NextResponse.json({ error: "No source file or URL." }, { status: 400 });
    }

    // Get video duration via ffprobe
    let durationSeconds: number | null = null;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        audioFilePath,
      ]);
      durationSeconds = Math.round(parseFloat(stdout.trim()));
    } catch {
      // Non-critical, continue without duration
    }

    // Send audio to OpenAI Whisper API
    const audioBuffer = await readFile(audioFilePath);
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      throw new Error(`Whisper API error ${whisperRes.status}: ${errBody}`);
    }

    const whisperData = (await whisperRes.json()) as {
      text: string;
      segments?: Array<{
        start: number;
        end: number;
        text: string;
      }>;
      duration?: number;
    };

    // Format transcript as "[MM:SS] text" per segment
    let formattedTranscript: string;
    if (whisperData.segments && whisperData.segments.length > 0) {
      formattedTranscript = whisperData.segments
        .map((seg) => {
          const mins = Math.floor(seg.start / 60);
          const secs = Math.floor(seg.start % 60);
          const ts = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
          return `[${ts}] ${seg.text.trim()}`;
        })
        .join("\n");
    } else {
      formattedTranscript = whisperData.text;
    }

    if (!durationSeconds && whisperData.duration) {
      durationSeconds = Math.round(whisperData.duration);
    }

    // Update the record
    await db.sourceVideo.update({
      where: { id },
      data: {
        transcript: formattedTranscript,
        duration: durationSeconds,
        status: "TRANSCRIBED",
      },
    });

    return NextResponse.json({
      status: "TRANSCRIBED",
      duration: durationSeconds,
      transcriptLength: formattedTranscript.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    console.error("Transcription error:", msg);
    await db.sourceVideo.update({
      where: { id },
      data: { status: "ERROR", errorMessage: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    // Cleanup temp audio file
    try { await unlink(audioPath); } catch { /* ignore */ }
  }
}
