import { NextRequest } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { getActivePlanCode } from "@/lib/entitlements";
import { getEntitlements } from "@/lib/billingCatalog";

export async function getCommunityAccess(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return { allowed: false, reason: "UNAUTHENTICATED" as const, authUser: null, user: null, db: null, subscription: null, planCode: "FREE" as const, blueBadge: false };

  const db = adminClient();
  const user = await ensureUser(db, authUser);
  const planCode = await getActivePlanCode(db, user.id, "TALENT");
  const entitlements = getEntitlements(planCode);

  return {
    allowed: entitlements.communityAccess,
    reason: entitlements.communityAccess ? "ACTIVE" as const : "SUBSCRIPTION_REQUIRED" as const,
    authUser,
    user,
    db,
    subscription: null,
    planCode,
    blueBadge: entitlements.blueBadge,
  };
}
