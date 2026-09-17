import { getEntitlements, getPlan, PlanCode } from "./billingCatalog";

/**
 * Mode test JOBLY : quand JOBLY_TEST_UNLIMITED=true (variable d'env Vercel),
 * tous les utilisateurs authentifiés obtiennent des quotas illimités pour
 * pouvoir tester l'ensemble des parcours sans être bloqués. À désactiver
 * (ou retirer la variable) une fois les tests terminés.
 */
export function isTestUnlimited(): boolean {
  return String(process.env.JOBLY_TEST_UNLIMITED || "").toLowerCase() === "true";
}

export async function getActivePlanCode(supabase: any, userId: string): Promise<PlanCode> {
  const { data } = await supabase
    .from("Subscription")
    .select("plan,status")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active = data && (data.status === "ACTIVE" || data.status === "TRIAL");
  return (active ? data.plan : "FREE") as PlanCode;
}

export type QuotaCheck = { allowed: boolean; used: number; limit: number; unlimited: boolean; message?: string };

/**
 * Vérifie le quota hebdomadaire de candidatures (règle JOBLY §1) :
 * une candidature = une offre soumise (statut != DISCOVERED) sur les 7
 * derniers jours glissants.
 */
export async function checkWeeklyApplicationQuota(supabase: any, userId: string): Promise<QuotaCheck> {
  if (isTestUnlimited()) return { allowed: true, used: 0, limit: Infinity, unlimited: true };

  const plan = await getActivePlanCode(supabase, userId);
  const entitlements = getEntitlements(plan);
  const limit = entitlements.applicationsPerWeek;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("Application")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .neq("status", "DISCOVERED")
    .gte("submittedAt", since);

  const used = count || 0;
  if (used >= limit) {
    const nextPlan = plan === "FREE" ? "START" : plan === "START" ? "PREMIUM" : plan === "PREMIUM" ? "PRO" : null;
    return {
      allowed: false,
      used,
      limit,
      unlimited: false,
      message: nextPlan
        ? `Votre quota hebdomadaire est atteint (${used}/${limit} candidatures). Passez à ${getPlan(nextPlan)?.name} pour augmenter votre quota.`
        : `Votre quota hebdomadaire est atteint (${used}/${limit} candidatures). Il sera renouvelé dans 7 jours.`,
    };
  }
  return { allowed: true, used, limit, unlimited: false };
}

/** Vérifie qu'une postulation groupée (multi-offres) respecte la limite du plan. */
export async function checkBulkApplicationLimit(supabase: any, userId: string, selectedCount: number): Promise<QuotaCheck> {
  if (isTestUnlimited()) return { allowed: true, used: selectedCount, limit: Infinity, unlimited: true };

  const plan = await getActivePlanCode(supabase, userId);
  const entitlements = getEntitlements(plan);
  const limit = entitlements.bulkApplicationLimit;

  if (selectedCount > limit) {
    return {
      allowed: false,
      used: selectedCount,
      limit,
      unlimited: false,
      message: limit <= 1
        ? "La postulation groupée est disponible à partir de Premium (jusqu'à 10 offres simultanées)."
        : `Vous pouvez postuler à ${limit} offres simultanément maximum avec votre formule actuelle.`,
    };
  }
  return { allowed: true, used: selectedCount, limit, unlimited: false };
}
