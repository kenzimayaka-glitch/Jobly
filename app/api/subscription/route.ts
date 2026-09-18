import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { getEntitlements, getPlan, getPrice, getRecruiterEntitlements, getRecruiterPlan, getRecruiterPrice, type BillingInterval, type PlanCode } from "../../../lib/billingCatalog";
import { getIdempotentResult, saveIdempotentResult } from "../../../lib/idempotency";
import { getProvider } from "../../../lib/paymentProviders";

const PAID_PLANS = new Set<PlanCode>(["START", "PREMIUM", "PRO"]);
function jsonError(message: string, status: number, code = message) { return NextResponse.json({ error: code, message }, { status }); }

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request); if (!auth) return jsonError("Session requise.", 401, "UNAUTHENTICATED");
    const sb = adminClient(); const user = await ensureUser(sb, auth);
    const { data, error } = await sb.from("Subscription").select("*").eq("userId", user.id).order("createdAt", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    const productType = data?.productType === "RECRUITER" ? "RECRUITER" : "TALENT";
    const plan = productType === "RECRUITER" ? getRecruiterPlan(data?.planCode || "FREE") || getRecruiterPlan("FREE")! : getPlan(data?.planCode || "FREE") || getPlan("FREE")!;
    const entitlements = productType === "RECRUITER" ? getRecruiterEntitlements(plan.code) : getEntitlements(plan.code);
    const prices = productType === "RECRUITER"
      ? { monthly: plan.monthlyPriceXaf, annual: plan.annualPriceXaf, currency: "XAF" }
      : { monthly: plan.monthlyPriceXaf, annual: plan.annualPriceXaf, currency: "XAF" };
    return NextResponse.json({ subscription: data || { planCode: "FREE", status: "ACTIVE", productType: "TALENT" }, entitlements, prices });
  } catch (e) { return jsonError(e instanceof Error ? e.message : "Abonnement indisponible.", 500); }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    const auth = await getAuthUser(request); if (!auth) return jsonError("Session requise.", 401, "UNAUTHENTICATED");
    body = await request.json();
    const planCode = String(body.plan || "").toUpperCase() as PlanCode;
    const interval = String(body.interval || "").toUpperCase() as BillingInterval;
    const providerName = String(body.provider || "MOCK").toUpperCase();
    const productType = String(body.productType || "TALENT").toUpperCase();
    const plan = productType === "RECRUITER" ? getRecruiterPlan(planCode) : getPlan(planCode);
    if (!plan || planCode === "FREE" || !PAID_PLANS.has(planCode)) return jsonError("Plan payant invalide.", 400, "INVALID_PLAN");
    if (!["MONTHLY", "ANNUAL"].includes(interval)) return jsonError("Intervalle invalide.", 400, "INVALID_INTERVAL");
    if (!["MOCK", "ICLAN"].includes(providerName)) return jsonError("Provider indisponible.", 400, "PROVIDER_UNAVAILABLE");
    if (!["TALENT", "RECRUITER"].includes(productType)) return jsonError("Type de produit invalide.", 400, "INVALID_PRODUCT_TYPE");
    const sb = adminClient(); const user = await ensureUser(sb, auth);
    const idem = await getIdempotentResult(request, "/api/subscription", user.id, body);
    if ("error" in idem) return jsonError("Clé d'idempotence manquante ou réutilisée avec un payload différent.", ("conflict" in idem && idem.conflict) ? 409 : 400, idem.error);
    if ("processing" in idem && idem.processing) return jsonError("Une requête avec cette clé d'idempotence est déjà en cours.", 409, "IDEMPOTENCY_IN_PROGRESS");
    if (idem.existing) return NextResponse.json(idem.existing.response, { status: idem.existing.statusCode });

    const { data: existingSubscription, error: existingError } = await sb.from("Subscription").select("id,status,planCode,billingInterval").eq("userId", user.id).eq("productType", productType).in("status", ["ACTIVE", "PENDING"]).order("createdAt", { ascending: false }).limit(1).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existingSubscription) return jsonError(existingSubscription.status === "ACTIVE" ? "Un abonnement actif existe déjà pour ce produit. Annulez-le avant de souscrire à un autre plan." : "Un paiement d'abonnement est déjà en cours pour ce produit.", 409, existingSubscription.status === "ACTIVE" ? "ACTIVE_SUBSCRIPTION_EXISTS" : "PENDING_SUBSCRIPTION_EXISTS");

    const amount = productType === "RECRUITER" ? getRecruiterPrice(planCode, interval) : getPrice(planCode, interval);
    const now = new Date().toISOString();
    const subscriptionId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();
    const { data: subscription, error: subError } = await sb.from("Subscription").insert({ id: subscriptionId, userId: user.id, planCode, productType, status: "PENDING", billingInterval: interval, priceAmount: amount, priceCurrency: "XAF", provider: providerName, createdAt: now, updatedAt: now }).select("*").single();
    if (subError) throw new Error(subError.message);
    const { data: payment, error: paymentError } = await sb.from("Payment").insert({ id: paymentId, userId: user.id, subscriptionId, provider: providerName, amount, currency: "XAF", status: "CREATED", idempotencyKey: idem.key, createdAt: now, updatedAt: now }).select("*").single();
    if (paymentError) {
      await sb.from("Subscription").update({ status: "EXPIRED", updatedAt: new Date().toISOString() }).eq("id", subscriptionId).eq("status", "PENDING");
      throw new Error(paymentError.message);
    }
    const provider = getProvider(providerName);
    try {
      const intent = await provider.createPayment({ paymentId, amount, currency: "XAF", phone: body.phone || auth.phone, paymentMethod: body.paymentMethod });
      const { data: pendingPayment, error: pendingError } = await sb.from("Payment").update({ status: "PENDING", externalId: intent.checkoutReference, updatedAt: new Date().toISOString() }).eq("id", paymentId).eq("status", "CREATED").select("*").single();
      if (pendingError) throw new Error(pendingError.message);
      const entitlements = productType === "RECRUITER" ? getRecruiterEntitlements(planCode) : getEntitlements(planCode);
      const response = { subscription: { ...subscription, status: "PENDING" }, payment: { ...pendingPayment, checkoutReference: intent.checkoutReference }, provider: intent.provider, instructions: intent.instructions, entitlements };
      await saveIdempotentResult(user.id, "/api/subscription", idem.key, idem.hash, 201, response);
      return NextResponse.json(response, { status: 201 });
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "Provider payment failed";
      await sb.from("Payment").update({ status: "FAILED", failureReason: message, updatedAt: new Date().toISOString() }).eq("id", paymentId).eq("status", "CREATED");
      await sb.from("Subscription").update({ status: "EXPIRED", updatedAt: new Date().toISOString() }).eq("id", subscriptionId).eq("status", "PENDING");
      throw providerError;
    }
  } catch (e) { return jsonError(e instanceof Error ? e.message : "Création d'abonnement impossible.", 500); }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser(request); if (!auth) return jsonError("Session requise.", 401, "UNAUTHENTICATED");
    const sb = adminClient(); const user = await ensureUser(sb, auth);
    const { data: sub, error } = await sb.from("Subscription").select("id,status,productType").eq("userId", user.id).order("createdAt", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message); if (!sub) return jsonError("Abonnement introuvable.", 404, "SUBSCRIPTION_NOT_FOUND");
    if (sub.status === "CANCELED") return NextResponse.json({ subscription: sub, idempotent: true });
    const { data: updated, error: updateError } = await sb.from("Subscription").update({ status: "CANCELED", canceledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).eq("id", sub.id).select("*").single();
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ subscription: updated });
  } catch (e) { return jsonError(e instanceof Error ? e.message : "Annulation impossible.", 500); }
}
