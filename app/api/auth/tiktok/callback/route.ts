import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getCurrentUser } from "@/lib/workspace";

// GET /api/auth/tiktok/callback?code=xxx&state=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${getBaseUrl(req)}/dashboard/social-accounts?error=tiktok_${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${getBaseUrl(req)}/dashboard/social-accounts?error=tiktok_missing_params`
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${getBaseUrl(req)}/sign-in`);
  }

  // Extract workspaceId from state
  const stateParts = state.split(":");
  const workspaceId = stateParts[1];
  if (!workspaceId) {
    return NextResponse.redirect(
      `${getBaseUrl(req)}/dashboard/social-accounts?error=tiktok_invalid_state`
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
  const redirectUri = `${getBaseUrl(req)}/api/auth/tiktok/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      open_id: string;
      scope: string;
      token_type: string;
    };

    if (!tokenData.access_token) {
      console.error("TikTok token exchange failed:", tokenData);
      return NextResponse.redirect(
        `${getBaseUrl(req)}/dashboard/social-accounts?error=tiktok_token_exchange_failed`
      );
    }

    // Fetch user info
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );
    const userData = (await userRes.json()) as {
      data?: {
        user?: {
          open_id: string;
          display_name: string;
          username: string;
          avatar_url: string;
        };
      };
    };

    const tiktokUser = userData.data?.user;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert social account
    const existing = await db.socialAccount.findFirst({
      where: {
        workspaceId,
        platform: "TIKTOK",
        platformAccountId: tokenData.open_id,
      },
    });

    if (existing) {
      await db.socialAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: encrypt(tokenData.access_token),
          refreshToken: encrypt(tokenData.refresh_token),
          tokenExpiresAt: expiresAt,
          scopes: tokenData.scope.split(","),
          status: "ACTIVE",
          isActive: true,
          displayName: tiktokUser?.display_name || existing.displayName,
          username: tiktokUser?.username || existing.username,
          avatarUrl: tiktokUser?.avatar_url || existing.avatarUrl,
        },
      });
    } else {
      await db.socialAccount.create({
        data: {
          workspaceId,
          platform: "TIKTOK",
          platformAccountId: tokenData.open_id,
          username: tiktokUser?.username || tokenData.open_id,
          displayName: tiktokUser?.display_name || null,
          avatarUrl: tiktokUser?.avatar_url || null,
          accessToken: encrypt(tokenData.access_token),
          refreshToken: encrypt(tokenData.refresh_token),
          tokenExpiresAt: expiresAt,
          scopes: tokenData.scope.split(","),
          status: "ACTIVE",
          isActive: true,
        },
      });
    }

    return NextResponse.redirect(
      `${getBaseUrl(req)}/dashboard/social-accounts?success=tiktok_connected`
    );
  } catch (err) {
    console.error("TikTok OAuth error:", err);
    return NextResponse.redirect(
      `${getBaseUrl(req)}/dashboard/social-accounts?error=tiktok_oauth_failed`
    );
  }
}

function getBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}
