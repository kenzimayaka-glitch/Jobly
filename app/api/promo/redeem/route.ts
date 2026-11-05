import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, resolveBillingProductType } from "../../../../lib/server-auth";
import { normalizePromoCode, promoCodeHash, promoScopeAllows } from "../../../../lib/promo";

function errorResponse(message: string, status: number, code = message) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return errorResponse("Session requise.", 401, "UNAUTHENTICATED");

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const body = await request.json();
    const code = normalizePromoCode(body.code);
    if (!code) return errorResponse("Code promo requis.", 400, "PROMO_CODE_REQUIRED");

    let productType: "TALENT" | "RECRUITER";
    try {
      productType = await resolveBillingProductType(supabase, user, authUser.id, body.productType);
    } catch (productError) {
      const message = productError instanceof Error ? productError.message : "INVALID_PRODUCT_TYPE";
      if (message === "RECRUITER_PROFILE_REQUIRED") {
        return errorResponse("Un profil recruteur doit être créé avant d'utiliser ce code.", 403, message);
      }
      if (message === "INVALID_PRODUCT_TYPE") return errorResponse("Profil de facturation invalide.", 400, message);
      throw productError;
    }

    // PromoCode and PromoRedemption are legacy lowercase SQL columns.
    const { data: promo, error: promoError } = await supabase
      .from("PromoCode")
      .select("id,active,validfrom,expiresat,maxredemptions,redemptionscount,scope,codehash")
      .eq("codehash", promoCodeHash(code))
      .maybeSingle();

    if (promoError) throw new Error(promoError.message);
    if (!promo) return errorResponse("Code promo invalide.", 404, "PROMO_NOT_FOUND");

    const now = new Date();
    if (!promoScopeAllows(promo.scope, productType)) {
      return errorResponse("Ce code n'est pas destiné à ce profil JOBLY.", 403, "PROMO_SCOPE_MISMATCH");
    }
    if (
      !promo.active
      || new Date(promo.validfrom) > now
      || (promo.expiresat && new Date(promo.expiresat) <= now)
    ) {
      return errorResponse("Ce code promo n'est pas encore valide ou a expiré.", 410, "PROMO_NOT_ACTIVE");
    }
    if (promo.redemptionscount >= promo.maxredemptions) {
      return errorResponse("Ce code promo a atteint sa limite d'utilisation.", 409, "PROMO_LIMIT_REACHED");
    }

    // The database function locks the promo row and atomically increments its quota
    // while inserting the unique redemption. No client can oversubscribe a code.
    const { data: redemption, error: redemptionError } = await supabase.rpc("redeem_promo_code", {
      p_promo_code_id: promo.id,
      p_user_id: user.id,
      p_product_type: productType,
      p_now: now.toISOString(),
    });

    if (redemptionError) {
      const message = String(redemptionError.message || "");
      if (message.includes("PROMO_NOT_FOUND")) return errorResponse("Code promo invalide.", 404, "PROMO_NOT_FOUND");
      if (message.includes("PROMO_NOT_ACTIVE") || message.includes("PROMO_EXPIRED_AT_CREATION")) {
        return errorResponse("Ce code promo n'est pas encore valide ou a expiré.", 410, "PROMO_NOT_ACTIVE");
      }
      if (message.includes("PROMO_LIMIT_REACHED")) return errorResponse("Ce code promo a atteint sa limite d'utilisation.", 409, "PROMO_LIMIT_REACHED");
      if (message.includes("PROMO_SCOPE_MISMATCH")) return errorResponse("Ce code n'est pas destiné à ce profil JOBLY.", 403, "PROMO_SCOPE_MISMATCH");
      if (message.includes("PROMO_ALREADY_REDEEMED") || message.includes("23505")) {
        return errorResponse("Ce code a déjà été utilisé sur ce profil.", 409, "PROMO_ALREADY_REDEEMED");
      }
      throw new Error(redemptionError.message);
    }

    return NextResponse.json({
      activated: true,
      plan: "PRO",
      productType,
      redemption,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Activation du code impossible.", 500);
  }
}
