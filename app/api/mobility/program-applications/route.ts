import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-program-applications-read",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 600, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const requestId = req.nextUrl.searchParams.get("requestId");
    if (!requestId) return NextResponse.json({ message: "requestId requis." }, { status: 400 });
    const { data: request, error: requestError } = await db.from("MobilityRequest")
      .select("id")
      .eq("id", requestId)
      .eq("userId", user.id)
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request) return NextResponse.json({ message: "Dossier Mobility introuvable." }, { status: 404 });
    const { data, error } = await db.from("MobilityProgramApplication")
      .select("id,programId,status,submittedAt,decidedAt,decisionReason,MobilityProgram(code,name)")
      .eq("mobilityRequestId", requestId)
      .eq("applicantUserId", user.id)
      .order("submittedAt", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ applications: data || [] }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Candidatures Mobility indisponibles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 12 * 1024) return NextResponse.json({ message: "Candidature programme trop volumineuse." }, { status: 413 });
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-program-application-submit",
      identity: user.id,
      accountWindows: [{ limit: 3, windowSeconds: 3600 }, { limit: 6, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId || "").trim();
    const programId = String(body.programId || "").trim();
    if (!requestId || !programId) return NextResponse.json({ message: "Dossier et programme requis." }, { status: 400 });

    const { data: request, error: requestError } = await db.from("MobilityRequest")
      .select("id,userId,eligibilityStatus,eligibilityThresholdPercent,recruiterGuaranteed,recruiterGuaranteeId,status")
      .eq("id", requestId)
      .eq("userId", user.id)
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request) return NextResponse.json({ message: "Dossier Mobility introuvable." }, { status: 404 });
    if (request.eligibilityStatus !== "ELIGIBLE" || Number(request.eligibilityThresholdPercent) !== 50
      || request.recruiterGuaranteed !== true || !request.recruiterGuaranteeId) {
      return NextResponse.json({ message: "La demande doit être éligible à 50 % et disposer d'une garantie recruteur avant candidature à un programme." }, { status: 422 });
    }

    const { data: program, error: programError } = await db.from("MobilityProgram")
      .select("id,code,name,status,currency,budgetTotal,startsAt,endsAt,commitmentVerifiedAt")
      .eq("id", programId)
      .maybeSingle();
    if (programError) throw new Error(programError.message);
    if (!program || program.status !== "ACTIVE" || !program.commitmentVerifiedAt
      || String(program.currency).toUpperCase() !== "XAF"
      || String(program.code + " " + program.name).toUpperCase().includes("DEMO")
      || Number(program.budgetTotal || 0) <= 0
      || (program.startsAt && new Date(program.startsAt) > new Date())
      || (program.endsAt && new Date(program.endsAt) < new Date())) {
      return NextResponse.json({ message: "Ce programme n'est pas ouvert au financement des bénéficiaires." }, { status: 422 });
    }
    const { data: existing, error: existingError } = await db.from("MobilityProgramApplication")
      .select("id,status")
      .eq("programId", programId)
      .eq("mobilityRequestId", requestId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return NextResponse.json({ message: "Une candidature existe déjà pour ce programme.", application: existing }, { status: 409 });

    const { data: application, error } = await db.from("MobilityProgramApplication").insert({
      programId,
      mobilityRequestId: requestId,
      applicantUserId: user.id,
      status: "PENDING",
    }).select("id,programId,mobilityRequestId,status,submittedAt").single();
    if (error) throw new Error(error.message);
    const { error: eventError } = await db.from("MobilityProcessEvent").insert({
      mobilityRequestId: requestId,
      actorUserId: user.id,
      actorRole: "TALENT",
      eventType: "PROGRAM_APPLICATION_SUBMITTED",
      fromStatus: request.status,
      toStatus: request.status,
      title: "Candidature à un programme Mobility",
      description: "Le Talent a soumis son dossier éligible à un programme dont l'engagement budgétaire est vérifié.",
      metadata: { applicationId: application.id, programId },
      visibleToTalent: true,
      visibleToRecruiter: true,
      visibleToInstitution: true,
    });
    if (eventError) {
      const rollback = await db.from("MobilityProgramApplication").delete()
        .eq("id", application.id).eq("applicantUserId", user.id);
      if (rollback.error) {
        throw new Error("MOBILITY_PROGRAM_APPLICATION_AUDIT_FAILED: " + eventError.message + "; ROLLBACK_FAILED: " + rollback.error.message);
      }
      throw new Error("MOBILITY_PROGRAM_APPLICATION_AUDIT_FAILED_ROLLED_BACK: " + eventError.message);
    }
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Candidature au programme impossible." }, { status: 500 });
  }
}
