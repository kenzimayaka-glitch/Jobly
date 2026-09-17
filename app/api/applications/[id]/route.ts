import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

const CANDIDATE_FINAL_STATUSES = ["OFFER", "REJECTED"];

async function loadOwnedApplication(supabase: ReturnType<typeof adminClient>, userId: string, id: string) {
  const { data, error } = await supabase.from("Application").select("*").eq("id", id).eq("userId", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// PATCH — actions candidat uniquement :
//  - joindre/mettre à jour la preuve (Brouillon → En attente) ;
//  - déclarer un statut final (Acceptée/Refusée) ;
//  - renseigner une date d'entretien.
// Règle de conflit (spec 12.2) : si le recruteur a déjà fixé le statut final
// (statusSource = "RECRUITER"), la déclaration du candidat ne l'écrase jamais.
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    const existing = await loadOwnedApplication(supabase, user.id, id);
    if (!existing) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });

    const b = await req.json();
    const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (typeof b.proofUrl === "string" && b.proofUrl.trim()) {
      payload.proofUrl = b.proofUrl.trim();
      // Joindre une preuve fait passer Brouillon → En attente, sauf si un statut
      // plus avancé a déjà été atteint (ne jamais faire régresser un statut).
      if (existing.status === "DISCOVERED") {
        payload.status = "SUBMITTED";
        payload.submittedAt = new Date().toISOString();
      }
    }

    if (typeof b.interviewAt === "string" && b.interviewAt) {
      payload.interviewAt = b.interviewAt;
      if (existing.status === "SUBMITTED" || existing.status === "ACKNOWLEDGED") {
        payload.status = "INTERVIEW";
      }
    }

    if (typeof b.status === "string" && CANDIDATE_FINAL_STATUSES.includes(b.status)) {
      if (existing.statusSource === "RECRUITER") {
        // Le recruteur a déjà tranché : la déclaration du candidat est ignorée
        // silencieusement pour ce champ (le reste de la requête s'applique).
      } else {
        payload.status = b.status;
        payload.statusSource = "CANDIDATE";
      }
    }

    const { data, error } = await supabase.from("Application").update(payload).eq("id", id).eq("userId", user.id).select("*").single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ application: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de mettre à jour la candidature." },
      { status: 500 }
    );
  }
}
