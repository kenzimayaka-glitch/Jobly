import { NextRequest } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { getActivePlanCode } from "@/lib/entitlements";
import { getEntitlements, PlanCode } from "@/lib/billingCatalog";

// Community is account-level: either ecosystem can grant the shared Community/badge entitlement.
const PLAN_RANK: Record<PlanCode, number> = { FREE: 0, START: 1, PREMIUM: 2, PRO: 3 };

export async function getCommunityEntitlementsForUser(db: any, userId: string) {
  const [talentPlan, recruiterPlan] = await Promise.all([
    getActivePlanCode(db, userId, "TALENT"),
    getActivePlanCode(db, userId, "RECRUITER"),
  ]);
  const planCode = PLAN_RANK[recruiterPlan] > PLAN_RANK[talentPlan] ? recruiterPlan : talentPlan;
  // Community entitlement is defined by the Community product rule, not the generic billing catalog.
  // FREE has no access; START/PREMIUM/PRO have access; PREMIUM/PRO receive the blue badge.
  return {
    planCode,
    communityAccess: planCode !== "FREE",
    blueBadge: PLAN_RANK[planCode] >= PLAN_RANK.PREMIUM,
  };
}

export async function getCommunityAccess(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return { allowed: false, reason: "UNAUTHENTICATED" as const, authUser: null, user: null, db: null, subscription: null, planCode: "FREE" as const, blueBadge: false };

  const db = adminClient();
  const user = await ensureUser(db, authUser);
  const entitlements = await getCommunityEntitlementsForUser(db, user.id);

  return {
    allowed: entitlements.communityAccess,
    reason: entitlements.communityAccess ? "ACTIVE" as const : "SUBSCRIPTION_REQUIRED" as const,
    authUser,
    user,
    db,
    subscription: null,
    planCode: entitlements.planCode,
    blueBadge: entitlements.blueBadge,
  };
}
