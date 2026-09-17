import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../../../lib/server-auth";
import { encryptToken, exchangeCode, gmailProfile, verifyOAuthState } from "../../../../../../lib/candidateGmail";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL(`/jobs?gmail=error&reason=${encodeURIComponent(error)}`, request.url));
  if (!code || !state) return NextResponse.json({ message: "Réponse OAuth Gmail incomplète." }, { status: 400 });

  try {
    const userId = verifyOAuthState(state);
    const tokens = await exchangeCode(code, request);
    const profile = await gmailProfile(tokens.access_token);
    const supabase = adminClient();
    const now = new Date();
    const scopes = String(tokens.scope || "").split(" ").filter(Boolean);
    const { error: dbError } = await supabase.from("CandidateGmailConnection").upsert({
      userId,
      googleEmail: profile.email,
      encryptedAccessToken: encryptToken(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      accessTokenExpiresAt: new Date(now.getTime() + Number(tokens.expires_in || 3600) * 1000).toISOString(),
      scopes,
      connectedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }, { onConflict: "userId" });
    if (dbError) throw new Error(dbError.message);
    return NextResponse.redirect(new URL("/jobs?gmail=connected", request.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/jobs?gmail=error&reason=${encodeURIComponent(error instanceof Error ? error.message : "oauth_failed")}`, request.url));
  }
}
