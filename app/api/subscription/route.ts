import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import {
  getEntitlements,
  getPlan,
  getPrice,
  getRecruiterEntitlements,
  getRecruiterPlan,
  getRecruiterPrice,
  type BillingInterval,
  type PlanCode,
} from "../../../lib/billingCatalog";
import { getIdempotentResult, saveIdempotentResult } from "../../../lib/idempotency";
import { getProvider } from "../../../lib/paymentProviders";
import { resolveActiveEntitlements } from "../../../lib/entitlements";

const PAID_PLANS = new Set<PlanCode>(["START", "PREMIUM", "PRO"]);
type ProductType = "TALENT" | "RECRUITER";

function jsonError(message: string, status: number, code = message) {
  return NextResponse.json({ error: code, message }, { status });
}

function productTypeForUser(user: any): ProductType {
  return String(user.role) === "RECRUITER" ? "RECRUITER" : "TALENT";
}

function productPlan(productType: ProductType, code: string) {
  return productType === "RECRUITER" ? getRecruiterPlan(code) : getPlan(code);
}

function productPrice(productType: ProductType, code: PlanCode, interval: BillingInterval): number {
  return productType === "RECRUITER" ? getRecruiterPrice(code, interval) : getPrice(code, interval);
}

function productEntitlements(productType: ProductType, code: PlanCode) {
  return productType === "RECRUITER" ? getRecruiterEntitlements(code) : getEntitlements(code);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return jsonError("Session requise.", 401, "UNAUTHENTICATED");

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const productType = productTypeForUser(user);

    const [resolved, latestResult] = await Promise.all([
      resolveActiveEntitlements(supabase, user.id, productType),
      supabase
        .from("Subscription")
        .select("*")
        .eq("userId", user.id)
        .eq("productType", productType)
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (latestResult.error) throw new Error(latestResult.error.message);

    const latestSubscription = latestResult.data;
    const effectivePlan = productPlan(productType, resolved.planCode) || productPlan(productType, "FREE")!;
    const displayStatus = latestSubscription?.status === "PENDING"
      ? "PENDING"
      : resolved.source === "PROMO"
        ? "PROMO"
        : resolved.subscription?.status || "FREE";
    const paymentResult = latestSubscription?.status === "PENDING"
      ? await supabase
          .from("Payment")
          .select("id,status,amount,currency,provider,createdAt")
          .eq("subscriptionId", latestSubscription.id)
          .eq("userId", user.id)
          .in("status", ["CREATED", "PENDING"])
          .order("createdAt", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };
    if (paymentResult.error) throw new Error(paymentResult.error.message);

    return NextResponse.json({
      subscription: {
        id: latestSubscription?.id || null,
        plan: resolved.planCode,
        planCode: latestSubscription?.planCode || resolved.planCode,
        requestedPlan: latestSubscription?.status === "PENDING" ? latestSubscription.planCode : null,
        status: displayStatus,
        productType,
        currentPeriodEnd: resolved.subscription
          ? (resolved.subscription.status === "TRIAL" ? resolved.subscription.trialEndsAt : resolved.subscription.currentPeriodEnd)
          : resolved.promo?.endsAt || null,
      },
      payment: paymentResult.data || null,
      entitlements: productEntitlements(productType, resolved.planCode),
      prices: {
        monthly: effectivePlan.monthlyPriceXaf,
        annual: effectivePlan.annualPriceXaf,
        currency: "XAF",
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Abonnement indisponible.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return jsonError("Session requise.", 401, "UNAUTHENTICATED");

    const body = await request.json();
    const planCode = String(body.plan || "").toUpperCase() as PlanCode;
    const interval = String(body.interval || "").toUpperCase() as BillingInterval;
    const providerName = String(body.provider || "MOCK").toUpperCase();

    if (!PAID_PLANS.has(planCode)) return jsonError("Plan payant invalide.", 400, "INVALID_PLAN");
    if (interval !== "MONTHLY" && interval !== "ANNUAL") return jsonError("Intervalle invalide.", 400, "INVALID_INTERVAL");
    if (providerName !== "MOCK" && providerName !== "ICLAN") return jsonError("Provider indisponible.", 400, "PROVIDER_UNAVAILABLE");

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const productType = productTypeForUser(user);
    const plan = productPlan(productType, planCode);
    if (!plan) return jsonError("Plan indisponible pour ce profil.", 400, "INVALID_PRODUCT_PLAN");

    const idempotency = await getIdempotentResult(request, "/api/subscription", user.id, body);
    if ("error" in idempotency) {
      return jsonError(
        "Clé d'idempotence manquante ou réutilisée avec un payload différent.",
        "conflict" in idempotency && idempotency.conflict ? 409 : 400,
        idempotency.error,
      );
    }
    if (idempotency.existing) {
      return NextResponse.json(idempotency.existing.response, { status: idempotency.existing.statusCode });
    }

    const amount = productPrice(productType, planCode, interval);
    const now = new Date().toISOString();
    const subscriptionId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();

    const { data: subscription, error: subscriptionError } = await supabase
      .from("Subscription")
      .insert({
        id: subscriptionId,
        userId: user.id,
        planCode,
        status: "PENDING",
        billingInterval: interval,
        priceAmount: amount,
        priceCurrency: "XAF",
        provider: providerName,
        productType,
        createdAt: now,
        updatedAt: now,
      })
      .select("*")
      .single();
    if (subscriptionError) {
      if (subscriptionError.code === "23505") {
        return jsonError("Un abonnement ou paiement est déjà en attente pour ce profil.", 409, "SUBSCRIPTION_ALREADY_PENDING");
      }
      throw new Error(subscriptionError.message);
    }

    const { error: paymentError } = await supabase.from("Payment").insert({
      id: paymentId,
      userId: user.id,
      subscriptionId,
      provider: providerName,
      externalId: paymentId,
      amount,
      currency: "XAF",
      status: "CREATED",
      idempotencyKey: idempotency.key,
      createdAt: now,
      updatedAt: now,
    });
    if (paymentError) {
      await supabase.from("Subscription").update({ status: "EXPIRED", updatedAt: new Date().toISOString() }).eq("id", subscriptionId).eq("status", "PENDING");
      throw new Error(paymentError.message);
    }

    let intent;
    try {
      intent = await getProvider(providerName).createPayment({
        paymentId,
        amount,
        currency: "XAF",
        phone: body.phone || auth.phone,
        paymentMethod: body.paymentMethod,
      });
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "Provider payment failed";
      const paymentUpdate = await supabase.from("Payment")
        .update({ status: "FAILED", failureReason: message, updatedAt: new Date().toISOString() })
        .eq("id", paymentId)
        .eq("status", "CREATED");
      const subscriptionUpdate = await supabase.from("Subscription")
        .update({ status: "EXPIRED", updatedAt: new Date().toISOString() })
        .eq("id", subscriptionId)
        .eq("status", "PENDING");
      if (paymentUpdate.error) throw new Error("Provider error; failed to persist payment failure: " + paymentUpdate.error.message);
      if (subscriptionUpdate.error) throw new Error("Provider error; failed to close pending subscription: " + subscriptionUpdate.error.message);
      throw providerError;
    }

    const { data: pendingPayment, error: pendingError } = await supabase
      .from("Payment")
      .update({
        status: "PENDING",
        externalId: intent.checkoutReference,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("status", "CREATED")
      .select("*")
      .single();
    if (pendingError) {
      // The provider intent may exist. Keep the internal payment reference for reconciliation.
      throw new Error("PAYMENT_INTENT_CREATED_BUT_NOT_PERSISTED: " + pendingError.message);
    }

    const response = {
      subscription: {
        id: subscription.id,
        plan: "FREE",
        planCode: subscription.planCode,
        requestedPlan: subscription.planCode,
        status: "PENDING",
        productType,
        currentPeriodEnd: null,
      },
      payment: { ...pendingPayment, checkoutReference: intent.checkoutReference },
      provider: intent.provider,
      instructions: intent.instructions,
      entitlementGranted: false,
    };

    await saveIdempotentResult(user.id, "/api/subscription", idempotency.key, idempotency.hash, 201, response);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Création d'abonnement impossible.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return jsonError("Session requise.", 401, "UNAUTHENTICATED");

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const productType = productTypeForUser(user);
    const { data: subscription, error } = await supabase
      .from("Subscription")
      .select("id,status")
      .eq("userId", user.id)
      .eq("productType", productType)
      .in("status", ["ACTIVE", "TRIAL", "PENDING"])
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!subscription) return jsonError("Abonnement actif ou en attente introuvable.", 404, "SUBSCRIPTION_NOT_FOUND");
    if (subscription.status === "CANCELED") {
      return NextResponse.json({ subscription, idempotent: true });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("Subscription")
      .update({ status: "CANCELED", canceledAt: now, updatedAt: now })
      .eq("id", subscription.id)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ subscription: updated });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Annulation impossible.", 500);
  }
}
