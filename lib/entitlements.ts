import { getEntitlements, getPlan, PlanCode } from "./billingCatalog";

export function isTestUnlimited(): boolean { return String(process.env.JOBLY_TEST_UNLIMITED || "").toLowerCase() === "true"; }

export async function getActivePlanCode(supabase: any, userId: string, productType: "TALENT" | "RECRUITER" = "TALENT"): Promise<PlanCode> {
  const now = new Date().toISOString();
  const { data: promo } = await supabase.from("PromoRedemption").select("grantedPlan,endsAt").eq("userId", userId).eq("productType", productType).is("revokedAt", null).gt("endsAt", now).order("endsAt", { ascending: false }).limit(1).maybeSingle();
  if (promo?.grantedPlan === "PRO") return "PRO";
  const { data } = await supabase.from("Subscription").select("planCode,status").eq("userId", userId).eq("productType", productType).order("createdAt", { ascending: false }).limit(1).maybeSingle();
  const active = data && (data.status === "ACTIVE" || data.status === "TRIAL");
  return (active ? data.planCode : "FREE") as PlanCode;
}

export type QuotaCheck = { allowed: boolean; used: number; limit: number; unlimited: boolean; message?: string };

export async function checkWeeklyApplicationQuota(supabase: any, userId: string): Promise<QuotaCheck> {
  if (isTestUnlimited()) return { allowed: true, used: 0, limit: Infinity, unlimited: true };
  const plan = await getActivePlanCode(supabase, userId, "TALENT"); const entitlements = getEntitlements(plan); const limit = entitlements.applicationsPerWeek;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("Application").select("id", { count: "exact", head: true }).eq("userId", userId).neq("status", "DISCOVERED").gte("submittedAt", since);
  const used = count || 0;
  if (used >= limit) { const nextPlan = plan === "FREE" ? "START" : plan === "START" ? "PREMIUM" : plan === "PREMIUM" ? "PRO" : null; return { allowed: false, used, limit, unlimited: false, message: nextPlan ? `Votre quota hebdomadaire est atteint (${used}/${limit} candidatures). Passez à ${getPlan(nextPlan)?.name} pour augmenter votre quota.` : `Votre quota hebdomadaire est atteint (${used}/${limit} candidatures). Il sera renouvelé dans 7 jours.` }; }
  return { allowed: true, used, limit, unlimited: false };
}

export async function checkBulkApplicationLimit(supabase: any, userId: string, selectedCount: number): Promise<QuotaCheck> {
  if (isTestUnlimited()) return { allowed: true, used: selectedCount, limit: Infinity, unlimited: true };
  const plan = await getActivePlanCode(supabase, userId, "TALENT"); const entitlements = getEntitlements(plan); const limit = entitlements.bulkApplicationLimit;
  if (selectedCount > limit) return { allowed: false, used: selectedCount, limit, unlimited: false, message: limit <= 1 ? "La postulation groupée est disponible à partir de Premium (jusqu'à 10 offres simultanées)." : `Vous pouvez postuler à ${limit} offres simultanément maximum avec votre formule actuelle.` };
  return { allowed: true, used: selectedCount, limit, unlimited: false };
}
