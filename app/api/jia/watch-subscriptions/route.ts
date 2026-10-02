import { NextRequest, NextResponse } from "next/server";
import { ensureUser, adminClient, getAuthUser } from "@/lib/server-auth";
import { defaultWatchTargets } from "@/lib/jia/watcher";
import { createOrUpdateWatchSubscription } from "@/lib/jia/watchPersistence";
import { evaluateTalentMarketAction, normalizeTargetCountryCodes } from "@/lib/talentMarketEntitlements";
import { getActivePlanCode } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function marketTarget(countries: string[]) {
  const key = `talent-market:${countries.join("-")}`;
  return {
    key,
    query: `nouvelles offres emploi recrutement ${countries.join(" ")} Afrique`,
    domain: "Jobs",
  };
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  const sb = adminClient();
  const user = await ensureUser(sb, auth);
  const { data, error } = await sb.from("JiaWatchSubscription").select("*").eq("userId", user.id).order("createdAt", { ascending: true });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const marketScope = typeof body?.marketScope === "string" ? body.marketScope.toUpperCase() : null;
    const countries = normalizeTargetCountryCodes(body?.targetCountryCodes);

    if (marketScope === "COUNTRIES") {
      const action = body?.mode === "PREPARE" ? "PREPARE_MULTI_COUNTRY" : "ACTIVE_MULTI_COUNTRY_WATCH";
      const plan = await getActivePlanCode(sb, user.id, "TALENT");
      const decision = evaluateTalentMarketAction({ plan, action, scope: "COUNTRIES", targetCountryCodes: countries });
      if (!decision.allowed) return NextResponse.json({ message: decision.reason, code: "TALENT_MARKET_ENTITLEMENT_REQUIRED", decision }, { status: 403 });

      if (action === "PREPARE_MULTI_COUNTRY") {
        return NextResponse.json({ prepared: true, active: false, decision, market: { scope: "COUNTRIES", targetCountryCodes: countries } });
      }

      const subscription = await createOrUpdateWatchSubscription(user.id, marketTarget(countries), {
        country: countries.join(","),
        frequencyMinutes: typeof body?.frequencyMinutes === "number" ? body.frequencyMinutes : 1440,
        notificationMode: typeof body?.notificationMode === "string" ? body.notificationMode : undefined,
        validationMode: typeof body?.validationMode === "string" ? body.validationMode : undefined,
      });
      return NextResponse.json({ subscription, decision }, { status: 201 });
    }

    if (marketScope === "AFRICA") {
      const plan = await getActivePlanCode(sb, user.id, "TALENT");
      const decision = evaluateTalentMarketAction({ plan, action: "AFRICA_WATCH", scope: "AFRICA" });
      if (!decision.allowed) return NextResponse.json({ message: decision.reason, code: "TALENT_MARKET_ENTITLEMENT_REQUIRED", decision }, { status: 403 });
      const target = { key: "talent-market:africa", query: "nouvelles offres emploi recrutement Afrique", domain: "Jobs" };
      const subscription = await createOrUpdateWatchSubscription(user.id, target, {
        country: "AFRICA",
        frequencyMinutes: typeof body?.frequencyMinutes === "number" ? body.frequencyMinutes : 1440,
      });
      return NextResponse.json({ subscription, decision }, { status: 201 });
    }

    const key = typeof body?.key === "string" ? body.key : "";
    const target = defaultWatchTargets().find(item => item.key === key);
    if (!target) return NextResponse.json({ message: "Cible de veille inconnue." }, { status: 400 });

    const subscription = await createOrUpdateWatchSubscription(user.id, target, {
      country: typeof body?.country === "string" ? body.country : undefined,
      frequencyMinutes: typeof body?.frequencyMinutes === "number" ? body.frequencyMinutes : undefined,
      notificationMode: typeof body?.notificationMode === "string" ? body.notificationMode : undefined,
      validationMode: typeof body?.validationMode === "string" ? body.validationMode : undefined,
    });
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Veille indisponible." }, { status: 500 });
  }
}
