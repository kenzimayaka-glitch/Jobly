import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../lib/mobilityServer";
import { normalizePromoCode, promoCodeHash, promoEndDate, promoScopeAllows } from "../../../lib/promo";

export async function POST(request: NextRequest) {
  try {
    const au = await authUser(request);
    if (!au) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const user = await ensureUser(sb, au);
    const body = await request.json();
    const code = normalizePromoCode(body.code);
    if (!code) return NextResponse.json({ message: "Code promo requis." }, { status: 400 });

    const { data: promo, error: promoError } = await sb.from("PromoCode").select("*").eq("codeHash", promoCodeHash(code)).maybeSingle();
    if (promoError) throw new Error(promoError.message);
    if (!promo) return NextResponse.json({ message: "Code promo invalide." }, { status: 404 });

    const now = new Date();
    if (!promo.active || new Date(promo.validFrom) > now || (promo.expiresAt && new Date(promo.expiresAt) <= now)) {
      return NextResponse.json({ message: "Ce code promo n'est plus valide." }, { status: 410 });
    }
    if (promo.redemptionsCount >= promo.maxRedemptions) return NextResponse.json({ message: "Ce code promo a atteint sa limite d'utilisation." }, { status: 409 });

    const productType: "TALENT" | "RECRUITER" = String(user.role) === "RECRUITER" ? "RECRUITER" : "TALENT";
    if (!promoScopeAllows(promo.scope, productType)) return NextResponse.json({ message: "Ce code n'est pas destiné à ce profil JOBLY." }, { status: 403 });

    const { data: existing } = await sb.from("PromoRedemption").select("id,endsAt").eq("promoCodeId", promo.id).eq("userId", user.id).eq("productType", productType).maybeSingle();
    if (existing && (!existing.endsAt || new Date(existing.endsAt) > now)) return NextResponse.json({ message: "Ce code a déjà été utilisé sur ce profil.", endsAt: existing.endsAt }, { status: 409 });

    const { data: claimed } = await sb.from("PromoCode").update({ redemptionsCount: promo.redemptionsCount + 1 }).eq("id", promo.id).lt("redemptionsCount", promo.maxRedemptions).select("id").maybeSingle();
    if (!claimed) return NextResponse.json({ message: "Ce code vient d'être épuisé." }, { status: 409 });

    const endsAt = promoEndDate(now, promo.durationDays, promo.expiresAt);
    const { data: redemption, error: redemptionError } = await sb.from("PromoRedemption").insert({
      promoCodeId: promo.id, userId: user.id, productType, grantedPlan: "PRO", startsAt: now.toISOString(), endsAt: endsAt.toISOString(),
    }).select("id,productType,grantedPlan,startsAt,endsAt").single();
    if (redemptionError) {
      await sb.from("PromoCode").update({ redemptionsCount: Math.max(0, promo.redemptionsCount) }).eq("id", promo.id);
      if (redemptionError.code === "23505") return NextResponse.json({ message: "Ce code a déjà été utilisé sur ce profil." }, { status: 409 });
      throw new Error(redemptionError.message);
    }

    return NextResponse.json({ activated: true, plan: "PRO", productType, redemption });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Activation du code impossible." }, { status: 500 });
  }
}
