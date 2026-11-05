const PLAN_CODES = new Set(["FREE", "START", "PREMIUM", "PRO"]);

function isFuture(value: unknown, nowMs: number): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > nowMs;
}

export function isEligibleSubscription(subscription: unknown, nowMs: number): boolean {
  if (!subscription || typeof subscription !== "object") return false;
  const record = subscription as Record<string, unknown>;
  if (!PLAN_CODES.has(String(record.planCode || ""))) return false;

  if (record.status === "ACTIVE") return isFuture(record.currentPeriodEnd, nowMs);
  if (record.status === "TRIAL") return isFuture(record.trialEndsAt, nowMs);
  return false;
}

export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production"
    || (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");
}

/** Errors that prove the provider rejected input before creating a charge. */
export function isDefinitiveProviderFailure(message: string): boolean {
  return /^(ICLAN_API_ERROR_4\d{2}|ICLAN_TOKEN_ERROR_4\d{2}|PHONE_REQUIRED_FOR_ICLAN|PAYMENT_METHOD_INVALID|ICLAN_CURRENCY_UNSUPPORTED)$/.test(message);
}


function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(name + "_NOT_CONFIGURED");
  return value;
}

function validatedPath(value: string, name: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("..")) {
    throw new Error(name + "_INVALID");
  }
  return value;
}

export function assertPaymentProviderReady(name: string): void {
  if (name === "MOCK") {
    if (isProductionRuntime()) throw new Error("MOCK_PROVIDER_DISABLED_IN_PRODUCTION");
    return;
  }
  if (name !== "ICLAN") throw new Error("PROVIDER_UNAVAILABLE");

  requiredEnv("ICLAN_USERNAME");
  requiredEnv("ICLAN_PASSWORD");

  if (isProductionRuntime()) {
    const base = requiredEnv("ICLAN_API_URL");
    const tokenPath = validatedPath(requiredEnv("ICLAN_TOKEN_PATH"), "ICLAN_TOKEN_PATH");
    const makePath = validatedPath(requiredEnv("ICLAN_MAKE_PAYMENT_PATH"), "ICLAN_MAKE_PAYMENT_PATH");
    const verifyPath = validatedPath(requiredEnv("ICLAN_VERIFY_PAYMENT_PATH"), "ICLAN_VERIFY_PAYMENT_PATH");
    let parsed: URL;
    try {
      parsed = new URL(base);
    } catch {
      throw new Error("ICLAN_API_URL_INVALID");
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("ICLAN_API_URL_INVALID");
    }
    if (
      parsed.hostname.toLowerCase() === "test.api.eduklan.com"
      || [tokenPath, makePath, verifyPath].some((path) => /\/api\/test(?:\/|$)/i.test(path))
    ) {
      throw new Error("ICLAN_SANDBOX_ENDPOINT_BLOCKED_IN_PRODUCTION");
    }
    return;
  }

  const base = process.env.ICLAN_API_URL || "https://test.api.eduklan.com";
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error("ICLAN_API_URL_INVALID");
    }
  } catch {
    throw new Error("ICLAN_API_URL_INVALID");
  }

  validatedPath(process.env.ICLAN_TOKEN_PATH || "/api/client/token", "ICLAN_TOKEN_PATH");
  validatedPath(process.env.ICLAN_MAKE_PAYMENT_PATH || "/api/test/make_payment", "ICLAN_MAKE_PAYMENT_PATH");
  validatedPath(process.env.ICLAN_VERIFY_PAYMENT_PATH || "/api/test/verify_payment", "ICLAN_VERIFY_PAYMENT_PATH");
}
