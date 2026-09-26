import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { checkBulkApplicationLimit, checkWeeklyApplicationQuota, getActivePlanCode } from "../../../../lib/entitlements";
import { getEntitlements } from "../../../../lib/billingCatalog";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const body = await request.json().catch(() => ({}));
    const selectedCount = Math.max(0, Math.min(10, Number(body.selectedCount || 0)));

    const planCode = await getActivePlanCode(supabase, user.id, "TALENT");
    const entitlements = getEntitlements(planCode);
    const bulk = await checkBulkApplicationLimit(supabase, user.id, selectedCount);
    const weekly = await checkWeeklyApplicationQuota(supabase, user.id);

    if (!bulk.allowed) {
      return NextResponse.json({
        message: bulk.message || "La postulation groupée n'est pas disponible avec votre formule.",
        code: "BULK_LIMIT_EXCEEDED",
        planCode,
        limit: bulk.limit,
        selectedCount,
        weekly,
      }, { status: 403 });
    }

    if (selectedCount > 0 && !weekly.allowed) {
      return NextResponse.json({
        message: weekly.message || "Votre quota hebdomadaire de candidatures est atteint.",
        code: "QUOTA_EXCEEDED",
        planCode,
        limit: entitlements.applicationsPerWeek,
        selectedCount,
        weekly,
      }, { status: 429 });
    }

    return NextResponse.json({
      ok: true,
      planCode,
      premium: entitlements.premium,
      bulkApplicationLimit: entitlements.bulkApplicationLimit,
      weeklyLimit: entitlements.applicationsPerWeek,
      weeklyUsed: weekly.used,
      weeklyRemaining: Math.max(0, entitlements.applicationsPerWeek - weekly.used),
      selectedCount,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de vérifier le panier de candidatures." }, { status: 500 });
  }
}
