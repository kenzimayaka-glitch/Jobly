import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { getIdempotentResult, saveIdempotentResult } from "../../../lib/idempotency";
import {
  getPlan,
  getPrice,
  getRecruiterPlan,
  getRecruiterPrice,
  type BillingInterval,
  type PlanCode,
} from "../../../lib/billingCatalog";
import { assertPaymentProviderReady, getProvider } from "../../../lib/paymentProviders";
import { isDefinitiveProviderFailure } from "../../../lib/billingLifecycleCore";

const err = (message: string, status: number, code = message) => NextResponse.json({ error: code, message }, { status });

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") || 20)));
    const status = params.get("status");
    let query = supabase.from("Payment").select("*", { count: "exact" })
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (status) query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ payments: data || [], page, limit, total: count || 0 });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Historique indisponible.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const body = await request.json();
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const idempotency = await getIdempotentResult(request, "/api/payments", user.id, body);

    if ("error" in idempotency) {
      return err("Clé d'idempotence manquante ou réutilisée avec un payload différent.", idempotency.conflict ? 409 : 400, idempotency.error);
    }
    if (idempotency.existing) {
      return NextResponse.json(idempotency.existing.response, { status: idempotency.existing.statusCode });
    }

    const subscriptionId = String(body.subscriptionId || "");
    const { data: subscription, error: subscriptionError } = await supabase
      .from("Subscription")
      .select("*")
      .eq("id", subscriptionId)
      .eq("userId", user.id)
      .maybeSingle();
    if (subscriptionError) throw new Error(subscriptionError.message);
    if (!subscription) return err("Abonnement introuvable.", 404, "SUBSCRIPTION_NOT_FOUND");
    if (subscription.status !== "PENDING") {
      return err("Un paiement ne peut être lancé que pour un abonnement en attente.", 409, "SUBSCRIPTION_NOT_PENDING");
    }

    const productType = subscription.productType === "RECRUITER" ? "RECRUITER" : "TALENT";
    const planCode = String(subscription.planCode) as PlanCode;
    const plan = productType === "RECRUITER" ? getRecruiterPlan(planCode) : getPlan(planCode);
    if (!plan || planCode === "FREE") return err("Plan invalide.", 400, "INVALID_PLAN");

    const interval = String(body.interval || subscription.billingInterval || "").toUpperCase() as BillingInterval;
    if (interval !== "MONTHLY" && interval !== "ANNUAL") return err("Intervalle invalide.", 400, "INVALID_INTERVAL");

    const providerName = String(body.provider || subscription.provider || "MOCK").toUpperCase();
    if (providerName !== "MOCK" && providerName !== "ICLAN") return err("Provider indisponible.", 400, "PROVIDER_UNAVAILABLE");
    try {
      assertPaymentProviderReady(providerName);
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "PAYMENT_PROVIDER_NOT_READY";
      return err(message, 503, message.split(":")[0]);
    }

    const amount = productType === "RECRUITER"
      ? getRecruiterPrice(planCode, interval)
      : getPrice(planCode, interval);
    if (Number(body.amount) !== amount || String(body.currency || "XAF").toUpperCase() !== "XAF") {
      return err("Le montant ou la devise ne correspond pas au catalogue serveur.", 422, "INVALID_AMOUNT");
    }

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data: payment, error: paymentError } = await supabase.from("Payment").insert({
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
    }).select("*").single();
    if (paymentError) throw new Error(paymentError.message);

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
      const definitiveFailure = isDefinitiveProviderFailure(message);
      const failedAt = new Date().toISOString();

      if (definitiveFailure) {
        const paymentUpdate = await supabase.from("Payment")
          .update({ status: "FAILED", failureReason: message, updatedAt: failedAt })
          .eq("id", paymentId)
          .eq("status", "CREATED");
        const subscriptionUpdate = await supabase.from("Subscription")
          .update({ status: "EXPIRED", updatedAt: failedAt })
          .eq("id", subscriptionId)
          .eq("status", "PENDING");
        if (paymentUpdate.error) throw new Error("Provider error; failed to record payment failure: " + paymentUpdate.error.message);
        if (subscriptionUpdate.error) throw new Error("Provider error; failed to close pending subscription: " + subscriptionUpdate.error.message);
        throw providerError;
      }

      const { data: uncertainPayment, error: uncertainError } = await supabase.from("Payment")
        .update({ status: "PENDING", failureReason: "PROVIDER_RESULT_UNKNOWN: " + message, updatedAt: failedAt })
        .eq("id", paymentId)
        .eq("status", "CREATED")
        .select("*")
        .single();
      if (uncertainError) throw new Error("Provider result unknown; payment could not be retained: " + uncertainError.message);

      const response = {
        payment: uncertainPayment,
        provider: providerName,
        instructions: "Le prestataire n'a pas retourné de confirmation fiable. Ne relancez pas le paiement. Vérifiez le statut de cette transaction.",
        entitlementGranted: false,
        providerResultUnknown: true,
      };
      await saveIdempotentResult(user.id, "/api/payments", idempotency.key, idempotency.hash, 202, response);
      return NextResponse.json(response, { status: 202 });
    }

    const { data: pendingPayment, error: pendingError } = await supabase.from("Payment").update({
      status: "PENDING",
      externalId: intent.checkoutReference,
      updatedAt: new Date().toISOString(),
    }).eq("id", paymentId).eq("status", "CREATED").select("*").single();
    if (pendingError) {
      throw new Error("PAYMENT_INTENT_CREATED_BUT_NOT_PERSISTED: " + pendingError.message);
    }

    const response = {
      payment: { ...pendingPayment, checkoutReference: intent.checkoutReference },
      provider: intent.provider,
      instructions: intent.instructions,
      entitlementGranted: false,
    };
    await saveIdempotentResult(user.id, "/api/payments", idempotency.key, idempotency.hash, 201, response);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Création du paiement impossible.", 500);
  }
}
