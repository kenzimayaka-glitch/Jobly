import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, getRecruiterProfileForAuthUser } from "../../../../lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const db = adminClient();
    const me = await ensureUser(db, auth);
    const recruiterProfile = me.role === "ADMIN" ? true : await getRecruiterProfileForAuthUser(db, auth.id, me.id);
    if (me.role !== "RECRUITER" && me.role !== "ADMIN" && !recruiterProfile) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    // A global talent directory would bypass the per-offer top-five rule.
    // Recruiters must enter discovery from a specific offer/share context.
    return NextResponse.json({
      message: "La découverte des talents se fait depuis une offre précise afin d'appliquer le seuil de 90 %, le classement des cinq meilleurs profils et les droits d'abonnement.",
      code: "OFFER_CONTEXT_REQUIRED",
      talents: [],
      count: 0,
    }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de charger Top Talent.",
    }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}
