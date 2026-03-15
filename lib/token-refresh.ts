import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

/**
 * Refresh an Instagram long-lived token using the fb_exchange_token grant.
 * Instagram tokens last ~60 days and can be refreshed while still valid.
 * Returns true if the token was refreshed, false if it failed.
 */
export async function refreshInstagramToken(socialAccountId: string): Promise<boolean> {
  const account = await db.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: { id: true, platform: true, accessToken: true, workspaceId: true },
  });

  if (!account || account.platform !== "INSTAGRAM" || !account.accessToken) {
    return false;
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("[token-refresh] META_APP_ID or META_APP_SECRET not set");
    return false;
  }

  try {
    const currentToken = decrypt(account.accessToken);

    const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", currentToken);

    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };

    if (!data.access_token) {
      console.error(`[token-refresh] Instagram refresh failed for ${socialAccountId}:`, data.error?.message);
      // Mark as disconnected so user knows to reconnect
      await db.socialAccount.update({
        where: { id: socialAccountId },
        data: { status: "DISCONNECTED", isActive: false },
      });
      return false;
    }

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 5184000) * 1000);

    await db.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        accessToken: encrypt(data.access_token),
        tokenExpiresAt: expiresAt,
        status: "ACTIVE",
        isActive: true,
      },
    });

    return true;
  } catch (err) {
    console.error(`[token-refresh] Instagram refresh error for ${socialAccountId}:`, err);
    return false;
  }
}

/**
 * Refresh a TikTok access token using the stored refresh_token.
 * TikTok access tokens expire in 24 hours; refresh tokens last 365 days.
 * Returns true if the token was refreshed, false if it failed.
 */
export async function refreshTikTokToken(socialAccountId: string): Promise<boolean> {
  const account = await db.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: { id: true, platform: true, refreshToken: true, workspaceId: true },
  });

  if (!account || account.platform !== "TIKTOK" || !account.refreshToken) {
    return false;
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    console.error("[token-refresh] TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET not set");
    return false;
  }

  try {
    const currentRefreshToken = decrypt(account.refreshToken);

    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: currentRefreshToken,
      }),
    });

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!data.access_token) {
      console.error(`[token-refresh] TikTok refresh failed for ${socialAccountId}:`, data.error_description);
      await db.socialAccount.update({
        where: { id: socialAccountId },
        data: { status: "DISCONNECTED", isActive: false },
      });
      return false;
    }

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 86400) * 1000);

    await db.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        accessToken: encrypt(data.access_token),
        ...(data.refresh_token && { refreshToken: encrypt(data.refresh_token) }),
        tokenExpiresAt: expiresAt,
        ...(data.scope && { scopes: data.scope.split(",") }),
        status: "ACTIVE",
        isActive: true,
      },
    });

    return true;
  } catch (err) {
    console.error(`[token-refresh] TikTok refresh error for ${socialAccountId}:`, err);
    return false;
  }
}
