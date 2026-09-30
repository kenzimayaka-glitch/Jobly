import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getActivePlanCode } from "../../../../../lib/entitlements";
import { getEntitlements } from "../../../../../lib/billingCatalog";
import { getIdempotentResult, saveIdempotentResult } from "../../../../../lib/idempotency";
import { getProvider } from "../../../../../lib/paymentProviders";

const FEATURES = new Set(["CV_ATS_DOWNLOAD","CV_OPTIMIZED_DOWNLOAD"]);

function error(message: string, status: number, code = message) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return error("Session requise.", 401, "UNAUTHENTICATED");

    const body = await request.json().catch(() => ({}));
    const feature = String(body.feature || "").toUpperCase();
    if (!FEATURES.has(feature)) {
      return error("Fonctionnalité de paiement invalide.", 400, "INVALID_FEATURE");
    }

    const providerName = String(body.provider || "ICLAN").toUpperCase();
    if (!["MOCK", "ICLAN"].includes(providerName)) {
      return error("Provider indisponible.", 400, "PROVIDER_UNAVAILABLE");
    }

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const plan = await getActivePlanCode(sb, user.id, "TALENT");
    const entitlements = getEntitlements(plan);

    const amount = feature === "CV_OPTIMIZED_DOWNLOAD" ? Number(entitlements.cvOptimizedDownloadPriceXaf || 0) : Number(entitlements.cvAtsDownloadPriceXaf || entitlements.cvDownloadPriceXaf || 0);
    if (amount <= 0) {
      return NextResponse.json({
        paid: false,
        included: true,
        plan,
        amount: 0,
        currency: "XAF",
      });
    }

    const phone = String(body.phone || auth.phone || "").trim();
    const paymentMethod = String(body.paymentMethod || "MTN MoMo");

    if (!phone) return error("Saisissez le numéro Mobile Money à débiter.", 400, "PHONE_REQUIRED");

    const idem = await getIdempotentResult(request, "/api/talent/cv/payment", user.id, body);
    if ("error" in idem) {
      return error(
        "Clé d'idempotence manquante ou réutilisée avec un payload différent.",
        ("conflict" in idem && idem.conflict) ? 409 : 400,
        idem.error,
      );
    }
    if (idem.existing) return NextResponse.json(idem.existing.response, { status: idem.existing.statusCode });

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: payment, error: paymentError } = await sb
      .from("Payment")
      .insert({
        id: paymentId,
        userId: user.id,
        feature,
        subscriptionId: null,
        provider: providerName,
        amount,
        currency: "XAF",
        status: "CREATED",
        idempotencyKey: idem.key,
        createdAt: now,
        updatedAt: now,
      })
      .select("*")
      .single();

    if (paymentError) throw new Error(paymentError.message);

    try {
      const provider = getProvider(providerName);
      const intent = await provider.createPayment({
        paymentId,
        amount,
        currency: "XAF",
        phone,
        paymentMethod,
      });

      const { data: pendingPayment, error: pendingError } = await sb
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

      if (pendingError) throw new Error(pendingError.message);

      const response = {
        paid: true,
        included: false,
        feature,
        plan,
        payment: pendingPayment,
        provider: intent.provider,
        instructions: intent.instructions,
      };

      await saveIdempotentResult(user.id, "/api/talent/cv/payment", idem.key, idem.hash, 201, response);
      return NextResponse.json(response, { status: 201 });
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "Provider payment failed";
      await sb
        .from("Payment")
        .update({ status: "FAILED", failureReason: message, updatedAt: new Date().toISOString() })
        .eq("id", paymentId)
        .eq("status", "CREATED");
      throw providerError;
    }
  } catch (e) {
    return error(e instanceof Error ? e.message : "Impossible de lancer le paiement CV.", 500);
  }
}
