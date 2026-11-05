import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds } from "../../../../../lib/mobilityAccess";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!institutionIds.length) return NextResponse.json({ message: "Membre INSTITUTION_ADMIN actif requis." }, { status: 403 });
    const { data: programs, error: programError } = await db.from("MobilityProgram")
      .select("id,institutionId,code,name,status,budgetTotal,currency,commitmentVerifiedAt")
      .in("institutionId", institutionIds);
    if (programError) throw new Error(programError.message);
    const programIds = (programs || []).map((row: { id: string }) => row.id);
    if (!programIds.length) return NextResponse.json({ applications: [], programs: [] });
    const { data, error } = await db.from("MobilityProgramApplication")
      .select("id,programId,mobilityRequestId,applicantUserId,status,submittedAt,decidedAt,decisionReason,MobilityRequest(id,departCity,arriveeCity,distanceKm,costTotal,eligibilityStatus,eligibilityBurdenPercent,salaryCurrency)")
      .in("programId", programIds)
      .order("submittedAt", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ applications: data || [], programs: programs || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Candidatures institutionnelles indisponibles." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const body = await req.json().catch(() => ({}));
    const applicationId = String(body.applicationId || "").trim();
    const decision = String(body.decision || "").toUpperCase();
    const reason = String(body.reason || "").trim();
    if (!applicationId || !["APPROVE", "REJECT"].includes(decision)) {
      return NextResponse.json({ message: "Candidature et décision valides requises." }, { status: 400 });
    }
    if (decision === "REJECT" && !reason) {
      return NextResponse.json({ message: "Un motif est obligatoire pour rejeter un dossier." }, { status: 400 });
    }
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!institutionIds.length) return NextResponse.json({ message: "Membre INSTITUTION_ADMIN actif requis." }, { status: 403 });

    const { data: application, error: lookupError } = await db.from("MobilityProgramApplication")
      .select("id,programId,mobilityRequestId,status")
      .eq("id", applicationId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!application) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });
    const { data: program, error: programError } = await db.from("MobilityProgram")
      .select("id,institutionId,status,commitmentVerifiedAt,code,name")
      .eq("id", application.programId)
      .maybeSingle();
    if (programError) throw new Error(programError.message);
    if (!program || !institutionIds.includes(String(program.institutionId))) {
      return NextResponse.json({ message: "Candidature hors du périmètre institutionnel." }, { status: 403 });
    }
    if (program.status !== "ACTIVE" || !program.commitmentVerifiedAt
      || String(program.code + " " + program.name).toUpperCase().includes("DEMO")) {
      return NextResponse.json({ message: "Le programme n'est pas financièrement activé." }, { status: 422 });
    }
    if (application.status !== "PENDING") return NextResponse.json({ message: "La candidature a déjà été traitée." }, { status: 409 });

    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const { data, error } = await db.from("MobilityProgramApplication").update({
      status,
      decidedAt: new Date().toISOString(),
      decidedByUserId: user.id,
      decisionReason: reason || "Dossier approuvé par l'institution.",
      updatedAt: new Date().toISOString(),
    }).eq("id", applicationId).eq("status", "PENDING").select("id,status,decidedAt,decisionReason").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "La candidature a déjà été traitée." }, { status: 409 });
    const { error: eventError } = await db.from("MobilityProcessEvent").insert({
      mobilityRequestId: application.mobilityRequestId,
      actorUserId: user.id,
      actorRole: "INSTITUTION_ADMIN",
      eventType: "PROGRAM_APPLICATION_" + status,
      fromStatus: application.status,
      toStatus: status,
      title: decision === "APPROVE" ? "Programme Mobility approuvé" : "Programme Mobility refusé",
      description: reason || (decision === "APPROVE" ? "Le programme a retenu le dossier." : "Le programme n'a pas retenu le dossier."),
      metadata: { applicationId, programId: application.programId },
      visibleToTalent: true,
      visibleToRecruiter: true,
      visibleToInstitution: true,
    });
    if (eventError) {
      return NextResponse.json({ message: "La décision est enregistrée, mais son événement d'audit est incomplet: " + eventError.message, application: data }, { status: 500 });
    }
    return NextResponse.json({ application: data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Décision institutionnelle impossible." }, { status: 500 });
  }
}
