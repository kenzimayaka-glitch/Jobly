import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getProvider } from "../../../../../lib/paymentProviders";
import { generateDistributorAcquisitionCommission } from "../../../../../lib/distributor-commission";

const err = (m: string, s: number, c = m) => NextResponse.json({ error: c, message: m }, { status: s });
const transitions: Record<string, string[]> = {
  CREATED: ["PENDING", "FAILED"],
  PENDING: ["SUCCESSFUL", "FAILED"],
  SUCCESSFUL: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const sb = adminClient();
    const u = await ensureUser(sb, auth);
    const { data: p, error } = await sb
      .from("Payment")
      .select("*")
      .eq("id", id)
      .eq("userId", u.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
    if (!p.externalId) return err("Référence provider absente.", 409, "EXTERNAL_ID_MISSING");

    const r = await getProvider(String(p.provider)).verifyPayment(p.externalId);
    if (r.amount != null && Number(r.amount) !== Number(p.amount)) {
      return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
    }
    if (p.status === r.status) return NextResponse.json({ payment: p, verification: r, idempotent: true });
    if (!(transitions[String(p.status)] || []).includes(r.status)) {
      return err(`Transition invalide: ${p.status} -> ${r.status}.`, 409, "INVALID_PAYMENT_TRANSITION");
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: r.status, updatedAt: now };
    if (r.status === "SUCCESSFUL") patch.paidAt = now;
    if (r.status === "FAILED") patch.failureReason = r.message || "Provider returned FAILED";

    const { data: updated, error: updateError } = await sb
      .from("Payment")
      .update(patch)
      .eq("id", p.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    let commission = null;
    if (p.subscriptionId) {
      if (r.status === "SUCCESSFUL") {
        const { data: sub, error: subError } = await sb
          .from("Subscription")
          .select("id,userId,planCode,billingInterval,productType")
          .eq("id", p.subscriptionId)
          .eq("userId", u.id)
          .maybeSingle();
        if (subError) throw new Error(subError.message);

        if (sub) {
          const start = new Date(now);
          const end = new Date(start);
          if (sub.billingInterval === "ANNUAL") end.setUTCFullYear(end.getUTCFullYear() + 1);
          else end.setUTCMonth(end.getUTCMonth() + 1);

          const { error: subscriptionError } = await sb
            .from("Subscription")
            .update({
              status: "ACTIVE",
              currentPeriodStart: start.toISOString(),
              currentPeriodEnd: end.toISOString(),
              canceledAt: null,
              updatedAt: now,
            })
            .eq("id", p.subscriptionId)
            .eq("userId", u.id);
          if (subscriptionError) throw new Error(subscriptionError.message);

          commission = await generateDistributorAcquisitionCommission(sb, sub);
        }
      } else if (r.status === "FAILED") {
        await sb
          .from("Subscription")
          .update({ status: "EXPIRED", updatedAt: now })
          .eq("id", p.subscriptionId)
          .eq("userId", u.id);
      }
    }

    return NextResponse.json({ payment: updated, verification: r, commission });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Vérification impossible.", 500);
  }
}
