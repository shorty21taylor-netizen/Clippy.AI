import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceMember } from "@/lib/workspace";
import { encrypt } from "@/lib/encryption";
import type { Platform, SocialAccountStatus } from "@prisma/client";

const VALID_PLATFORMS: Platform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];
const VALID_STATUSES: SocialAccountStatus[] = [
  "ACTIVE", "PENDING", "BANNED", "DISCONNECTED",
];

interface CSVRow {
  platform: string;
  username: string;
  displayName?: string;
  accessToken?: string;
  status?: string;
  tags?: string;
  proxyConfig?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

// POST /api/social-accounts/import
// Body: { workspaceId, rows: CSVRow[] }
export async function POST(req: Request) {
  const body = await req.json() as { workspaceId: string; rows: CSVRow[] };
  const { workspaceId, rows } = body;

  if (!workspaceId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const result: ImportResult = { success: 0, failed: 0, errors: [] };

  // Get current counts per platform to enforce 100-account limit
  const platformCounts = await db.socialAccount.groupBy({
    by: ["platform"],
    where: { workspaceId },
    _count: { id: true },
  });
  const countMap: Record<string, number> = {};
  for (const row of platformCounts) {
    countMap[row.platform] = row._count.id;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Validate platform
    const platform = row.platform?.toUpperCase().trim() as Platform;
    if (!VALID_PLATFORMS.includes(platform)) {
      result.failed++;
      result.errors.push({ row: rowNum, reason: `Invalid platform: "${row.platform}"` });
      continue;
    }

    // Validate username
    if (!row.username?.trim()) {
      result.failed++;
      result.errors.push({ row: rowNum, reason: "Username is required" });
      continue;
    }

    // Check per-platform limit
    const currentCount = countMap[platform] ?? 0;
    if (currentCount >= 100) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        reason: `${platform} account limit (100) reached`,
      });
      continue;
    }

    // Validate status
    const rawStatus = row.status?.toUpperCase().trim();
    const status: SocialAccountStatus =
      rawStatus && VALID_STATUSES.includes(rawStatus as SocialAccountStatus)
        ? (rawStatus as SocialAccountStatus)
        : "PENDING";

    // Parse tags
    const tags = row.tags
      ? row.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    try {
      await db.socialAccount.create({
        data: {
          workspaceId,
          platform,
          username: row.username.trim(),
          displayName: row.displayName?.trim() || null,
          accessToken: row.accessToken?.trim()
            ? encrypt(row.accessToken.trim())
            : null,
          status,
          tags,
          proxyConfig: row.proxyConfig?.trim() || null,
        },
      });

      countMap[platform] = (countMap[platform] ?? 0) + 1;
      result.success++;
    } catch {
      result.failed++;
      result.errors.push({ row: rowNum, reason: "Database error — duplicate username?" });
    }
  }

  return NextResponse.json({ result });
}
