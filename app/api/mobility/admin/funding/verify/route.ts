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
      return NextResponse.json({ message: "Vérification des décaissements réservée à un administrateur Jobly." }, { status: 403 });
    }
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-admin-funding-verify",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 60 }, { limit: 20, windowSeconds: 3600 }],
      ipWindows: [{ limit: 10, windowSeconds: 60 }, { limit: 40, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const body = await req.json().catch(() => ({}));
    const transactionId = String(body.transactionId || "").trim();
    if (!transactionId || body.confirmExternalTransfer !== true) {
      return NextResponse.json({ message: "Identifiant et confirmation explicite du transfert externe requis." }, { status: 400 });
    }
    const { data, error } = await db.rpc("mobility_verify_funding_disbursement", {
      p_transaction_id: transactionId,
      p_admin_user_id: String(user.id),
    });
    if (error) {
      const message = String(error.message || "Vérification impossible.");
      const clientError = /MOBILITY_(ADMIN_REQUIRED|TRANSACTION_NOT_FOUND|TRANSACTION_NOT_VERIFIABLE)/.test(message);
      return NextResponse.json({ message }, { status: clientError ? 422 : 500 });
    }
    const audit = await db.from("CEOAuditLog").insert({
      adminUserId: user.id,
      action: "MOBILITY_FUNDING_DISBURSEMENT_VERIFIED",
      endpoint: "/api/mobility/admin/funding/verify",
      metadata: { transactionId, verifiedAt: new Date().toISOString() },
    });
    if (audit.error) throw new Error(audit.error.message);
    return NextResponse.json({ transaction: data, message: "Transfert externe contrôlé et confirmé." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Vérification du décaissement impossible." }, { status: 500 });
  }
}
