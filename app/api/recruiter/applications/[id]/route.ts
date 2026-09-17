import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_STATUSES = ["INTERVIEW", "OFFER", "REJECTED"];

// PATCH — le recruteur confirme la réception, fixe une date d'entretien, ou
// déclare le résultat final. Règle de conflit (spec 12.2) : si le recruteur
// renseigne un résultat, cette valeur prévaut toujours sur celle du candidat
// (statusSource passe à "RECRUITER").
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    // La candidature doit porter sur une offre RecruiterJob possédée par ce recruteur.
    const { data: existing, error: loadError } = await supabase
      .from("Application")
      .select("*, recruiterJob:RecruiterJob!inner(recruiterUserId)")
      .eq("id", id)
      .eq("recruiterJob.recruiterUserId", user.id)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!existing) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });

    const b = await req.json();
    const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (typeof b.interviewAt === "string" && b.interviewAt) {
      payload.interviewAt = b.interviewAt;
      payload.status = "INTERVIEW";
      payload.statusSource = "RECRUITER";
    }

    if (typeof b.status === "string" && ALLOWED_STATUSES.includes(b.status)) {
      payload.status = b.status;
      payload.statusSource = "RECRUITER";
    }

    if (!existing.viewedAt) {
      payload.viewedAt = new Date().toISOString();
    }

    const { data, error } = await supabase.from("Application").update(payload).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ application: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de mettre à jour la candidature." },
      { status: 500 }
    );
  }
}
