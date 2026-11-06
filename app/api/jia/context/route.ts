import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { getJiaAvailableEcosystems } from "@/lib/jia/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (!user.privacyAcceptedAt) {
      return NextResponse.json({ message: "Le consentement de confidentialité est requis pour J’IA." }, { status: 403 });
    }
    const ecosystems = await getJiaAvailableEcosystems(db, user, auth.id);
    const requested = request.nextUrl.searchParams.get("ecosystem")?.toUpperCase();
    const activeEcosystem = ecosystems.includes(requested as any) ? requested : ecosystems[0] ?? null;
    return NextResponse.json({ ecosystems, activeEcosystem });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Contexte J’IA indisponible.",
    }, { status: 500 });
  }
}
