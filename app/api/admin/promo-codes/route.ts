import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authUser, adminClient, ensureUser, requireRole } from "../../../../lib/mobilityServer";
import { generatePromoCode, normalizePromoCode, promoCodeHash, promoEndDate } from "../../../../lib/promo";

async function getAdmin(request: NextRequest) {
  const au = await authUser(request);
  if (!au) return { error: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const sb = adminClient();
  const user = await ensureUser(sb, au);
  const denied = requireRole(user, ["ADMIN"]);
  if (denied) return { error: NextResponse.json({ message: denied.error }, { status: denied.status }) };
  return { sb, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdmin(request);
    if (auth.error) return auth.error;
    const { sb } = auth;
    const { data, error } = await sb
      .from("PromoCode")
      .select("id,code,label,sponsorName,sponsorType,scope,planCode,maxRedemptions,redemptionsCount,validFrom,expiresAt,durationDays,active,notes,createdAt,updatedAt")
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ promoCodes: data ?? [] });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Codes indisponibles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdmin(request);
    if (auth.error) return auth.error;
    const { sb, user } = auth;
    const body = await request.json();
    const sponsorName = String(body.sponsorName || "JOBLY").trim();
    const label = String(body.label || `Accès Pro — ${sponsorName}`).trim();
    const sponsorType = String(body.sponsorType || "INTERNAL").toUpperCase();
    const scope = String(body.scope || "TALENT").toUpperCase();
    const maxRedemptions = Math.max(1, Number(body.maxRedemptions || 1));
    const durationDays = Math.max(1, Math.min(3650, Number(body.durationDays || 30)));
    const validFrom = body.validFrom ? new Date(body.validFrom) : new Date();
    const expiresAt = promoEndDate(validFrom, durationDays, body.expiresAt || null);
    const requested = normalizePromoCode(body.code);
    const code = requested || generatePromoCode(sponsorName);

    if (!sponsorName || !label) return NextResponse.json({ message: "Sponsor et libellé requis." }, { status: 400 });
    if (!["INTERNAL","INSTITUTION","PARTNER","INVESTOR","CAMPAIGN"].includes(sponsorType)) return NextResponse.json({ message: "Type sponsor invalide." }, { status: 400 });
    if (!["TALENT","RECRUITER","BOTH"].includes(scope)) return NextResponse.json({ message: "Périmètre invalide." }, { status: 400 });
    if (Number.isNaN(validFrom.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= validFrom) return NextResponse.json({ message: "Dates invalides." }, { status: 400 });

    const { data, error } = await sb.from("PromoCode").insert({
      id: crypto.randomUUID(), code, codeHash: promoCodeHash(code), label, sponsorName, sponsorType, scope,
      planCode: "PRO", maxRedemptions, redemptionsCount: 0, validFrom: validFrom.toISOString(), expiresAt: expiresAt.toISOString(),
      durationDays, active: true, notes: body.notes ? String(body.notes) : null, createdBy: user.id,
    }).select("id,code,label,sponsorName,sponsorType,scope,planCode,maxRedemptions,redemptionsCount,validFrom,expiresAt,durationDays,active,notes,createdAt").single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ message: "Ce code promo existe déjà." }, { status: 409 });
      throw new Error(error.message);
    }
    return NextResponse.json({ promoCode: data, generatedCode: code }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Création impossible." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAdmin(request);
    if (auth.error) return auth.error;
    const { sb } = auth;
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ message: "Identifiant requis." }, { status: 400 });
    const { data, error } = await sb.from("PromoCode").update({ active: Boolean(body.active) }).eq("id", id)
      .select("id,code,active,expiresAt,redemptionsCount,maxRedemptions").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ promoCode: data });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Mise à jour impossible." }, { status: 500 });
  }
}
