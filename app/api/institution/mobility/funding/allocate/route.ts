import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds } from "../../../../../../lib/mobilityAccess";

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const body = await req.json().catch(() => ({}));
    const programId = String(body.programId || "").trim();
    const requestId = String(body.requestId || "").trim();
    const amount = Number(body.amount);
    const currency = String(body.currency || "XAF").toUpperCase();
    if (!programId || !requestId || !Number.isFinite(amount) || amount <= 0 || currency !== "XAF") {
      return NextResponse.json({ message: "Programme, dossier, montant positif et devise XAF requis." }, { status: 400 });
    }
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    const { data: program, error: programError } = await db.from("MobilityProgram")
      .select("id,institutionId,status,code,name,currency")
      .eq("id", programId)
      .maybeSingle();
    if (programError) throw new Error(programError.message);
    if (!program || !institutionIds.includes(String(program.institutionId))) {
      return NextResponse.json({ message: "Programme hors du périmètre institutionnel autorisé." }, { status: 403 });
    }
    const { data, error } = await db.rpc("mobility_approve_funding_allocation", {
      p_program_id: programId,
      p_request_id: requestId,
      p_actor_user_id: String(user.id),
      p_amount: amount,
      p_currency: currency,
    });
    if (error) {
      const message = String(error.message || "Allocation impossible.");
      const clientError = /MOBILITY_(PROGRAM_NOT_FUNDING_READY|INSTITUTION_ADMIN_REQUIRED|REQUEST_NOT_FUNDING_ELIGIBLE|FUNDING_CURRENCY_MISMATCH|FUNDING_EXCEEDS_MOBILITY_COST|ALLOCATION_ALREADY_EXISTS|PROGRAM_BUDGET_EXCEEDED|REQUEST_NOT_FOUND|PROGRAM_NOT_FOUND)/.test(message);
      return NextResponse.json({ message }, { status: clientError ? 422 : 500 });
    }
    return NextResponse.json({ allocation: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Allocation Mobility impossible." }, { status: 500 });
  }
}
