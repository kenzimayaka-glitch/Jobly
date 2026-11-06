import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getProvider } from "../../../../../lib/paymentProviders";

const err = (message: string, status: number, code = message) => NextResponse.json({ error: code, message }, { status });
const ref = (value: unknown) => {
  const valueText = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9_-]{4,63}$/.test(valueText) ? valueText : null;
};
const digits = (value: unknown) => String(value || "").replace(/\D/g, "");

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const { data: payment, error } = await supabase.from("Payment").select("*").eq("id", id).eq("userId", user.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");

    if (["SMS_MTN", "SMS_ORANGE"].includes(String(payment.provider))) {
      const body = await request.json().catch(() => ({}));
      const transactionId = ref(body.transactionId);
      if (!transactionId) return err("Saisissez la référence exacte du SMS opérateur.", 400, "TRANSACTION_REFERENCE_REQUIRED");
      if (payment.status === "SUCCESSFUL") return NextResponse.json({ accepted: true, matched: true, payment, idempotent: true });
      if (!["CREATED", "PENDING"].includes(String(payment.status))) return err("Ce paiement ne peut plus être modifié.", 409, "PAYMENT_NOT_OPEN");
      // A customer may correct a mistyped reference while the order remains open.
      // A unique DB index prevents the same operator transaction from being claimed twice.
      if (!payment.smsMerchantAccount) return err("Compte marchand manquant.", 409, "MERCHANT_ACCOUNT_MISSING");
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase.from("Payment")
        .update({ reportedTransactionId: transactionId, updatedAt: now })
        .eq("id", payment.id).eq("userId", user.id).in("status", ["CREATED", "PENDING"])
        .select("*").maybeSingle();
      if (updateError?.code === "23505") return err("Cette référence est déjà associée à une autre commande.", 409, "TRANSACTION_REFERENCE_ALREADY_USED");
      if (updateError) throw new Error(updateError.message);
      if (!updated) return err("La commande a changé. Actualisez son statut.", 409, "PAYMENT_STATE_CHANGED");

      const { data: receipt, error: receiptError } = await supabase.from("PaymentSmsReceipt")
        .select("id,provider,transactionId,amount,currency,payerPhone,merchantAccount,status,processingStatus,matchedPaymentId")
        .eq("provider", String(payment.provider)).eq("transactionId", transactionId).maybeSingle();
      if (receiptError) throw new Error(receiptError.message);
      if (!receipt) return NextResponse.json({
        accepted: true, matched: false, payment: { id: updated.id, status: updated.status },
        message: "Référence enregistrée. Jobly rapprochera automatiquement la confirmation opérateur dès sa réception. Vous pouvez continuer à utiliser Jobly.",
      });
      if (receipt.processingStatus === "MATCHED") {
        if (receipt.matchedPaymentId !== payment.id) return err("Transaction déjà associée à une autre commande.", 409, "TRANSACTION_ALREADY_USED");
        return NextResponse.json({ accepted: true, matched: true, payment: updated, idempotent: true });
      }
      if (receipt.status !== "SUCCESSFUL" || receipt.processingStatus === "REJECTED") return err("La confirmation SMS n'est pas une preuve de paiement réussi.", 409, "SMS_RECEIPT_NOT_SUCCESSFUL");
      if (Number(receipt.amount) !== Number(updated.amount) || String(receipt.currency).toUpperCase() !== String(updated.currency).toUpperCase()) return err("Montant ou devise différents.", 409, "SMS_AMOUNT_MISMATCH");
      if (digits(receipt.merchantAccount) !== digits(updated.smsMerchantAccount)) return err("Compte marchand différent.", 409, "SMS_MERCHANT_MISMATCH");
      if (receipt.payerPhone && updated.payerPhone && digits(receipt.payerPhone) !== digits(updated.payerPhone)) return err("Numéro payeur différent.", 409, "SMS_PAYER_MISMATCH");
      if (receipt.matchedPaymentId && receipt.matchedPaymentId !== updated.id) return err("Transaction déjà utilisée.", 409, "TRANSACTION_ALREADY_USED");

      const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_payment_from_sms", {
        p_receipt_id: receipt.id, p_payment_id: updated.id, p_user_id: String(user.id),
        p_now: now, p_match_reason: "CUSTOMER_TRANSACTION_REFERENCE",
      });
      if (finalizeError) {
        const message = String(finalizeError.message || "");
        if (message.includes("SMS_TRANSACTION_ALREADY_CLAIMED") || message.includes("INVALID_PAYMENT_TRANSITION")) return err("Transaction déjà rapprochée.", 409, "PAYMENT_ALREADY_PROCESSED");
        if (message.includes("SUBSCRIPTION_NOT_PENDING")) return err("Cet abonnement n'est plus en attente.", 409, "SUBSCRIPTION_NOT_PENDING");
        throw new Error(message);
      }
      return NextResponse.json({ accepted: true, matched: true, payment: (finalized as any)?.payment ?? updated, commission: (finalized as any)?.commission ?? null, idempotent: Boolean((finalized as any)?.idempotent) });
    }

    if (!payment.externalId) return err("Référence provider absente.", 409, "EXTERNAL_ID_MISSING");
    const verification = await getProvider(String(payment.provider)).verifyPayment(payment.externalId);
    if (verification.externalId !== payment.externalId) return err("Référence provider différente.", 409, "EXTERNAL_ID_MISMATCH");
    if (verification.amount != null && Number(verification.amount) !== Number(payment.amount)) return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
    if (verification.currency && String(verification.currency).toUpperCase() !== String(payment.currency).toUpperCase()) return err("Devise provider différente.", 409, "CURRENCY_MISMATCH");
    const now = new Date().toISOString();
    const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_payment", {
      p_payment_id: String(payment.id), p_user_id: String(user.id), p_status: String(verification.status),
      p_amount: Number(payment.amount), p_now: now,
      p_failure_reason: verification.status === "FAILED" ? (verification.message || "Provider returned FAILED") : null,
    });
    if (finalizeError) {
      const message = String(finalizeError.message || "");
      if (message.includes("PAYMENT_NOT_FOUND")) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
      if (message.includes("AMOUNT_MISMATCH")) return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
      if (message.includes("INVALID_PAYMENT_TRANSITION")) return err("Transition de paiement invalide.", 409, "INVALID_PAYMENT_TRANSITION");
      if (message.includes("SUBSCRIPTION_NOT_FOUND")) return err("Abonnement introuvable.", 409, "SUBSCRIPTION_NOT_FOUND");
      if (message.includes("SUBSCRIPTION_NOT_PENDING")) return err("Cet abonnement n'est plus en attente.", 409, "SUBSCRIPTION_NOT_PENDING");
      if (message.includes("INVALID_PAYMENT_STATUS")) return err("Statut provider invalide.", 409, "INVALID_PAYMENT_STATUS");
      throw new Error(message);
    }
    const result = finalized as { payment?: unknown; commission?: unknown; idempotent?: boolean };
    return NextResponse.json({ payment: result.payment, verification, commission: result.commission ?? null, idempotent: Boolean(result.idempotent) });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Vérification impossible.", 500);
  }
}
