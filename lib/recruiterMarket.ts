import { getActivePlanCode } from "./entitlements";
import { getRecruiterEntitlements, PlanCode } from "./billingCatalog";

export type RecruiterDistributionScope = "LOCAL" | "COUNTRIES" | "AFRICA";

export type RecruiterMarketInput = {
  distributionScope?: unknown;
  countryCode?: unknown;
  targetCountryCodes?: unknown;
};

function normalizeCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v).trim().toUpperCase()).filter(Boolean))];
}

export function normalizeRecruiterMarket(input: RecruiterMarketInput, fallbackCountryCode?: string | null) {
  const scope = input.distributionScope === "COUNTRIES" || input.distributionScope === "AFRICA" ? input.distributionScope : "LOCAL";
  const codes = normalizeCodes(input.targetCountryCodes);
  const countryCode = String(input.countryCode ?? fallbackCountryCode ?? "").trim().toUpperCase() || null;
  return { distributionScope: scope as RecruiterDistributionScope, countryCode, targetCountryCodes: codes };
}

export async function enforceRecruiterMarketEntitlement(
  supabase: any,
  userId: string,
  market: ReturnType<typeof normalizeRecruiterMarket>,
  status: "draft" | "published" | "closed"
) {
  const plan = await getActivePlanCode(supabase, userId, "RECRUITER");
  const entitlements = getRecruiterEntitlements(plan);

  if (market.distributionScope === "LOCAL") {
    if (!market.countryCode && status === "published") {
      return { ok: false as const, message: "Le pays du marché est obligatoire pour publier l’offre." };
    }
    return { ok: true as const, plan };
  }

  if (market.distributionScope === "COUNTRIES") {
    if (market.targetCountryCodes.length < 2) {
      return { ok: false as const, message: "Sélectionnez au moins deux pays pour une diffusion multi-pays." };
    }
    if (status === "published" && plan !== "PRO") {
      return { ok: false as const, plan, message: "La diffusion effective multi-pays est réservée à Recruiter PRO. Les autres formules peuvent préparer plusieurs marchés en brouillon." };
    }
    if (!entitlements.multiCountryDraft) {
      return { ok: false as const, plan, message: "La préparation de plusieurs marchés commence avec Recruiter START." };
    }
    return { ok: true as const, plan };
  }

  if (market.distributionScope === "AFRICA") {
    if (status === "published" && !entitlements.panAfricanDistribution) {
      return { ok: false as const, plan, message: "La diffusion panafricaine est réservée à Recruiter PRO." };
    }
    if (!entitlements.panAfricanDistribution) {
      return { ok: false as const, plan, message: "La préparation de la diffusion panafricaine est réservée à Recruiter PRO." };
    }
    return { ok: true as const, plan };
  }

  return { ok: false as const, plan, message: "Marché de diffusion invalide." };
}
