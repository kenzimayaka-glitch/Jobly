import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { getEntitlements, getPlan } from "../../../lib/billingCatalog";
import { isTestUnlimited } from "../../../lib/entitlements";

export async function GET(request: NextRequest) {
  try {
    const a = await getAuthUser(request);
    if (!a) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const u = await ensureUser(sb, a);
    const { data } = await sb
      .from("Subscription")
      .select("plan,status,currentPeriodEnd")
      .eq("userId", u.id)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    const active = data && (data.status === "ACTIVE" || data.status === "TRIAL");
    const plan = getPlan(active ? String(data.plan) : "FREE") || getPlan("FREE")!;
    const testUnlimited = isTestUnlimited();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: usedApplications } = await sb
      .from("Application")
      .select("id", { count: "exact", head: true })
      .eq("userId", u.id)
      .neq("status", "DISCOVERED")
      .gte("submittedAt", since);

    const entitlements = getEntitlements(plan.code);

    return NextResponse.json({
      entitlements: testUnlimited
        ? { ...entitlements, aiCredits: Infinity, storageMb: Infinity, applicationsPerWeek: Infinity, bulkApplicationLimit: Infinity, cvVersions: Infinity, savedJobs: Infinity, alerts: Infinity, testUnlimited: true }
        : { ...entitlements, testUnlimited: false },
      usage: { applicationsThisWeek: usedApplications || 0 },
      subscription: { plan: plan.code, status: active ? data?.status : "ACTIVE", currentPeriodEnd: active ? data?.currentPeriodEnd : null },
    });
  } catch (e) {
    return NextResponse.json({ error: "ENTITLEMENTS_UNAVAILABLE", message: e instanceof Error ? e.message : "Droits indisponibles." }, { status: 500 });
  }
}
