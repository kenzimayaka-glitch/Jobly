import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient } from "../../../../../lib/server-auth";
import { matchPaymentSmsToOrder, type PaymentSmsCandidate } from "../../../../../lib/paymentSms/matching";
import { parsePaymentSms, type PaymentSmsProvider } from "../../../../../lib/paymentSms/parser";
import { analyzePaymentSmsWithAi } from "../../../../../lib/paymentSms/ai-review";

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
      .select("id,provider,merchantAccount,senderIds,tokenHash,status")
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
      { senderIds: senderAllowlist, merchantAccount: String(device.merchantAccount) },
    );
    // Every unique SMS from a paired, allow-listed sender receives a real AI review.
    // The AI sees a redacted semantic copy; it cannot supply payment values or authorize billing.
    const aiReview = parsed.senderTrusted && parsed.provider
      ? await analyzePaymentSmsWithAi({ senderId, body: smsBody, parsed })
      : null;
    const receivedAt = new Date().toISOString();
    const rawMessageHash = crypto.createHash("sha256").update(smsBody, "utf8").digest("hex");
    const payloadHash = crypto.createHash("sha256")
      .update(`${device.id}\n${parsed.senderId}\n${rawMessageHash}`)
      .digest("hex");

    const { error: heartbeatError } = await supabase.from("PaymentSmsDevice")
      .update({ lastSeenAt: receivedAt, updatedAt: receivedAt }).eq("id", device.id).eq("status", "ACTIVE");
    if (heartbeatError) throw new Error(heartbeatError.message);

    const allFraudFlags = [...parsed.fraudFlags, ...(aiReview?.flags || [])];
    const initialStatus = !parsed.senderTrusted || parsed.status !== "SUCCESSFUL" ||
      !parsed.transactionId || !parsed.amountXaf || allFraudFlags.length > 0 ||
      !aiReview?.accepted ? "REJECTED" : "RECEIVED";
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
    if (initialStatus === "REJECTED") {
      return NextResponse.json({ accepted: true, receiptId: receipt.id, processingStatus: "REJECTED", entitlementChanged: false });
    }

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
      .limit(50);
    if (candidateError) throw new Error(candidateError.message);

    const match = matchPaymentSmsToOrder({
      parsed,
      merchantAccount: String(device.merchantAccount),
      candidates: (candidates || []) as PaymentSmsCandidate[],
      now: new Date(receivedAt),
    });
    if (match.outcome !== "MATCHED") {
      const processingStatus = match.outcome === "AMBIGUOUS" ? "AMBIGUOUS" : "UNMATCHED";
      const { error: updateError } = await supabase.from("PaymentSmsReceipt")
        .update({ processingStatus, matchDetails: { reason: match.reason, candidateCount: match.candidateCount } }).eq("id", receipt.id);
      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ accepted: true, receiptId: receipt.id, processingStatus, entitlementChanged: false });
    }

    const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_payment_from_sms", {
      p_receipt_id: receipt.id,
      p_payment_id: match.payment.id,
      p_user_id: match.payment.userId,
      p_now: receivedAt,
      p_match_reason: match.reason,
    });
    if (finalizeError) {
      await supabase.from("PaymentSmsReceipt")
        .update({ processingStatus: "REJECTED", matchDetails: { reason: "FINALIZE_PAYMENT_REJECTED", errorCode: String(finalizeError.message || "").slice(0, 100) } })
        .eq("id", receipt.id).in("processingStatus", ["RECEIVED", "UNMATCHED", "AMBIGUOUS"]);
      return NextResponse.json({ accepted: true, receiptId: receipt.id, processingStatus: "REJECTED", entitlementChanged: false });
    }
    return NextResponse.json({ accepted: true, receiptId: receipt.id, processingStatus: "MATCHED", entitlementChanged: true, idempotent: Boolean((finalized as any)?.idempotent) });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Réception du SMS impossible.", 500);
  }
}
