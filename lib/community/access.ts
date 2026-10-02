import { NextRequest } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

const PAID_PLANS = new Set(["START", "PREMIUM", "PRO", "PREMIUM_MONTHLY", "PREMIUM_ANNUAL"]);

export async function getCommunityAccess(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return { allowed: false, reason: "UNAUTHENTICATED" as const, authUser: null, user: null, db: null };

  const db = adminClient();
  const user = await ensureUser(db, authUser);
  const { data: subscription, error } = await db
    .from("Subscription")
    .select("id,planCode,status,currentPeriodEnd")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const allowed =
    subscription?.status === "ACTIVE" &&
    PAID_PLANS.has(String(subscription?.planCode || "").toUpperCase());

  return { allowed, reason: allowed ? "ACTIVE" as const : "SUBSCRIPTION_REQUIRED" as const, authUser, user, db, subscription };
}
