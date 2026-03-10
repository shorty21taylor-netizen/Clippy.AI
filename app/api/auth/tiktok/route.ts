import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/workspace";
import crypto from "crypto";

// GET /api/auth/tiktok?workspaceId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json(
      { error: "TikTok integration not configured. Set TIKTOK_CLIENT_KEY." },
      { status: 503 }
    );
  }

  const csrfState = crypto.randomBytes(16).toString("hex");
  // Encode workspaceId in state so callback knows which workspace to associate
  const state = `${csrfState}:${workspaceId}`;
  const redirectUri = `${getBaseUrl(req)}/api/auth/tiktok/callback`;

  const scopes = [
    "user.info.basic",
    "user.info.profile",
    "video.upload",
    "video.publish",
    "video.list",
  ].join(",");

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

function getBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}
