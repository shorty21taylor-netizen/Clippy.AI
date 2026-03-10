import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/workspace";

// POST /api/content/upload-url
// Returns a presigned S3 URL for direct browser → S3 video upload.
// Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
// and the optional peer dependencies @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner.
export async function POST(req: Request) {
  const { workspaceId, filename, contentType } = (await req.json()) as {
    workspaceId: string;
    filename: string;
    contentType: string;
  };

  if (!workspaceId || !filename || !contentType) {
    return NextResponse.json(
      { error: "workspaceId, filename, and contentType are required." },
      { status: 400 }
    );
  }

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET } =
    process.env;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET) {
    return NextResponse.json(
      {
        error:
          "S3 storage is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET.",
      },
      { status: 503 }
    );
  }

  try {
    // Dynamic requires bypass compile-time type resolution for optional packages.
    // Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to enable uploads.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3") as {
      S3Client: new (cfg: unknown) => unknown;
      PutObjectCommand: new (input: unknown) => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner") as {
      getSignedUrl: (client: unknown, cmd: unknown, opts: unknown) => Promise<string>;
    };

    const s3 = new S3Client({
      region: AWS_REGION,
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });

    const key = `uploads/${workspaceId}/${Date.now()}-${filename.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )}`;

    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const fileUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ uploadUrl, fileUrl, key });
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to generate upload URL. Ensure @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner are installed.",
      },
      { status: 500 }
    );
  }
}
