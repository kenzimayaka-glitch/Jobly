import crypto from "node:crypto";
import type { PlanCode } from "./billingCatalog";

export type PromoScope = "TALENT" | "RECRUITER" | "BOTH";

export function normalizePromoCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function promoCodeHash(code: string) {
  return crypto.createHash("sha256").update(normalizePromoCode(code)).digest("hex");
}

export function generatePromoCode(sponsorName: string) {
  const sponsor = String(sponsorName || "JOBLY").toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 10) || "JOBLY";
  return `JOBLY-PRO-${sponsor}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function promoEndDate(start: Date, durationDays: number, explicitExpiry?: string | null) {
  if (explicitExpiry) return new Date(explicitExpiry);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + durationDays);
  return end;
}

export function promoScopeAllows(scope: PromoScope, productType: "TALENT" | "RECRUITER") {
  return scope === "BOTH" || scope === productType;
}

export function promoPlan(): PlanCode { return "PRO"; }
