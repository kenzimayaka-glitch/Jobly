import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getProvider } from "../../../../../lib/paymentProviders";

const err = (message: string, status: number, code = message) => NextResponse.json({ error: code, message }, { status });
const ref = (value: unknown) => {
  const valueText = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9._-]{4,63}$/.test(valueText) ? valueText : null;
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
      const rawReference = String(body.transactionId || "").trim();
      const transactionId = rawReference ? ref(rawReference) : null;
      if (rawReference && !transactionId) return err("La référence de transaction est invalide.", 400, "TRANSACTION_REFERENCE_INVALID");
      if (payment.status === "SUCCESSFUL") return NextResponse.json({ accepted: true, matched: true, payment, idempotent: true });
      if (!["CREATED", "PENDING"].includes(String(payment.status))) return err("Ce paiement ne peut plus être modifié.", 409, "PAYMENT_NOT_OPEN");
      if (!payment.smsMerchantAccount) return err("Compte marchand manquant.", 409, "MERCHANT_ACCOUNT_MISSING");

      // A reference typed by the customer is an untrusted lookup hint only.
      // Never persist it before a matching trusted merchant receipt exists:
      // a typo would otherwise pin the order to a wrong reference and prevent
      // the later automatic merchant-SMS matcher from finding the real receipt.
      const currentPayment = payment;

      // Automatic ingestion normally matches and finalizes the payment before the
      // customer opens this endpoint. This path also supports an optional exact
      // reference if the receipt arrived while several orders were ambiguous.
      if (transactionId) {
        const { data: receipt, error: receiptError } = await supabase.from("PaymentSmsReceipt")
          .select("id,provider,transactionId,amount,currency,payerPhone,merchantAccount,status,processingStatus,matchedPaymentId")
          .eq("provider", String(payment.provider)).eq("transactionId", transactionId).maybeSingle();
        if (receiptError) throw new Error(receiptError.message);
        if (receipt) {
          if (receipt.processingStatus === "MATCHED") {
            if (receipt.matchedPaymentId !== payment.id) return err("Transaction déjà associée à une autre commande.", 409, "TRANSACTION_ALREADY_USED");
            const { data: latest, error: latestError } = await supabase.from("Payment").select("*").eq("id", payment.id).maybeSingle();
            if (latestError) throw new Error(latestError.message);
            return NextResponse.json({ accepted: true, matched: true, payment: latest || currentPayment, idempotent: true });
          }
          if (receipt.status === "SUCCESSFUL" && receipt.processingStatus !== "REJECTED") {
            if (Number(receipt.amount) !== Number(currentPayment.amount) || String(receipt.currency).toUpperCase() !== String(currentPayment.currency).toUpperCase()) return err("Montant ou devise différents.", 409, "SMS_AMOUNT_MISMATCH");
            if (digits(receipt.merchantAccount) !== digits(currentPayment.smsMerchantAccount)) return err("Compte marchand différent.", 409, "SMS_MERCHANT_MISMATCH");
            if (receipt.payerPhone && currentPayment.payerPhone && digits(receipt.payerPhone) !== digits(currentPayment.payerPhone)) return err("Numéro payeur différent.", 409, "SMS_PAYER_MISMATCH");
            if (receipt.matchedPaymentId && receipt.matchedPaymentId !== currentPayment.id) return err("Transaction déjà utilisée.", 409, "TRANSACTION_ALREADY_USED");

            const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_payment_from_sms", {
              p_receipt_id: receipt.id, p_payment_id: currentPayment.id, p_user_id: String(user.id),
              p_now: new Date().toISOString(), p_match_reason: "CUSTOMER_TRANSACTION_REFERENCE",
            });
            if (finalizeError) {
              const message = String(finalizeError.message || "");
              if (message.includes("SMS_TRANSACTION_ALREADY_CLAIMED") || message.includes("INVALID_PAYMENT_TRANSITION")) return err("Transaction déjà rapprochée.", 409, "PAYMENT_ALREADY_PROCESSED");
              if (message.includes("SUBSCRIPTION_NOT_PENDING")) return err("Cet abonnement n'est plus en attente.", 409, "SUBSCRIPTION_NOT_PENDING");
              throw new Error(message);
            }
            return NextResponse.json({ accepted: true, matched: true, payment: (finalized as any)?.payment ?? currentPayment, commission: (finalized as any)?.commission ?? null, idempotent: Boolean((finalized as any)?.idempotent) });
          }
          if (receipt.status !== "SUCCESSFUL" || receipt.processingStatus === "REJECTED") {
            return err("La confirmation SMS n'est pas une preuve de paiement réussi.", 409, "SMS_RECEIPT_NOT_SUCCESSFUL");
          }
        }
      }

      // No reference is required to wait for the automatic merchant-SMS match.
      // This endpoint is a status refresh, not a manual proof-of-payment action.
      const { data: latest, error: latestError } = await supabase.from("Payment").select("*").eq("id", payment.id).maybeSingle();
      if (latestError) throw new Error(latestError.message);
      const refreshed = latest || currentPayment;
      return NextResponse.json({
        accepted: true,
        matched: refreshed.status === "SUCCESSFUL",
        payment: refreshed,
        message: refreshed.status === "SUCCESSFUL"
          ? "Paiement confirmé. Votre service est activé."
          : "La confirmation opérateur est rapprochée automatiquement. Vous pouvez continuer à utiliser Jobly.",
      });
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
