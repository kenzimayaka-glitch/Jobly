import { getPlan, PlanCode } from "./billingCatalog";

export type BillingProductType = "TALENT" | "RECRUITER";
export type EntitlementSource = "SUBSCRIPTION" | "PROMO" | "FREE";

export type EntitlementResolution = {
  planCode: PlanCode;
  source: EntitlementSource;
  subscription: any | null;
  promo: any | null;
};

export function isTestUnlimited(): boolean {
  // Test overrides must never grant production entitlements.
  if (process.env.NODE_ENV === "production") return false;
  return String(process.env.JOBLY_TEST_UNLIMITED || "").toLowerCase() === "true";
}

function isFuture(value: unknown, nowMs: number): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > nowMs;
}

function isEligibleSubscription(subscription: any, nowMs: number): boolean {
  if (!subscription || !getPlan(String(subscription.planCode || ""))) return false;

  if (subscription.status === "ACTIVE") {
    // Paid access must have a real, future billing-period end.
    return isFuture(subscription.currentPeriodEnd, nowMs);
  }

  if (subscription.status === "TRIAL") {
    return isFuture(subscription.trialEndsAt, nowMs);
  }

  return false;
}

export async function resolveActiveEntitlements(
  supabase: any,
  userId: string,
  productType: BillingProductType = "TALENT",
): Promise<EntitlementResolution> {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  const [promoResult, subscriptionResult] = await Promise.all([
    supabase
      .from("PromoRedemption")
      .select("grantedPlan,productType,startsAt,endsAt,revokedAt")
      .eq("userId", userId)
      .eq("productType", productType)
      .is("revokedAt", null)
      .lte("startsAt", nowIso)
      .gt("endsAt", nowIso)
      .order("endsAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("Subscription")
      .select("id,planCode,status,productType,currentPeriodStart,currentPeriodEnd,trialStartedAt,trialEndsAt,createdAt")
      .eq("userId", userId)
      .eq("productType", productType)
      .in("status", ["ACTIVE", "TRIAL"])
      .order("createdAt", { ascending: false })
      .limit(10),
  ]);

  if (promoResult.error) throw new Error(promoResult.error.message);
  if (subscriptionResult.error) throw new Error(subscriptionResult.error.message);

  const promo = promoResult.data;
  if (promo?.grantedPlan === "PRO") {
    return { planCode: "PRO", source: "PROMO", subscription: null, promo };
  }

  const subscriptions = Array.isArray(subscriptionResult.data) ? subscriptionResult.data : [];
  const activeSubscription = subscriptions.find((item: any) => isEligibleSubscription(item, nowMs)) || null;

  if (activeSubscription) {
    return {
      planCode: activeSubscription.planCode as PlanCode,
      source: "SUBSCRIPTION",
      subscription: activeSubscription,
      promo: null,
    };
  }

  return { planCode: "FREE", source: "FREE", subscription: null, promo: null };
}

export async function getActivePlanCode(
  supabase: any,
  userId: string,
  productType: BillingProductType = "TALENT",
): Promise<PlanCode> {
  const resolved = await resolveActiveEntitlements(supabase, userId, productType);
  return resolved.planCode;
}

export type QuotaCheck = { allowed: boolean; used: number; limit: number; unlimited: boolean; message?: string };

export async function checkWeeklyApplicationQuota(supabase: any, userId: string): Promise<QuotaCheck> {
  if (isTestUnlimited()) return { allowed: true, used: 0, limit: Infinity, unlimited: true };
  const plan = await getActivePlanCode(supabase, userId, "TALENT");
  const entitlements = getPlan(plan)!;
  const limit = entitlements.applicationsPerWeek;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("Application")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .neq("status", "DISCOVERED")
    .gte("submittedAt", since);
  if (error) throw new Error(error.message);
  const used = count || 0;

  if (used >= limit) {
    const nextPlan = plan === "FREE" ? "START" : plan === "START" ? "PREMIUM" : plan === "PREMIUM" ? "PRO" : null;
    return {
      allowed: false,
      used,
      limit,
      unlimited: false,
      message: nextPlan
        ? "Votre quota hebdomadaire est atteint (" + used + "/" + limit + " candidatures). Passez à " + getPlan(nextPlan)!.name + " pour augmenter votre quota."
        : "Votre quota hebdomadaire est atteint (" + used + "/" + limit + " candidatures). Il sera renouvelé dans 7 jours.",
    };
  }

  return { allowed: true, used, limit, unlimited: false };
}

export async function checkBulkApplicationLimit(supabase: any, userId: string, selectedCount: number): Promise<QuotaCheck> {
  if (isTestUnlimited()) return { allowed: true, used: selectedCount, limit: Infinity, unlimited: true };
  const plan = await getActivePlanCode(supabase, userId, "TALENT");
  const entitlements = getPlan(plan)!;
  const limit = entitlements.bulkApplicationLimit;

  if (selectedCount > limit) {
    return {
      allowed: false,
      used: selectedCount,
      limit,
      unlimited: false,
      message: limit <= 1
        ? "La postulation groupée est disponible à partir de Premium (jusqu'à 10 offres simultanées)."
        : "Vous pouvez postuler à " + limit + " offres simultanément maximum avec votre formule actuelle.",
    };
  }

  return { allowed: true, used: selectedCount, limit, unlimited: false };
}
