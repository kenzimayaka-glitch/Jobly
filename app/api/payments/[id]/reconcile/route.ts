import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

const err = (message: string, status: number, code = message) =>
  NextResponse.json({ error: code, message }, { status });

const allowed = new Set(["PENDING", "SUCCESSFUL", "FAILED"]);
const transitions: Record<string, Set<string>> = {
  CREATED: new Set(["PENDING", "FAILED"]),
  PENDING: new Set(["SUCCESSFUL", "FAILED"]),
  SUCCESSFUL: new Set(),
  FAILED: new Set(),
  REFUNDED: new Set(),
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const supabase = adminClient();
    const actor = await ensureUser(supabase, auth);
    if (!["ADMIN", "FINANCE"].includes(actor.role)) {
      return err("Accès administrateur requis.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = String(body.status || "").toUpperCase();
    const reason = String(body.reason || "").trim().slice(0, 500);
    const externalId = body.externalId ? String(body.externalId).trim() : "";

    if (status === "REFUNDED") {
      return err(
        "Remboursement fournisseur non disponible : le statut ne peut pas être modifié sans confirmation d'un remboursement réellement exécuté.",
        501,
        "PROVIDER_REFUND_UNSUPPORTED",
      );
    }
    if (!allowed.has(status)) return err("Statut de rapprochement invalide.", 400, "RECONCILIATION_FAILED");
    if ((status === "FAILED" || status === "SUCCESSFUL") && !reason) {
      return err("Une justification Finance est obligatoire pour confirmer un succès ou un échec.", 400, "RECONCILIATION_REASON_REQUIRED");
    }

    const { data: payment, error: paymentError } = await supabase
      .from("Payment")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (paymentError) throw new Error(paymentError.message);
    if (!payment) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
    if (payment.status === status) {
      return NextResponse.json({ payment, reconciledBy: actor.id, idempotent: true });
    }
    if (!transitions[payment.status]?.has(status)) {
      return err(
        "Transition impossible: " + payment.status + " → " + status + ".",
        422,
        "INVALID_PAYMENT_TRANSITION",
      );
    }
    if (externalId && payment.externalId && payment.externalId !== externalId) {
      return err("externalId déjà associé à un autre paiement.", 409, "EXTERNAL_ID_CONFLICT");
    }
    if (status === "SUCCESSFUL" && !externalId && !payment.externalId) {
      return err("Une référence de transaction fournisseur est obligatoire pour confirmer un paiement.", 422, "PROVIDER_REFERENCE_REQUIRED");
    }

    const now = new Date().toISOString();
    if (externalId && !payment.externalId) {
      const { error: referenceError } = await supabase.from("Payment")
        .update({ externalId, updatedAt: now })
        .eq("id", id)
        .is("externalId", null);
      if (referenceError) throw new Error(referenceError.message);
    }

    // One SECURITY DEFINER transaction owns the Payment + Subscription transition.
    const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_payment", {
      p_payment_id: String(payment.id),
      p_user_id: String(payment.userId),
      p_status: status,
      p_amount: Number(payment.amount),
      p_now: now,
      p_failure_reason: status === "FAILED" ? reason : null,
    });

    if (finalizeError) {
      const message = String(finalizeError.message || "");
      if (message.includes("PAYMENT_NOT_FOUND")) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
      if (message.includes("AMOUNT_MISMATCH")) return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
      if (message.includes("INVALID_PAYMENT_TRANSITION")) return err("Transition de paiement invalide.", 409, "INVALID_PAYMENT_TRANSITION");
      if (message.includes("SUBSCRIPTION_NOT_FOUND")) return err("Abonnement introuvable.", 409, "SUBSCRIPTION_NOT_FOUND");
      if (message.includes("INVALID_PAYMENT_STATUS")) return err("Statut provider invalide.", 409, "INVALID_PAYMENT_STATUS");
      throw new Error(finalizeError.message);
    }

    const result = finalized as { payment?: unknown; commission?: unknown; idempotent?: boolean };
    const { error: auditError } = await supabase.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: actor.id,
      action: "PAYMENT_RECONCILED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        previousStatus: payment.status,
        status,
        reason: reason || null,
        externalId: externalId || payment.externalId || null,
      },
    });

    return NextResponse.json({
      payment: result.payment,
      reconciledBy: actor.id,
      commission: result.commission ?? null,
      idempotent: Boolean(result.idempotent),
      auditLogWarning: auditError ? "PAYMENT_UPDATED_BUT_AUDIT_LOG_FAILED" : null,
    });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Rapprochement impossible.", 500);
  }
}
