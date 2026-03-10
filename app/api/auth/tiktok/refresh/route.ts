import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  socialAccountId: z.string().min(1),
});

// POST /api/auth/tiktok/refresh
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const account = await db.socialAccount.findUnique({
    where: { id: parsed.data.socialAccountId },
  });
  if (!account || account.platform !== "TIKTOK") {
    return NextResponse.json({ error: "TikTok account not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(account.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  if (!account.refreshToken) {
    return NextResponse.json({ error: "No refresh token available" }, { status: 400 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

  try {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: decrypt(account.refreshToken),
      }),
    });

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    if (!data.access_token) {
      return NextResponse.json({ error: "Token refresh failed" }, { status: 502 });
    }

    await db.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(data.access_token),
        refreshToken: encrypt(data.refresh_token),
        tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        scopes: data.scope.split(","),
      },
    });

    return NextResponse.json({ ok: true, expiresAt: new Date(Date.now() + data.expires_in * 1000) });
  } catch (err) {
    console.error("TikTok refresh error:", err);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 502 });
  }
}
