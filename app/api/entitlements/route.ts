import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { getEntitlements, getPlan, getRecruiterEntitlements, getRecruiterPlan } from "../../../lib/billingCatalog";
import { getActivePlanCode, isTestUnlimited } from "../../../lib/entitlements";

export async function GET(request: NextRequest) {
  try {
    const a = await getAuthUser(request);
    if (!a) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const u = await ensureUser(sb, a);
    const productType: "TALENT" | "RECRUITER" = String(u.role) === "RECRUITER" ? "RECRUITER" : "TALENT";
    const planCode = await getActivePlanCode(sb, u.id, productType);
    const plan = productType === "RECRUITER" ? getRecruiterPlan(planCode) || getRecruiterPlan("FREE")! : getPlan(planCode) || getPlan("FREE")!;
    const testUnlimited = isTestUnlimited();
    const now = new Date().toISOString();
    const { data: promo } = await sb.from("PromoRedemption").select("grantedPlan,productType,startsAt,endsAt").eq("userId", u.id).eq("productType", productType).is("revokedAt", null).gt("endsAt", now).order("endsAt", { ascending: false }).limit(1).maybeSingle();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: usedApplications } = await sb.from("Application").select("id", { count: "exact", head: true }).eq("userId", u.id).neq("status", "DISCOVERED").gte("createdAt", since);
    const { data: subscription } = await sb.from("Subscription").select("planCode,status,currentPeriodEnd,productType").eq("userId", u.id).eq("productType", productType).order("createdAt", { ascending: false }).limit(1).maybeSingle();
    const entitlements = productType === "RECRUITER" ? getRecruiterEntitlements(plan.code) : getEntitlements(plan.code);
    const effectiveEntitlements = testUnlimited && productType === "TALENT"
      ? { ...entitlements, aiCredits: -1, storageMb: -1, applicationsPerWeek: -1, bulkApplicationLimit: -1, cvVersions: -1, savedJobs: -1, alerts: -1, testUnlimited: true }
      : { ...entitlements, ...(testUnlimited ? { testUnlimited: true } : { testUnlimited: false }) };
    return NextResponse.json({
      entitlements: effectiveEntitlements,
      usage: { applicationsThisWeek: usedApplications || 0 },
      subscription: subscription ? { plan: plan.code, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd, productType: subscription.productType } : { plan: "FREE", status: "ACTIVE", currentPeriodEnd: null, productType },
      promo: promo ? { plan: promo.grantedPlan, productType: promo.productType, startsAt: promo.startsAt, endsAt: promo.endsAt } : null,
    });
  } catch (e) {
    return NextResponse.json({ error: "ENTITLEMENTS_UNAVAILABLE", message: e instanceof Error ? e.message : "Droits indisponibles." }, { status: 500 });
  }
}
