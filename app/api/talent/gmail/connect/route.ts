import { NextRequest, NextResponse } from "next/server";
import { candidateContext, googleAuthorizationUrl } from "../../../../../lib/candidateGmail";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function GET(request: NextRequest) {
  try {
    const context = await candidateContext(request);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const limited = await enforceApiRateLimit(request, context.supabase, {
      scope: "candidate-gmail-connect",
      identity: context.user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }, { limit: 10, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    return NextResponse.redirect(googleAuthorizationUrl(request, context.user.id));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Connexion Gmail indisponible." }, { status: 500 });
  }
}
