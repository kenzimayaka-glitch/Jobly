import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { generateDistributorAcquisitionCommission } from "../../../../../lib/distributor-commission";

const err = (message: string, status: number, code = message) =>
  NextResponse.json({ error: code, message }, { status });

const allowed = new Set(["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"]);
const transitions: Record<string, Set<string>> = {
  CREATED: new Set(["PENDING", "SUCCESSFUL", "FAILED"]),
  PENDING: new Set(["SUCCESSFUL", "FAILED"]),
  SUCCESSFUL: new Set(["REFUNDED"]),
  FAILED: new Set([]),
  REFUNDED: new Set([]),
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    if (!["ADMIN", "FINANCE"].includes(user.role)) {
      return err("Accès administrateur requis.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = String(body.status || "").toUpperCase();
    const reason = String(body.reason || "").trim().slice(0, 500);
    const externalId = body.externalId ? String(body.externalId).trim() : undefined;

    if (!allowed.has(status)) {
      return err("Statut de rapprochement invalide.", 400, "RECONCILIATION_FAILED");
    }
    if (status === "FAILED" && !reason) {
      return err("Une raison est requise pour un échec.", 400, "RECONCILIATION_FAILED");
    }

    const { data: payment, error: paymentError } = await sb
      .from("Payment")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (paymentError) throw new Error(paymentError.message);
    if (!payment) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");

    if (payment.status === status) {
      return NextResponse.json({ payment, reconciledBy: user.id, idempotent: true });
    }

    if (!transitions[payment.status]?.has(status)) {
      return err(
        `Transition impossible: ${payment.status} → ${status}.`,
        422,
        "INVALID_PAYMENT_TRANSITION",
      );
    }

    if (externalId && payment.externalId && payment.externalId !== externalId) {
      return err("externalId déjà associé à un autre paiement.", 409, "EXTERNAL_ID_CONFLICT");
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status,
      updatedAt: now,
    };
    if (externalId) update.externalId = externalId;
    if (status === "SUCCESSFUL") update.paidAt = now;
    if (status === "REFUNDED") update.refundedAt = now;
    if (status === "FAILED") update.failureReason = reason;

    const { data: updatedPayment, error: updateError } = await sb
      .from("Payment")
      .update(update)
      .eq("id", id)
      .eq("status", payment.status)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    let commission = null;

    if (payment.subscriptionId) {
      if (status === "SUCCESSFUL") {
        const { data: sub } = await sb
          .from("Subscription")
          .select("*")
          .eq("id", payment.subscriptionId)
          .maybeSingle();
        if (sub) {
          const start = new Date();
          const end = new Date(start);
          if (sub.billingInterval === "ANNUAL") end.setUTCFullYear(end.getUTCFullYear() + 1);
          else end.setUTCMonth(end.getUTCMonth() + 1);
          await sb.from("Subscription").update({
            status: "ACTIVE",
            currentPeriodStart: start.toISOString(),
            currentPeriodEnd: end.toISOString(),
            canceledAt: null,
            updatedAt: now,
          }).eq("id", sub.id);

          commission = await generateDistributorAcquisitionCommission(sb, sub);
        }
      } else if (status === "FAILED") {
        await sb.from("Subscription").update({
          status: "EXPIRED",
          updatedAt: now,
        }).eq("id", payment.subscriptionId).eq("status", "PENDING");
      } else if (status === "REFUNDED") {
        await sb.from("Subscription").update({
          status: "CANCELED",
          canceledAt: now,
          updatedAt: now,
        }).eq("id", payment.subscriptionId);
      }
    }

    await sb.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      action: "PAYMENT_RECONCILED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        previousStatus: payment.status,
        status,
        reason: reason || null,
        externalId: externalId || payment.externalId || null,
        commissionId: commission?.id || null,
      },
    });

    return NextResponse.json({ payment: updatedPayment, reconciledBy: user.id, commission });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Rapprochement impossible.", 500);
  }
}
