import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import {
  getEntitlements,
  getPlan,
  getRecruiterEntitlements,
  getRecruiterPlan,
} from "../../../lib/billingCatalog";
import { isTestUnlimited, resolveActiveEntitlements } from "../../../lib/entitlements";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const productType: "TALENT" | "RECRUITER" = String(user.role) === "RECRUITER" ? "RECRUITER" : "TALENT";
    const resolved = await resolveActiveEntitlements(supabase, user.id, productType);
    const plan = productType === "RECRUITER"
      ? getRecruiterPlan(resolved.planCode) || getRecruiterPlan("FREE")!
      : getPlan(resolved.planCode) || getPlan("FREE")!;
    const testUnlimited = isTestUnlimited();
    const now = new Date().toISOString();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: usedApplications, error: usageError } = await supabase
      .from("Application")
      .select("id", { count: "exact", head: true })
      .eq("userId", user.id)
      .neq("status", "DISCOVERED")
      .gte("submittedAt", since);
    if (usageError) throw new Error(usageError.message);

    const entitlements = productType === "RECRUITER"
      ? getRecruiterEntitlements(plan.code)
      : getEntitlements(plan.code);
    const currentPeriodEnd = resolved.subscription
      ? (resolved.subscription.status === "TRIAL" ? resolved.subscription.trialEndsAt : resolved.subscription.currentPeriodEnd)
      : resolved.promo?.endsAt || null;
    const status = resolved.source === "PROMO"
      ? "PROMO"
      : resolved.subscription?.status || "FREE";

    return NextResponse.json({
      entitlements: testUnlimited
        ? {
            ...entitlements,
            aiCredits: Infinity,
            ...(productType === "TALENT"
              ? { storageMb: Infinity, applicationsPerWeek: Infinity, bulkApplicationLimit: Infinity, cvVersions: Infinity, savedJobs: Infinity, alerts: Infinity }
              : {}),
            testUnlimited: true,
          }
        : { ...entitlements, testUnlimited: false },
      usage: { applicationsThisWeek: usedApplications || 0 },
      subscription: {
        plan: resolved.planCode,
        planCode: resolved.planCode,
        status,
        currentPeriodEnd,
        productType,
        source: resolved.source,
      },
      promo: resolved.promo
        ? {
            plan: resolved.promo.grantedPlan,
            productType: resolved.promo.productType,
            startsAt: resolved.promo.startsAt,
            endsAt: resolved.promo.endsAt,
          }
        : null,
      serverTime: now,
    });
  } catch (error) {
    return NextResponse.json({
      error: "ENTITLEMENTS_UNAVAILABLE",
      message: error instanceof Error ? error.message : "Droits indisponibles.",
    }, { status: 500 });
  }
}
