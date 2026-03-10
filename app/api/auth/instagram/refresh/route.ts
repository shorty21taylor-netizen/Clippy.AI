import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { requireWorkspaceMember } from "@/lib/workspace";

const bodySchema = z.object({
  socialAccountId: z.string().min(1),
});

// POST /api/auth/instagram/refresh
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const account = await db.socialAccount.findUnique({
    where: { id: parsed.data.socialAccountId },
  });
  if (!account || account.platform !== "INSTAGRAM") {
    return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });
  }

  try {
    await requireWorkspaceMember(account.workspaceId, ["OWNER", "ADMIN"]);
  } catch (err: unknown) {
    const e = err as { status: number; message: string };
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  if (!account.accessToken) {
    return NextResponse.json({ error: "No access token available" }, { status: 400 });
  }

  try {
    const currentToken = decrypt(account.accessToken);
    const refreshUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    refreshUrl.searchParams.set("grant_type", "fb_exchange_token");
    refreshUrl.searchParams.set("client_id", process.env.META_APP_ID!);
    refreshUrl.searchParams.set("client_secret", process.env.META_APP_SECRET!);
    refreshUrl.searchParams.set("fb_exchange_token", currentToken);

    const res = await fetch(refreshUrl);
    const data = (await res.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    if (!data.access_token) {
      return NextResponse.json({ error: "Token refresh failed" }, { status: 502 });
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await db.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(data.access_token),
        tokenExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({ ok: true, expiresAt });
  } catch (err) {
    console.error("Instagram refresh error:", err);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 502 });
  }
}
