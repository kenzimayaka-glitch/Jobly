import { NextRequest, NextResponse } from "next/server";
import { candidateContext, googleAuthorizationUrl } from "../../../../../lib/candidateGmail";

export async function GET(request: NextRequest) {
  try {
    const context = await candidateContext(request);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const authorizationUrl = googleAuthorizationUrl(request, context.user.id);
    if (request.nextUrl.searchParams.get("format") === "json") {
      return NextResponse.json(
        { url: authorizationUrl },
        { headers: { "Cache-Control": "no-store, private" } },
      );
    }
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Connexion Gmail indisponible." }, { status: 500 });
  }
}
