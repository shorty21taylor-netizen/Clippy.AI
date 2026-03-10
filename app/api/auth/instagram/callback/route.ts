import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getCurrentUser } from "@/lib/workspace";

// GET /api/auth/instagram/callback?code=xxx&state=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = getBaseUrl(req);

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social-accounts?error=instagram_${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social-accounts?error=instagram_missing_params`
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${baseUrl}/sign-in`);
  }

  const workspaceId = state.split(":")[1];
  if (!workspaceId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social-accounts?error=instagram_invalid_state`
    );
  }

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  try {
    // Step 1: Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    if (!tokenData.access_token) {
      console.error("Meta token exchange failed:", tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/social-accounts?error=instagram_token_failed`
      );
    }

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longTokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", appId);
    longTokenUrl.searchParams.set("client_secret", appSecret);
    longTokenUrl.searchParams.set("fb_exchange_token", tokenData.access_token);

    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = (await longTokenRes.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    const accessToken = longTokenData.access_token || tokenData.access_token;
    const expiresIn = longTokenData.expires_in || tokenData.expires_in;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Step 3: Get Facebook Pages the user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
    );
    const pagesData = (await pagesRes.json()) as {
      data: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string };
      }>;
    };

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/social-accounts?error=instagram_no_pages`
      );
    }

    // Step 4: Find Instagram Business Account linked to each page
    let connectedCount = 0;
    for (const page of pagesData.data) {
      if (!page.instagram_business_account?.id) continue;

      const igAccountId = page.instagram_business_account.id;

      // Fetch Instagram user info
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${page.access_token}`
      );
      const igData = (await igRes.json()) as {
        id: string;
        username: string;
        name: string;
        profile_picture_url: string;
        followers_count: number;
      };

      // Upsert social account
      const existing = await db.socialAccount.findFirst({
        where: {
          workspaceId,
          platform: "INSTAGRAM",
          platformAccountId: igAccountId,
        },
      });

      if (existing) {
        await db.socialAccount.update({
          where: { id: existing.id },
          data: {
            accessToken: encrypt(page.access_token),
            tokenExpiresAt: expiresAt,
            scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"],
            status: "ACTIVE",
            isActive: true,
            displayName: igData.name || existing.displayName,
            username: igData.username || existing.username,
            avatarUrl: igData.profile_picture_url || existing.avatarUrl,
            followerCount: igData.followers_count || existing.followerCount,
          },
        });
      } else {
        await db.socialAccount.create({
          data: {
            workspaceId,
            platform: "INSTAGRAM",
            platformAccountId: igAccountId,
            username: igData.username || igAccountId,
            displayName: igData.name || null,
            avatarUrl: igData.profile_picture_url || null,
            accessToken: encrypt(page.access_token),
            tokenExpiresAt: expiresAt,
            scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"],
            status: "ACTIVE",
            isActive: true,
            followerCount: igData.followers_count || null,
          },
        });
      }
      connectedCount++;
    }

    if (connectedCount === 0) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/social-accounts?error=instagram_no_business_accounts`
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/social-accounts?success=instagram_connected&count=${connectedCount}`
    );
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social-accounts?error=instagram_oauth_failed`
    );
  }
}

function getBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}
