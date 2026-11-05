import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds } from "../../../../../../lib/mobilityAccess";

const isHttps = (value: unknown) => {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const body = await req.json().catch(() => ({}));
    const allocationId = String(body.allocationId || "").trim();
    const providerId = String(body.providerId || "").trim();
    const externalReference = String(body.externalReference || "").trim();
    const evidenceUrl = String(body.evidenceUrl || "").trim();
    const idempotencyKey = String(body.idempotencyKey || "").trim();
    const amount = Number(body.amount);
    if (!allocationId || !providerId || !externalReference || !isHttps(evidenceUrl) || !idempotencyKey
      || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "Allocation, prestataire financier vérifié, montant, référence externe, preuve HTTPS et clé d'idempotence requis." }, { status: 400 });
    }
    const { data: allocation, error: allocationError } = await db.from("MobilityFundingAllocation")
      .select("id,programId")
      .eq("id", allocationId)
      .maybeSingle();
    if (allocationError) throw new Error(allocationError.message);
    if (!allocation) return NextResponse.json({ message: "Allocation introuvable." }, { status: 404 });
    const { data: program, error: programError } = await db.from("MobilityProgram")
      .select("id,institutionId")
      .eq("id", allocation.programId)
      .maybeSingle();
    if (programError) throw new Error(programError.message);
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!program || !institutionIds.includes(String(program.institutionId))) {
      return NextResponse.json({ message: "Allocation hors du périmètre institutionnel autorisé." }, { status: 403 });
    }
    const { data, error } = await db.rpc("mobility_record_funding_disbursement", {
      p_allocation_id: allocationId,
      p_provider_id: providerId,
      p_actor_user_id: String(user.id),
      p_amount: amount,
      p_external_reference: externalReference,
      p_evidence_url: evidenceUrl,
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      const message = String(error.message || "Décaissement impossible.");
      const clientError = /MOBILITY_(DISBURSEMENT_EVIDENCE_REQUIRED|ALLOCATION_NOT_FOUND|ALLOCATION_NOT_DISBURSABLE|INSTITUTION_ADMIN_REQUIRED|VERIFIED_FINANCE_PROVIDER_REQUIRED|DISBURSEMENT_CURRENCY_NOT_SUPPORTED|DISBURSEMENT_EXCEEDS_ALLOCATION)/.test(message);
      return NextResponse.json({ message }, { status: clientError ? 422 : 500 });
    }
    return NextResponse.json({
      transaction: data,
      message: "Preuve externe reçue, en attente de vérification indépendante par Jobly. Aucun paiement n'est réputé exécuté à ce stade.",
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Soumission du décaissement impossible." }, { status: 500 });
  }
}
