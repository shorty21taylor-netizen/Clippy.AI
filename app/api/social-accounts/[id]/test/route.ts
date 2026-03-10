import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { requireWorkspaceMember } from "@/lib/workspace";

// POST /api/social-accounts/[id]/test
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const account = await db.socialAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(account.workspaceId);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  if (!account.accessToken) {
    return NextResponse.json({ valid: false, error: "No access token stored" });
  }

  const token = decrypt(account.accessToken);

  try {
    if (account.platform === "TIKTOK") {
      const res = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.error?.code) {
        return NextResponse.json({
          valid: false,
          error: `TikTok API error: ${data.error.message}`,
        });
      }
      return NextResponse.json({ valid: true, user: data.data?.user });
    }

    if (account.platform === "INSTAGRAM") {
      const igId = account.platformAccountId;
      if (!igId) {
        return NextResponse.json({ valid: false, error: "No Instagram account ID" });
      }
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igId}?fields=id,username&access_token=${token}`
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({
          valid: false,
          error: `Instagram API error: ${data.error.message}`,
        });
      }
      return NextResponse.json({ valid: true, user: data });
    }

    return NextResponse.json({ valid: false, error: "Unsupported platform for testing" });
  } catch (err) {
    return NextResponse.json({
      valid: false,
      error: err instanceof Error ? err.message : "Connection test failed",
    });
  }
}
