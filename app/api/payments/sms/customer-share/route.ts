import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { analyzeCustomerPaymentSmsWithAi } from "../../../../../lib/paymentSms/ai-review";
import { parsePaymentSms, type PaymentSmsProvider } from "../../../../../lib/paymentSms/parser";

export const runtime = "nodejs";
export const maxDuration = 30;

const err = (message: string, status: number, code = message) =>
  NextResponse.json({ error: code, message }, { status });

function normalizeSender(value: unknown): string {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizePhone(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 9) return "237" + digits;
  return digits;
}

function isSmsProvider(value: string): value is PaymentSmsProvider {
  return value === "SMS_MTN" || value === "SMS_ORANGE";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.paymentId || "").trim();
    const senderId = String(body.senderId || "").trim();
    const smsBody = String(body.smsBody || "");
    if (!paymentId || !senderId || !smsBody.trim()) {
      return err("Paiement, expéditeur SMS et contenu du message requis.", 400, "CUSTOMER_SMS_FIELDS_REQUIRED");
    }
    if (senderId.length > 120 || smsBody.length > 5000) {
      return err("Le SMS partagé dépasse la taille autorisée.", 413, "CUSTOMER_SMS_TOO_LARGE");
    }

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const { data: payment, error: paymentError } = await supabase.from("Payment")
      .select("id,userId,provider,status,amount,currency,payerPhone,reportedTransactionId,smsMerchantAccount,createdAt")
      .eq("id", paymentId).eq("userId", user.id).maybeSingle();
    if (paymentError) throw new Error(paymentError.message);
    if (!payment) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
    if (!isSmsProvider(String(payment.provider))) {
      return err("Ce paiement n'utilise pas Mobile Money SMS.", 409, "PAYMENT_PROVIDER_NOT_SMS");
    }
    if (!["CREATED", "PENDING"].includes(String(payment.status))) {
      return err("Cette commande n'est plus en attente.", 409, "PAYMENT_NOT_OPEN");
    }
    if (String(payment.currency).toUpperCase() !== "XAF" || !Number.isSafeInteger(Number(payment.amount)) || Number(payment.amount) <= 0) {
      return err("Montant de commande invalide.", 409, "PAYMENT_AMOUNT_INVALID");
    }
    if (!payment.smsMerchantAccount) {
      return err("Le compte marchand de cette commande n'est pas configuré.", 409, "MERCHANT_ACCOUNT_MISSING");
    }

    // The sender must match a real sender ID configured on an active Jobly
    // merchant handset for this same operator and merchant account.
    const { data: devices, error: devicesError } = await supabase.from("PaymentSmsDevice")
      .select("id,provider,merchantAccount,timeZone,senderIds,status")
      .eq("provider", String(payment.provider))
      .eq("status", "ACTIVE");
    if (devicesError) throw new Error(devicesError.message);

    const requestedSender = normalizeSender(senderId);
    const expectedMerchant = normalizePhone(payment.smsMerchantAccount);
    const matchingDevices = (devices || []).filter((device: any) =>
      normalizePhone(device.merchantAccount) === expectedMerchant &&
      Array.isArray(device.senderIds) &&
      device.senderIds.some((candidate: unknown) => normalizeSender(candidate) === requestedSender)
    );
    if (matchingDevices.length === 0) {
      return err("L'expéditeur du SMS ne correspond pas à un expéditeur opérateur vérifié par Jobly.", 422, "SMS_SENDER_NOT_ALLOWLISTED");
    }
    const timeZones = [...new Set(matchingDevices.map((device: any) => String(device.timeZone || "Africa/Douala")))];
    if (timeZones.length !== 1) {
      return err("Plusieurs profils marchands définissent ce même expéditeur avec des fuseaux différents.", 409, "SMS_SENDER_PROFILE_AMBIGUOUS");
    }

    const parserConfig = {
      senderIds: {
        [String(payment.provider)]: [requestedSender],
      } as Partial<Record<PaymentSmsProvider, string[]>>,
      merchantAccount: String(payment.smsMerchantAccount),
      timeZone: timeZones[0],
    };
    const parsed = parsePaymentSms({ senderId, body: smsBody }, parserConfig);
    const unexpectedFlags = parsed.fraudFlags.filter((flag) => flag !== "OUTGOING_PAYMENT_NOT_MERCHANT_RECEIPT");

    // A customer's SMS is expected to show an outgoing debit. Do not reuse the
    // merchant-side matcher or its "incoming credit" acceptance rules.
    if (!parsed.senderTrusted || parsed.provider !== payment.provider) {
      return err("L'opérateur indiqué par le SMS ne correspond pas à cette commande.", 422, "SMS_PROVIDER_MISMATCH");
    }
    if (parsed.status !== "SUCCESSFUL" || parsed.direction !== "OUTBOUND") {
      return err("Le SMS ne démontre pas un débit client réussi.", 422, "CUSTOMER_SMS_NOT_SUCCESSFUL_DEBIT");
    }
    if (unexpectedFlags.length > 0 || !parsed.transactionId || !parsed.amountXaf) {
      return err("J'IA ne peut pas extraire une référence et un montant fiables de ce SMS.", 422, "CUSTOMER_SMS_DATA_INCOMPLETE");
    }
    if (Number(parsed.amountXaf) !== Number(payment.amount) || parsed.currency !== String(payment.currency).toUpperCase()) {
      return err("Le montant du SMS ne correspond pas au montant de l'abonnement.", 409, "CUSTOMER_SMS_AMOUNT_MISMATCH");
    }
    if (parsed.merchantAccountFromMessage && normalizePhone(parsed.merchantAccount) !== expectedMerchant) {
      return err("Le bénéficiaire indiqué dans le SMS ne correspond pas au compte marchand de cette commande.", 409, "CUSTOMER_SMS_MERCHANT_MISMATCH");
    }
    if (parsed.payerPhone && (!payment.payerPhone || normalizePhone(parsed.payerPhone) !== normalizePhone(payment.payerPhone))) {
      return err("Le numéro payeur du SMS ne correspond pas à celui de la commande.", 409, "CUSTOMER_SMS_PAYER_MISMATCH");
    }

    const now = new Date();
    if (parsed.occurredAt) {
      const occurredAt = Date.parse(parsed.occurredAt);
      const createdAt = Date.parse(String(payment.createdAt));
      if (!Number.isFinite(occurredAt) || occurredAt < createdAt - 2 * 60 * 1000 ||
          occurredAt > now.getTime() + 5 * 60 * 1000 ||
          now.getTime() - occurredAt > 24 * 60 * 60 * 1000) {
        return err("La date du SMS ne correspond pas à la période de cette commande.", 409, "CUSTOMER_SMS_TIME_MISMATCH");
      }
    }

    const aiReview = await analyzeCustomerPaymentSmsWithAi({ senderId, body: smsBody, parsed });
    if (!aiReview.accepted) {
      return err("J'IA n'a pas pu corroborer un débit client réussi avec suffisamment de confiance.", 422, "CUSTOMER_SMS_AI_REVIEW_REJECTED");
    }

    const transactionId = String(parsed.transactionId).toUpperCase();
    const existingReference = String(payment.reportedTransactionId || "").toUpperCase();
    if (existingReference && existingReference !== transactionId) {
      return err("Une autre référence est déjà associée à cette commande.", 409, "PAYMENT_REFERENCE_CONFLICT");
    }

    const { data: claimedPayment, error: claimedError } = await supabase.from("Payment")
      .select("id")
      .eq("provider", String(payment.provider))
      .eq("reportedTransactionId", transactionId)
      .maybeSingle();
    if (claimedError) throw new Error(claimedError.message);
    if (claimedPayment && claimedPayment.id !== payment.id) {
      return err("Cette référence de transaction est déjà associée à une autre commande Jobly.", 409, "TRANSACTION_REFERENCE_ALREADY_USED");
    }

    if (!existingReference) {
      const { data: updated, error: updateError } = await supabase.from("Payment")
        .update({ reportedTransactionId: transactionId, updatedAt: now.toISOString() })
        .eq("id", payment.id)
        .eq("userId", user.id)
        .is("reportedTransactionId", null)
        .in("status", ["CREATED", "PENDING"])
        .select("id")
        .maybeSingle();
      if (updateError?.code === "23505") {
        return err("Cette référence de transaction est déjà associée à une autre commande Jobly.", 409, "TRANSACTION_REFERENCE_ALREADY_USED");
      }
      if (updateError) throw new Error(updateError.message);
      if (!updated) return err("La commande a changé pendant l'analyse. Actualisez son statut.", 409, "PAYMENT_STATE_CHANGED");
    }

    // Keep an auditable, privacy-minimised record. The SMS body itself is never stored.
    const rawMessageHash = crypto.createHash("sha256").update(smsBody, "utf8").digest("hex");
    const { error: auditError } = await supabase.from("AuditLog").insert({
      userId: user.id,
      action: "PAYMENT_CUSTOMER_SMS_SHARED_ANALYZED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        source: "android_share_sheet",
        provider: payment.provider,
        senderId: parsed.senderId,
        transactionId,
        amount: parsed.amountXaf,
        currency: parsed.currency,
        payerPhonePresent: Boolean(parsed.payerPhone),
        merchantAccountPresentInSms: parsed.merchantAccountFromMessage,
        occurredAt: parsed.occurredAt,
        rawMessageHash,
        rawMessageStored: false,
        aiReview: {
          version: aiReview.version,
          provider: aiReview.provider,
          model: aiReview.model,
          messageKind: aiReview.messageKind,
          status: aiReview.status,
          direction: aiReview.direction,
          confidence: aiReview.confidence,
          suspiciousSignals: aiReview.suspiciousSignals,
          accepted: aiReview.accepted,
          flags: aiReview.flags,
        },
        entitlementChanged: false,
      },
    });

    return NextResponse.json({
      accepted: true,
      reviewed: true,
      transactionId,
      amount: parsed.amountXaf,
      currency: parsed.currency,
      occurredAt: parsed.occurredAt,
      aiReview: {
        provider: aiReview.provider,
        model: aiReview.model,
        confidence: aiReview.confidence,
      },
      waitingForMerchantConfirmation: true,
      entitlementChanged: false,
      auditLogWarning: auditError ? "CUSTOMER_SMS_AUDIT_LOG_FAILED" : null,
      message: "SMS client analysé. La référence est associée à votre commande ; Jobly attend encore une preuve indépendante du compte marchand ou du prestataire.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Aucun moteur IA JOBLY disponible.") {
      return err("J'IA ne peut pas analyser ce SMS pour le moment. Aucun abonnement n'a été activé ; réessayez lorsque le service sera disponible.", 503, "CUSTOMER_SMS_AI_UNAVAILABLE");
    }
    return err(error instanceof Error ? error.message : "Analyse du SMS client impossible.", 500);
  }
}
