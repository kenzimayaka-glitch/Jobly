import type { PlanCode } from "../billingCatalog";

export type JiaUpgradeNudge = {
  shown: true;
  featureKey: string;
  benefit: string;
  targetPlan: PlanCode;
  reason: string;
  href: string;
};

const PLAN_ORDER: PlanCode[] = ["FREE", "START", "PREMIUM", "PRO"];

export function nextPaidPlan(plan: PlanCode): PlanCode | null {
  const i = PLAN_ORDER.indexOf(plan);
  return i >= 0 && i < PLAN_ORDER.length - 1 ? PLAN_ORDER[i + 1] : null;
}

export async function maybeCreateJiaUpgradeNudge(
  sb: any,
  userId: string,
  planCode: PlanCode,
  featureKey: string,
  reason: string,
  benefit: string,
  targetPlan?: PlanCode | null,
): Promise<JiaUpgradeNudge | null> {
  if (planCode !== "FREE" && planCode !== "START" && planCode !== "PREMIUM") return null;
  const target = targetPlan || nextPaidPlan(planCode);
  if (!target || target === planCode) return null;

  const now = Date.now();
  const { data: recent } = await sb
    .from("JiaUpgradeNudge")
    .select("action,featureKey,createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(20);

  const rows = Array.isArray(recent) ? recent : [];
  const latestShown = rows.find((r: any) => r.action === "SHOWN");
  const latestSameFeature = rows.find((r: any) => r.featureKey === featureKey);
  if (latestShown && now - new Date(latestShown.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000) return null;
  if (latestSameFeature) {
    const age = now - new Date(latestSameFeature.createdAt).getTime();
    const cooldown = latestSameFeature.action === "DISMISSED" ? 14 : latestSameFeature.action === "CLICKED" ? 30 : 7;
    if (age < cooldown * 24 * 60 * 60 * 1000) return null;
  }

  await sb.from("JiaUpgradeNudge").insert({
    userId,
    featureKey,
    action: "SHOWN",
    planCode,
    metadata: { reason, benefit, targetPlan: target },
  });

  return { shown: true, featureKey, benefit, targetPlan: target, reason, href: "/abonnement" };
}
