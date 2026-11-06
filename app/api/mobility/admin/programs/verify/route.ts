import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../../../lib/server-security";

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (String(user.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({ message: "Vérification budgétaire réservée à un administrateur Jobly." }, { status: 403 });
    }
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-admin-program-verify",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 60 }, { limit: 20, windowSeconds: 3600 }],
      ipWindows: [{ limit: 10, windowSeconds: 60 }, { limit: 40, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const body = await req.json().catch(() => ({}));
    const programId = String(body.programId || "").trim();
    if (!programId || body.activate !== true) {
      return NextResponse.json({ message: "programId et confirmation d'activation requis." }, { status: 400 });
    }
    const { data: program, error: lookupError } = await db.from("MobilityProgram")
      .select("id,code,name,status,budgetTotal,currency,commitmentReference,commitmentEvidenceUrl")
      .eq("id", programId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!program) return NextResponse.json({ message: "Programme introuvable." }, { status: 404 });
    if (String(program.code + " " + program.name).toUpperCase().includes("DEMO")) {
      return NextResponse.json({ message: "Les programmes de démonstration ne peuvent jamais recevoir d'allocation." }, { status: 422 });
    }
    if (!Number.isFinite(Number(program.budgetTotal)) || Number(program.budgetTotal) <= 0
      || String(program.currency).toUpperCase() !== "XAF"
      || !String(program.commitmentReference || "").trim()
      || !String(program.commitmentEvidenceUrl || "").startsWith("https://")) {
      return NextResponse.json({ message: "Le montant, la devise XAF, la référence et la preuve HTTPS de l'engagement budgétaire doivent être contrôlés." }, { status: 422 });
    }
    const audit = await db.from("CEOAuditLog").insert({
      adminUserId: user.id,
      action: "MOBILITY_PROGRAM_BUDGET_VERIFY_ATTEMPT",
      endpoint: "/api/mobility/admin/programs/verify",
      metadata: { programId, attemptedAt: new Date().toISOString() },
    });
    if (audit.error) throw new Error(audit.error.message);
    const { data, error } = await db.from("MobilityProgram").update({
      status: "ACTIVE",
      commitmentVerifiedByUserId: user.id,
      commitmentVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq("id", programId).select("id,code,name,status,budgetTotal,currency,commitmentVerifiedAt,commitmentVerifiedByUserId").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ program: data }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Vérification budgétaire impossible." }, { status: 500 });
  }
}
