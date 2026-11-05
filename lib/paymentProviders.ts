import crypto from "node:crypto";
import { assertPaymentProviderReady, isProductionRuntime, requiredEnv } from "./billingLifecycleCore";
export { assertPaymentProviderReady } from "./billingLifecycleCore";

export type ProviderPaymentIntent = {
  provider: string;
  checkoutReference: string;
  instructions: string;
};

export type ProviderVerification = {
  externalId: string;
  status: "SUCCESSFUL" | "FAILED" | "PENDING";
  amount?: number;
  currency?: string;
  transactionId?: string;
  paymentMethod?: string;
  paymentTelephone?: string;
  message?: string;
};

export interface PaymentProvider {
  createPayment(input: {
    paymentId: string;
    amount: number;
    currency: string;
    phone?: string | null;
    paymentMethod?: string | null;
  }): Promise<ProviderPaymentIntent>;
  verifyPayment(externalId: string): Promise<ProviderVerification>;
  verifyWebhook(rawBody: string, signature: string | null, timestamp: string | null): boolean;
}


export class MockPaymentProvider implements PaymentProvider {
  async createPayment({ paymentId }: { paymentId: string }): Promise<ProviderPaymentIntent> {
    return {
      provider: "MOCK",
      checkoutReference: "JOBLY-MOCK-" + paymentId,
      instructions: "Paiement simulé : aucune activation automatique sans confirmation vérifiée.",
    };
  }

  async verifyPayment(externalId: string): Promise<ProviderVerification> {
    return {
      externalId,
      status: "PENDING",
      message: "Provider MOCK : aucune confirmation réelle.",
    };
  }

  verifyWebhook(): boolean {
    return !isProductionRuntime();
  }
}

function normalizePaymentMethod(value?: string | null): "MTN MoMo" | "Orange Money" {
  const normalized = String(value || "").trim().toUpperCase();
  if (["MTN", "MTN MOMO", "MTN_MOMO", "MOMO"].includes(normalized)) return "MTN MoMo";
  if (["ORANGE", "ORANGE MONEY", "ORANGE_MONEY"].includes(normalized)) return "Orange Money";
  throw new Error("PAYMENT_METHOD_INVALID");
}

export class IClanProvider implements PaymentProvider {
  private readonly base: string;
  private readonly tokenPath: string;
  private readonly makePaymentPath: string;
  private readonly verifyPaymentPath: string;
  private token: { value: string; expiresAt: number } | null = null;

  constructor() {
    assertPaymentProviderReady("ICLAN");
    this.base = (process.env.ICLAN_API_URL || "https://test.api.eduklan.com").replace(/\/$/, "");
    this.tokenPath = process.env.ICLAN_TOKEN_PATH || "/api/client/token";
    this.makePaymentPath = process.env.ICLAN_MAKE_PAYMENT_PATH || "/api/test/make_payment";
    this.verifyPaymentPath = process.env.ICLAN_VERIFY_PAYMENT_PATH || "/api/test/verify_payment";
  }

  private async tokenValue(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 15000) return this.token.value;

    const username = requiredEnv("ICLAN_USERNAME");
    const password = requiredEnv("ICLAN_PASSWORD");
    const response = await fetch(this.base + this.tokenPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.type !== "success" || !payload?.data?.token) {
      throw new Error("ICLAN_TOKEN_ERROR_" + response.status);
    }

    const expiresIn = Number(payload.data.expires_in || 300);
    this.token = {
      value: payload.data.token,
      expiresAt: Date.now() + Math.max(30, expiresIn - 15) * 1000,
    };
    return this.token.value;
  }

  private async request(path: string, body: unknown): Promise<any> {
    let token = await this.tokenValue();
    let response = await fetch(this.base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      this.token = null;
      token = await this.tokenValue();
      response = await fetch(this.base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("ICLAN_API_ERROR_" + response.status);
    return payload;
  }

  async createPayment(input: {
    paymentId: string;
    amount: number;
    currency: string;
    phone?: string | null;
    paymentMethod?: string | null;
  }): Promise<ProviderPaymentIntent> {
    if (input.currency !== "XAF") throw new Error("ICLAN_CURRENCY_UNSUPPORTED");
    if (!input.phone) throw new Error("PHONE_REQUIRED_FOR_ICLAN");

    const paymentMethod = normalizePaymentMethod(
      input.paymentMethod || process.env.ICLAN_DEFAULT_PAYMENT_METHOD || "MTN MoMo",
    );
    const payload = await this.request(this.makePaymentPath, {
      payment_method: paymentMethod,
      telephone: input.phone,
      amount: String(input.amount),
      external_id: input.paymentId,
    });

    if (payload?.data?.external_id !== input.paymentId) {
      throw new Error("ICLAN_EXTERNAL_ID_MISMATCH");
    }

    return {
      provider: "ICLAN",
      checkoutReference: input.paymentId,
      instructions: "Paiement " + paymentMethod + " lancé. Validez la demande sur votre téléphone puis vérifiez le statut.",
    };
  }

  async verifyPayment(externalId: string): Promise<ProviderVerification> {
    const payload = await this.request(this.verifyPaymentPath, { external_id: externalId });
    const data = payload?.data || {};
    const status = String(data.payment_status || "PENDING").toUpperCase();

    if (!["SUCCESSFUL", "FAILED", "PENDING"].includes(status)) {
      throw new Error("ICLAN_STATUS_INVALID");
    }

    const returnedExternalId = String(data.external_id ?? data.externalId ?? "").trim();
    if (!returnedExternalId) throw new Error("ICLAN_EXTERNAL_ID_MISSING");

    return {
      externalId: returnedExternalId,
      status: status as "SUCCESSFUL" | "FAILED" | "PENDING",
      amount: data.payment_amount == null ? undefined : Number(data.payment_amount),
      currency: String(data.payment_currency ?? data.currency ?? "XAF"),
      transactionId: data.transaction_id,
      paymentMethod: data.payment_method,
      paymentTelephone: data.payment_telephone,
      message: payload?.message,
    };
  }

  verifyWebhook(rawBody: string, signature: string | null, timestamp: string | null): boolean {
    const secret = process.env.ICLAN_WEBHOOK_SECRET;
    if (!secret || !signature || !timestamp) return false;

    const maxSkewSeconds = Number(process.env.PAYMENT_WEBHOOK_MAX_SKEW_SECONDS || 300);
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > maxSkewSeconds) {
      return false;
    }

    const expected = crypto.createHmac("sha256", secret)
      .update(timestamp + "." + rawBody)
      .digest("hex");
    const provided = signature.replace(/^sha256=/i, "");
    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(provided, "hex");

    return expectedBuffer.length === providedBuffer.length
      && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }
}

export function getProvider(name: string): PaymentProvider {
  assertPaymentProviderReady(name);
  if (name === "MOCK") return new MockPaymentProvider();
  if (name === "ICLAN") return new IClanProvider();
  throw new Error("PROVIDER_UNAVAILABLE");
}
