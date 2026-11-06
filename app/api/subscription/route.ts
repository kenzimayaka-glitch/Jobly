import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser, resolveBillingProductType } from "../../../lib/server-auth";
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
import { assertPaymentProviderReady, getProvider } from "../../../lib/paymentProviders";
import { resolveActiveEntitlements } from "../../../lib/entitlements";
import { isDefinitiveProviderFailure } from "../../../lib/billingLifecycleCore";
import { buildPaymentSmsUssd, getPaymentSmsCheckoutConfig, normalizeMobileMoneyPhone, type PaymentSmsCheckoutConfig } from "../../../lib/paymentSms/config";
import type { PaymentSmsProvider } from "../../../lib/paymentSms/parser";

const PAID_PLANS = new Set<PlanCode>(["START", "PREMIUM", "PRO"]);
type ProductType = "TALENT" | "RECRUITER";

function jsonError(message: string, status: number, code = message) {
  return NextResponse.json({ error: code, message }, { status });
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
    let productType: ProductType;
    try {
      productType = await resolveBillingProductType(
        supabase,
        user,
        auth.id,
        request.nextUrl.searchParams.get("productType"),
      );
    } catch (productError) {
      const message = productError instanceof Error ? productError.message : "INVALID_PRODUCT_TYPE";
      if (message === "RECRUITER_PROFILE_REQUIRED") return jsonError("Un profil recruteur doit être créé avant de consulter cet abonnement.", 403, message);
      if (message === "INVALID_PRODUCT_TYPE") return jsonError("Profil de facturation invalide.", 400, message);
      throw productError;
    }

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
          .select("id,status,amount,currency,provider,createdAt,payerPhone,reportedTransactionId,smsMerchantAccount,smsMerchantCode")
          .eq("subscriptionId", latestSubscription.id)
          .eq("userId", user.id)
          .in("status", ["CREATED", "PENDING"])
          .order("createdAt", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };
    if (paymentResult.error) throw new Error(paymentResult.error.message);

    let checkout = null;
    const existingPayment = paymentResult.data as any;
    if (existingPayment?.provider === "SMS_MTN" || existingPayment?.provider === "SMS_ORANGE") {
      try {
        const config = buildPaymentSmsUssd(existingPayment.provider as PaymentSmsProvider, Number(existingPayment.amount), {
          provider: existingPayment.provider as PaymentSmsProvider,
          providerLabel: existingPayment.provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money",
          merchantAccount: String(existingPayment.smsMerchantAccount || ""),
          merchantCode: String(existingPayment.smsMerchantCode || ""),
        });
        checkout = { provider: config.provider, providerLabel: config.providerLabel, merchantAccount: config.merchantAccount, paymentCode: config.paymentCode, ussdCode: config.ussdCode, amount: existingPayment.amount, currency: existingPayment.currency, paymentReference: existingPayment.id, payerPhone: existingPayment.payerPhone, reportedTransactionId: existingPayment.reportedTransactionId };
      } catch { /* Never invent a payment code when configuration is missing. */ }
    }

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
          : resolved.promo?.endsat || null,
      },
      payment: paymentResult.data ? (({ smsMerchantCode: _privateMerchantCode, ...safePayment }: any) => safePayment)(paymentResult.data) : null,
      checkout,
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
    const isSmsProvider = providerName === "SMS_MTN" || providerName === "SMS_ORANGE";
    let smsCheckout: PaymentSmsCheckoutConfig | null = null;
    let normalizedPayerPhone: string | null = null;

    if (!PAID_PLANS.has(planCode)) return jsonError("Plan payant invalide.", 400, "INVALID_PLAN");
    if (interval !== "MONTHLY" && interval !== "ANNUAL") return jsonError("Intervalle invalide.", 400, "INVALID_INTERVAL");
    if (providerName !== "MOCK" && providerName !== "ICLAN" && !isSmsProvider) return jsonError("Provider indisponible.", 400, "PROVIDER_UNAVAILABLE");
    const supabase = adminClient();
    if (isSmsProvider) {
      normalizedPayerPhone = normalizeMobileMoneyPhone(body.phone || auth.phone);
      if (!normalizedPayerPhone) return jsonError("Saisissez un numéro Mobile Money valide.", 400, "INVALID_PAYER_PHONE");
      try { smsCheckout = await getPaymentSmsCheckoutConfig(supabase, providerName as PaymentSmsProvider); }
      catch (configError) {
        const code = configError instanceof Error ? configError.message : "PAYMENT_SMS_NOT_CONFIGURED";
        return jsonError("Le paiement Mobile Money n'est pas encore configuré pour cet opérateur.", 503, code);
      }
    } else {
      try { assertPaymentProviderReady(providerName); }
      catch (providerError) {
        const message = providerError instanceof Error ? providerError.message : "PAYMENT_PROVIDER_NOT_READY";
        return jsonError(message, 503, message.split(":")[0]);
      }
    }

    const user = await ensureUser(supabase, auth);
    let productType: ProductType;
    try {
      productType = await resolveBillingProductType(supabase, user, auth.id, body.productType);
    } catch (productError) {
      const message = productError instanceof Error ? productError.message : "INVALID_PRODUCT_TYPE";
      if (message === "RECRUITER_PROFILE_REQUIRED") return jsonError("Un profil recruteur doit être créé avant de souscrire à ses offres.", 403, message);
      if (message === "INVALID_PRODUCT_TYPE") return jsonError("Profil de facturation invalide.", 400, message);
      throw productError;
    }
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

    const now = new Date().toISOString();
    const expiryUpdates = await Promise.all([
      supabase.from("Subscription").update({ status: "EXPIRED", updatedAt: now })
        .eq("userId", user.id).eq("productType", productType).eq("status", "ACTIVE").lte("currentPeriodEnd", now),
      supabase.from("Subscription").update({ status: "EXPIRED", updatedAt: now })
        .eq("userId", user.id).eq("productType", productType).eq("status", "ACTIVE").is("currentPeriodEnd", null),
      supabase.from("Subscription").update({ status: "EXPIRED", updatedAt: now })
        .eq("userId", user.id).eq("productType", productType).eq("status", "TRIAL").lte("trialEndsAt", now),
      supabase.from("Subscription").update({ status: "EXPIRED", updatedAt: now })
        .eq("userId", user.id).eq("productType", productType).eq("status", "TRIAL").is("trialEndsAt", null),
    ]);
    const expiryError = expiryUpdates.find((result: any) => result.error)?.error;
    if (expiryError) throw new Error("Could not expire the previous subscription: " + expiryError.message);

    const currentEntitlements = await resolveActiveEntitlements(supabase, user.id, productType);
    const amount = productPrice(productType, planCode, interval);
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
      status: isSmsProvider ? "PENDING" : "CREATED",
      payerPhone: normalizedPayerPhone,
      smsMerchantAccount: smsCheckout?.merchantAccount || null,
      smsMerchantCode: smsCheckout?.merchantCode || null,
      idempotencyKey: idempotency.key,
      createdAt: now,
      updatedAt: now,
    });
    if (paymentError) {
      await supabase.from("Subscription").update({ status: "EXPIRED", updatedAt: new Date().toISOString() }).eq("id", subscriptionId).eq("status", "PENDING");
      throw new Error(paymentError.message);
    }

    if (isSmsProvider && smsCheckout) {
      const operatorCode = buildPaymentSmsUssd(providerName as PaymentSmsProvider, amount, smsCheckout!);
      const response = {
        subscription: { id: subscription.id, plan: currentEntitlements.planCode, planCode: subscription.planCode, requestedPlan: subscription.planCode, status: "PENDING", productType, currentPeriodEnd: currentEntitlements.subscription?.currentPeriodEnd || currentEntitlements.promo?.endsat || null },
        payment: { id: paymentId, userId: user.id, subscriptionId, provider: providerName, amount, currency: "XAF", status: "PENDING", payerPhone: normalizedPayerPhone, createdAt: now },
        provider: providerName,
        checkout: { provider: operatorCode.provider, providerLabel: operatorCode.providerLabel, merchantAccount: operatorCode.merchantAccount, paymentCode: operatorCode.paymentCode, ussdCode: operatorCode.ussdCode, amount, currency: "XAF", paymentReference: paymentId, payerPhone: normalizedPayerPhone },
        instructions: "Composez le code affiché, payez le montant exact sur votre téléphone, puis indiquez la référence de transaction reçue par SMS. Jobly rapprochera automatiquement la confirmation opérateur.",
        entitlementGranted: false,
      };
      await saveIdempotentResult(user.id, "/api/subscription", idempotency.key, idempotency.hash, 201, response);
      return NextResponse.json(response, { status: 201 });
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
        if (paymentUpdate.error) throw new Error("Provider error; failed to persist payment failure: " + paymentUpdate.error.message);
        if (subscriptionUpdate.error) throw new Error("Provider error; failed to close pending subscription: " + subscriptionUpdate.error.message);
        throw providerError;
      }

      // Network and provider 5xx errors may happen after the provider has accepted
      // the charge. Keep a verifiable pending record instead of falsely expiring it.
      const { data: uncertainPayment, error: uncertainError } = await supabase.from("Payment")
        .update({
          status: "PENDING",
          failureReason: "PROVIDER_RESULT_UNKNOWN: " + message,
          updatedAt: failedAt,
        })
        .eq("id", paymentId)
        .eq("status", "CREATED")
        .select("*")
        .single();
      if (uncertainError) throw new Error("Provider result unknown; could not retain pending payment: " + uncertainError.message);

      const response = {
        subscription: {
          id: subscription.id,
          plan: currentEntitlements.planCode,
          planCode: subscription.planCode,
          requestedPlan: subscription.planCode,
          status: "PENDING",
          productType,
          currentPeriodEnd: currentEntitlements.subscription?.currentPeriodEnd || currentEntitlements.promo?.endsat || null,
        },
        payment: uncertainPayment,
        provider: providerName,
        instructions: "Le prestataire n'a pas retourné de confirmation fiable. Ne relancez pas le paiement. Vérifiez le statut de cette transaction ; le plan actuel reste actif jusqu'à confirmation.",
        entitlementGranted: false,
        providerResultUnknown: true,
      };
      await saveIdempotentResult(user.id, "/api/subscription", idempotency.key, idempotency.hash, 202, response);
      return NextResponse.json(response, { status: 202 });
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
        plan: currentEntitlements.planCode,
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
    let productType: ProductType;
    try {
      productType = await resolveBillingProductType(supabase, user, auth.id, request.nextUrl.searchParams.get("productType"));
    } catch (productError) {
      const message = productError instanceof Error ? productError.message : "INVALID_PRODUCT_TYPE";
      if (message === "RECRUITER_PROFILE_REQUIRED") return jsonError("Un profil recruteur doit être créé avant de gérer cet abonnement.", 403, message);
      if (message === "INVALID_PRODUCT_TYPE") return jsonError("Profil de facturation invalide.", 400, message);
      throw productError;
    }

    const { data: pendingSubscription, error: pendingError } = await supabase
      .from("Subscription")
      .select("id,status")
      .eq("userId", user.id)
      .eq("productType", productType)
      .eq("status", "PENDING")
      .limit(1)
      .maybeSingle();

    if (pendingError) throw new Error(pendingError.message);
    if (pendingSubscription) {
      return jsonError(
        "Un paiement est en attente. Vérifiez son statut avant de modifier l'abonnement.",
        409,
        "PENDING_PAYMENT_BLOCKS_CANCELLATION",
      );
    }

    const { data: subscription, error } = await supabase
      .from("Subscription")
      .select("id,status")
      .eq("userId", user.id)
      .eq("productType", productType)
      .in("status", ["ACTIVE", "TRIAL"])
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!subscription) return jsonError("Abonnement actif introuvable.", 404, "SUBSCRIPTION_NOT_FOUND");

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
