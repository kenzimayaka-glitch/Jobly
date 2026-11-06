import { NextRequest, NextResponse } from "next/server";
import { recruiterContext, saveGmailTokens } from "../../../../../lib/gmailServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 32 * 1024) return NextResponse.json({ message: "Requête Google trop volumineuse." }, { status: 413 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Données Google invalides." }, { status: 400 });
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : null;
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : null;
    if (!email || email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || !accessToken || accessToken.length > 10000 || (refreshToken && refreshToken.length > 10000)) {
      return NextResponse.json({ message: "E-mail ou jeton Google invalide." }, { status: 400 });
    }
    const context = await recruiterContext(req);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const limited = await enforceApiRateLimit(req, context.supabase, {
      scope: "recruiter-gmail-connect",
      identity: context.user.id,
      accountWindows: [{ limit: 3, windowSeconds: 3600 }, { limit: 6, windowSeconds: 86400 }],
      ipWindows: [{ limit: 5, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const scopes = Array.isArray(body.scopes)
      ? body.scopes.filter((x: unknown): x is string => typeof x === "string" && x.length <= 200).slice(0, 20)
      : [];

    const result = await saveGmailTokens(req, { email, accessToken, refreshToken, scopes });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Connexion Gmail impossible." }, { status: 500 });
  }
}
