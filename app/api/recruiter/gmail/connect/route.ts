import { NextRequest, NextResponse } from "next/server";
import { saveGmailTokens } from "../../../../../lib/gmailServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : null;
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : null;
    if (!email || !accessToken) return NextResponse.json({ message: "Jeton Google manquant." }, { status: 400 });

    const result = await saveGmailTokens(req, { email, accessToken, refreshToken, scopes: Array.isArray(body.scopes) ? body.scopes.filter((x: unknown): x is string => typeof x === "string") : [] });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Connexion Gmail impossible." }, { status: 500 });
  }
}
