import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { saveFile } from "@/lib/storage";

export async function POST(req: Request) {
  const formData = await req.formData();
  const workspaceId = formData.get("workspaceId") as string;
  const title = (formData.get("title") as string) || "Uploaded video";
  const file = formData.get("file") as File | null;
  const goal = (formData.get("goal") as string) || null;
  const goalSettingsRaw = formData.get("goalSettings") as string | null;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const allowedTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/x-matroska",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use MP4, MOV, WebM, AVI, or MKV." },
      { status: 400 }
    );
  }

  if (file.size > 500 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 500 MB." }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  let goalSettings: object | null = null;
  if (goalSettingsRaw) {
    try {
      goalSettings = JSON.parse(goalSettingsRaw);
    } catch {
      // ignore invalid JSON
    }
  }

  // Save file to storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "mp4";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = await saveFile(`source-videos/${workspaceId}`, filename, buffer);

  const sourceVideo = await db.sourceVideo.create({
    data: {
      workspaceId,
      title,
      sourceType: "FILE_UPLOAD",
      sourceFilePath: filePath,
      goal,
      goalSettings: goalSettings ?? undefined,
      status: "PENDING",
    },
  });

  return NextResponse.json({ sourceVideo }, { status: 201 });
}
