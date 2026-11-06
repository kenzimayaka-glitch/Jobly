import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient } from "../../../../../lib/server-auth";
import { matchPaymentSmsToOrder, type PaymentSmsCandidate } from "../../../../../lib/paymentSms/matching";
import { parsePaymentSms, type PaymentSmsProvider } from "../../../../../lib/paymentSms/parser";
import { analyzePaymentSmsWithAi } from "../../../../../lib/paymentSms/ai-review";

export const runtime = "nodejs";
export const maxDuration = 60;

const err = (message: string, status: number, code = message) => NextResponse.json({ error: code, message }, { status });

function tokenMatches(rawToken: string, expectedHash: string): boolean {
  if (!rawToken || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = crypto.createHash("sha256").update(rawToken).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest) {
  try {
    const deviceId = String(request.headers.get("x-jobly-sms-device") || "").trim();
    const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!deviceId || !token) return err("Téléphone marchand non authentifié.", 401, "DEVICE_AUTH_REQUIRED");

    const body = await request.json().catch(() => ({}));
    const senderId = String(body.senderId || "").trim();
    const smsBody = String(body.smsBody || "");
    if (!senderId || !smsBody.trim()) return err("Expéditeur et contenu du SMS requis.", 400, "SMS_CONTENT_REQUIRED");
    if (senderId.length > 120 || smsBody.length > 5000) return err("Contenu du SMS invalide.", 413, "SMS_TOO_LARGE");

    const supabase = adminClient();
    const { data: device, error: deviceError } = await supabase.from("PaymentSmsDevice")
      .select("id,provider,merchantAccount,timeZone,senderIds,tokenHash,status")
      .eq("id", deviceId).maybeSingle();
    if (deviceError) throw new Error(deviceError.message);
    if (!device || device.status !== "ACTIVE" || !tokenMatches(token, String(device.tokenHash))) {
      return err("Téléphone marchand non autorisé.", 401, "DEVICE_NOT_AUTHORIZED");
    }

    const provider = String(device.provider) as PaymentSmsProvider;
    const senderAllowlist: Partial<Record<PaymentSmsProvider, string[]>> = {
      [provider]: Array.isArray(device.senderIds) ? device.senderIds.map((value: unknown) => String(value)) : [],
    };
    const parsed = parsePaymentSms(
      { senderId, body: smsBody },
      { senderIds: senderAllowlist, merchantAccount: String(device.merchantAccount), timeZone: String(device.timeZone || "Africa/Douala") },
    );
    const receivedAt = new Date().toISOString();
    const rawMessageHash = crypto.createHash("sha256").update(smsBody, "utf8").digest("hex");
    const payloadHash = crypto.createHash("sha256")
      .update(`${device.id}\n${parsed.senderId}\n${rawMessageHash}`)
      .digest("hex");

    const { data: duplicateReceipt, error: duplicateError } = await supabase
      .from("PaymentSmsReceipt").select("id,processingStatus")
      .eq("payloadHash", payloadHash).maybeSingle();
    if (duplicateError) throw new Error(duplicateError.message);
    // A receipt left in RECEIVED means a previous server attempt stopped before
    // finalization. Reuse its already-reviewed evidence rather than dropping the retry.
    const retryingReceipt = duplicateReceipt?.processingStatus === "RECEIVED";
    if (duplicateReceipt && !retryingReceipt) return NextResponse.json({
      accepted: true, duplicate: true, receiptId: duplicateReceipt.id,
      processingStatus: duplicateReceipt.processingStatus, entitlementChanged: false,
    });

    // Every new unique SMS receives one mandatory AI review. A retry of an already
    // reviewed RECEIVED receipt reuses the stored decision and does not spend another AI call.
    const aiReview = !retryingReceipt && parsed.senderTrusted && parsed.provider
      ? await analyzePaymentSmsWithAi({ senderId, body: smsBody, parsed })
      : null;

    const { error: heartbeatError } = await supabase.from("PaymentSmsDevice")
      .update({ lastSeenAt: receivedAt, updatedAt: receivedAt }).eq("id", device.id).eq("status", "ACTIVE");
    if (heartbeatError) throw new Error(heartbeatError.message);

    const allFraudFlags = [...parsed.fraudFlags, ...(aiReview?.flags || [])];
    const initialStatus = !parsed.senderTrusted || parsed.status !== "SUCCESSFUL" ||
      !parsed.transactionId || !parsed.amountXaf || allFraudFlags.length > 0 ||
      !aiReview?.accepted ? "REJECTED" : "RECEIVED";
    let receiptId = duplicateReceipt?.id || "";
    if (!retryingReceipt) {
      const { data: receipt, error: receiptError } = await supabase.from("PaymentSmsReceipt").insert({
        deviceId: device.id,
        provider,
        senderId: parsed.senderId,
        transactionId: parsed.transactionId,
        amount: parsed.amountXaf,
        currency: parsed.currency,
        payerPhone: parsed.payerPhone,
        merchantAccount: String(device.merchantAccount),
        status: parsed.status,
        processingStatus: initialStatus,
        occurredAt: parsed.occurredAt,
        receivedAt,
        parserVersion: parsed.parserVersion,
        payloadHash,
        rawMessageHash,
        fraudFlags: allFraudFlags,
        matchDetails: {
          source: "android_sms_receiver",
          bodyPersisted: false,
          aiReview: aiReview ? {
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
          } : { skipped: true, reason: "UNTRUSTED_OR_AMBIGUOUS_SENDER" },
        },
      }).select("id,processingStatus,matchedPaymentId").single();

      if (receiptError?.code === "23505") return NextResponse.json({ accepted: true, duplicate: true, entitlementChanged: false });
      if (receiptError) throw new Error(receiptError.message);
      receiptId = receipt.id;
      if (initialStatus === "REJECTED") {
        return NextResponse.json({ accepted: true, receiptId, processingStatus: "REJECTED", entitlementChanged: false });
      }
    }
    if (!receiptId) throw new Error("SMS_RECEIPT_ID_UNAVAILABLE");

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: candidates, error: candidateError } = await supabase.from("Payment")
      .select("id,userId,provider,status,amount,currency,payerPhone,reportedTransactionId,smsMerchantAccount,createdAt")
      .eq("provider", provider)
      .eq("amount", parsed.amountXaf)
      .eq("currency", "XAF")
      .eq("smsMerchantAccount", String(device.merchantAccount))
      .in("status", ["CREATED", "PENDING"])
      .gte("createdAt", cutoff)
      .lte("createdAt", receivedAt)
      .limit(51);
    if (candidateError) throw new Error(candidateError.message);

    const match = matchPaymentSmsToOrder({
      parsed,
      merchantAccount: String(device.merchantAccount),
      candidates: (candidates || []) as PaymentSmsCandidate[],
      candidateLimitReached: (candidates || []).length > 50,
      now: new Date(receivedAt),
    });
    if (match.outcome !== "MATCHED") {
      const processingStatus = match.outcome === "AMBIGUOUS" ? "AMBIGUOUS" : "UNMATCHED";
      const { error: updateError } = await supabase.from("PaymentSmsReceipt")
        .update({ processingStatus, matchDetails: { reason: match.reason, candidateCount: match.candidateCount } }).eq("id", receiptId);
      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ accepted: true, receiptId, processingStatus, entitlementChanged: false });
    }

    const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_payment_from_sms", {
      p_receipt_id: receiptId,
      p_payment_id: match.payment.id,
      p_user_id: match.payment.userId,
      p_now: receivedAt,
      p_match_reason: match.reason,
    });
    if (finalizeError) {
      const finalizeCode = String((finalizeError as { code?: unknown }).code || "");
      const finalizeMessage = String(finalizeError.message || "");
      const permanentFailure = /^23/.test(finalizeCode) ||
        ["42501", "22P02"].includes(finalizeCode) ||
        /\b(?:SMS_[A-Z_]+|INVALID_PAYMENT_TRANSITION|PAYMENT_NOT_FOUND|AMOUNT_MISMATCH|SUBSCRIPTION_NOT_FOUND|SUBSCRIPTION_NOT_PENDING)\b/.test(finalizeMessage);
      if (!permanentFailure) {
        // Leave the receipt in RECEIVED so the WorkManager retry can resume the
        // same already-reviewed SMS after a transient database/network failure.
        return err(
          "La confirmation serveur est temporairement indisponible. Le téléphone marchand réessaiera automatiquement.",
          503,
          "SMS_FINALIZATION_RETRY",
        );
      }
      const { error: rejectError } = await supabase.from("PaymentSmsReceipt")
        .update({ processingStatus: "REJECTED", matchDetails: { reason: "FINALIZE_PAYMENT_REJECTED", errorCode: finalizeMessage.slice(0, 100) } })
        .eq("id", receiptId).in("processingStatus", ["RECEIVED", "UNMATCHED", "AMBIGUOUS"]);
      if (rejectError) throw new Error(rejectError.message);
      return NextResponse.json({ accepted: true, receiptId, processingStatus: "REJECTED", entitlementChanged: false });
    }
    return NextResponse.json({ accepted: true, receiptId, processingStatus: "MATCHED", entitlementChanged: true, idempotent: Boolean((finalized as any)?.idempotent) });
  } catch (error) {
    if (error instanceof Error && error.message === "Aucun moteur IA JOBLY disponible.") {
      return err(
        "Le contrôle IA Mobile Money est temporairement indisponible. Le SMS chiffré reste dans la file du téléphone marchand et sera réessayé.",
        503,
        "SMS_AI_UNAVAILABLE",
      );
    }
    return err(error instanceof Error ? error.message : "Réception du SMS impossible.", 500);
  }
}
