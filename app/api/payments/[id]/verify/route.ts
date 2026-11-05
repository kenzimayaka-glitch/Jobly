import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getProvider } from "../../../../../lib/paymentProviders";

const err = (message: string, status: number, code = message) =>
  NextResponse.json({ error: code, message }, { status });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const { data: payment, error } = await supabase
      .from("Payment")
      .select("*")
      .eq("id", id)
      .eq("userId", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!payment) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
    if (!payment.externalId) return err("Référence provider absente.", 409, "EXTERNAL_ID_MISSING");

    const verification = await getProvider(String(payment.provider)).verifyPayment(payment.externalId);
    if (verification.externalId !== payment.externalId) {
      return err("Référence provider différente.", 409, "EXTERNAL_ID_MISMATCH");
    }
    if (verification.amount != null && Number(verification.amount) !== Number(payment.amount)) {
      return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
    }
    if (verification.currency && String(verification.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
      return err("Devise provider différente.", 409, "CURRENCY_MISMATCH");
    }

    const now = new Date().toISOString();
    const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_payment", {
      p_payment_id: String(payment.id),
      p_user_id: String(user.id),
      p_status: String(verification.status),
      p_amount: Number(payment.amount),
      p_now: now,
      p_failure_reason: verification.status === "FAILED"
        ? (verification.message || "Provider returned FAILED")
        : null,
    });

    if (finalizeError) {
      const code = String(finalizeError.message || "");
      if (code.includes("PAYMENT_NOT_FOUND")) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
      if (code.includes("AMOUNT_MISMATCH")) return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
      if (code.includes("INVALID_PAYMENT_TRANSITION")) return err("Transition de paiement invalide.", 409, "INVALID_PAYMENT_TRANSITION");
      if (code.includes("SUBSCRIPTION_NOT_FOUND")) return err("Abonnement introuvable.", 409, "SUBSCRIPTION_NOT_FOUND");
      if (code.includes("SUBSCRIPTION_NOT_PENDING")) return err("Cet abonnement n'est plus en attente.", 409, "SUBSCRIPTION_NOT_PENDING");
      if (code.includes("INVALID_PAYMENT_STATUS")) return err("Statut provider invalide.", 409, "INVALID_PAYMENT_STATUS");
      throw new Error(finalizeError.message);
    }

    const result = finalized as { payment?: unknown; commission?: unknown; idempotent?: boolean };
    return NextResponse.json({
      payment: result.payment,
      verification,
      commission: result.commission ?? null,
      idempotent: Boolean(result.idempotent),
    });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Vérification impossible.", 500);
  }
}
