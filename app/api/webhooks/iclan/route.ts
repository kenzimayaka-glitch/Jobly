import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient } from "../../../../lib/server-auth";
import { getProvider } from "../../../../lib/paymentProviders";
import { generateDistributorAcquisitionCommission } from "../../../../lib/distributor-commission";

const allowed = new Set(["CREATED", "PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"]);
const transitions: Record<string, Set<string>> = {
  CREATED: new Set(["PENDING", "SUCCESSFUL", "FAILED"]),
  PENDING: new Set(["SUCCESSFUL", "FAILED"]),
  SUCCESSFUL: new Set(["REFUNDED"]),
  FAILED: new Set([]),
  REFUNDED: new Set([]),
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const signature = request.headers.get("x-iclan-signature");
    const timestamp = request.headers.get("x-iclan-timestamp");
    if (!getProvider("ICLAN").verifyWebhook(raw, signature, timestamp)) {
      return NextResponse.json({ error: "WEBHOOK_SIGNATURE_INVALID", message: "Signature webhook invalide." }, { status: 401 });
    }
    let body: any;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "WEBHOOK_INVALID_PAYLOAD", message: "Payload JSON invalide." }, { status: 400 }); }
    const eventId = String(body.eventId || body.id || "");
    const paymentId = String(body.paymentId || "");
    const externalId = String(body.externalId || "");
    const status = String(body.status || "").toUpperCase();
    const amount = Number(body.amount);
    const currency = String(body.currency || "").toUpperCase();
    if (!eventId || !paymentId || !allowed.has(status) || !Number.isInteger(amount) || currency !== "XAF") {
      return NextResponse.json({ error: "WEBHOOK_INVALID_PAYLOAD", message: "eventId, paymentId, statut, montant entier et XAF sont requis." }, { status: 400 });
    }

    const sb = adminClient();
    const { data: existing } = await sb.from("PaymentWebhookEvent").select("id,status,payloadHash").eq("provider", "ICLAN").eq("externalEventId", eventId).maybeSingle();
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    if (existing?.status === "PROCESSED") return NextResponse.json({ ok: true, duplicate: true });
    if (existing && existing.payloadHash !== hash) return NextResponse.json({ error: "WEBHOOK_INVALID_PAYLOAD", message: "Même eventId avec un payload différent." }, { status: 409 });
    let eventIdInternal = existing?.id;
    if (!existing) {
      const { data: event, error } = await sb.from("PaymentWebhookEvent").insert({ id: crypto.randomUUID(), provider: "ICLAN", externalEventId: eventId, eventType: String(body.type || "payment.updated"), payloadHash: hash, payload: body, receivedAt: new Date().toISOString(), status: "PROCESSING" }).select("id").single();
      if (error) throw new Error(error.message);
      eventIdInternal = event.id;
    } else {
      await sb.from("PaymentWebhookEvent").update({ status: "PROCESSING", error: null, payload: body, payloadHash: hash }).eq("id", existing.id);
    }

    const { data: payment, error: paymentError } = await sb.from("Payment").select("*").eq("id", paymentId).maybeSingle();
    if (paymentError) throw new Error(paymentError.message);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.amount !== amount || payment.currency !== currency) throw new Error("PAYMENT_VERIFICATION_FAILED");
    if (externalId && payment.externalId && payment.externalId !== externalId) throw new Error("PAYMENT_EXTERNAL_ID_MISMATCH");
    if (payment.status !== status && !transitions[payment.status]?.has(status)) throw new Error("INVALID_PAYMENT_TRANSITION");

    const sameStatus = payment.status === status;
    const now = new Date();

    // Same-status deliveries are only idempotent after their downstream effects
    // are known to be complete. If an earlier attempt updated Payment but failed
    // before activating the subscription/commission, retry the downstream work.
    if (sameStatus && status !== "SUCCESSFUL" && status !== "FAILED" && status !== "REFUNDED") {
      if (eventIdInternal) await sb.from("PaymentWebhookEvent").update({ status: "PROCESSED", processedAt: now.toISOString(), error: null }).eq("id", eventIdInternal);
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (!sameStatus) {
      const update: Record<string, unknown> = { status, updatedAt: now.toISOString() };
      if (externalId) update.externalId = externalId;
      if (status === "SUCCESSFUL") update.paidAt = now.toISOString();
      if (status === "REFUNDED") update.refundedAt = now.toISOString();
      const { error: updateError } = await sb.from("Payment").update(update).eq("id", payment.id);
      if (updateError) throw new Error(updateError.message);
    }

    if (payment.subscriptionId && status === "SUCCESSFUL") {
      const { data: sub } = await sb.from("Subscription").select("*").eq("id", payment.subscriptionId).maybeSingle();
      if (sub) {
        // Never extend an already-active subscription for a duplicate webhook.
        // But if Payment was marked successful before activation failed, complete
        // activation now; commission generation is itself DB-idempotent.
        if (!sameStatus || sub.status !== "ACTIVE") {
          const end = new Date(now);
          if (sub.billingInterval === "ANNUAL") end.setUTCFullYear(end.getUTCFullYear() + 1);
          else end.setUTCMonth(end.getUTCMonth() + 1);
          const { data: activatedSub, error: activationError } = await sb.from("Subscription").update({ status: "ACTIVE", currentPeriodStart: now.toISOString(), currentPeriodEnd: end.toISOString(), updatedAt: now.toISOString() }).eq("id", sub.id).select("*").single();
          if (activationError) throw new Error(activationError.message);
          if (activatedSub) await generateDistributorAcquisitionCommission(sb, activatedSub);
        } else {
          // The subscription is already active; this is safe to call because the
          // acquisition commission has a database uniqueness boundary.
          await generateDistributorAcquisitionCommission(sb, sub);
        }
      }
    } else if (payment.subscriptionId && status === "REFUNDED") {
      if (!sameStatus) {
        const { error } = await sb.from("Subscription").update({ status: "CANCELED", canceledAt: now.toISOString(), updatedAt: now.toISOString() }).eq("id", payment.subscriptionId);
        if (error) throw new Error(error.message);
      }
    } else if (payment.subscriptionId && status === "FAILED") {
      const { error } = await sb.from("Subscription").update({ status: "EXPIRED", updatedAt: now.toISOString() }).eq("id", payment.subscriptionId).eq("status", "PENDING");
      if (error) throw new Error(error.message);
    }

    if (eventIdInternal) await sb.from("PaymentWebhookEvent").update({ status: "PROCESSED", processedAt: now.toISOString(), error: null }).eq("id", eventIdInternal);
    return NextResponse.json({ ok: true, processed: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "WEBHOOK_PROCESSING_FAILED";
    return NextResponse.json({ error: message, message: "Webhook reçu mais non traité. Une nouvelle tentative reste possible." }, { status: 422 });
  }
}
