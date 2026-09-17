import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, getAuthUser } from "../../../../lib/server-auth";

// 15/09/2026 : seule l'unicité du username est exigée désormais — plus de
// contrainte de format à la création du compte (elle rejetait encore un
// username pourtant validé côté client/disponibilité, ce qui bloquait
// silencieusement "Commencer" pour tout username hors de l'ancien format).
function validUsername(value: string) { return value.trim().length > 0 && value.trim().length <= 40; }

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise après vérification de l'e-mail." }, { status: 401 });
    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || authUser.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const country = String(body.country || "").trim().toUpperCase();
    const username = String(body.username || "").trim();
    if (!firstName || !lastName || !email || !phone || !country) return NextResponse.json({ message: "Nom, prénom, téléphone, e-mail et pays sont obligatoires." }, { status: 400 });
    if (!validUsername(username)) return NextResponse.json({ message: "Choisis un username (non vide, 40 caractères maximum)." }, { status: 400 });
    if (body.privacyAccepted !== true) return NextResponse.json({ message: "Tu dois accepter la politique de confidentialité pour créer ton compte." }, { status: 400 });
    if (authUser.email?.toLowerCase() !== email) return NextResponse.json({ message: "L'adresse e-mail vérifiée ne correspond pas à l'inscription." }, { status: 400 });

    const supabase = adminClient();
    const { data: conflict } = await supabase.from("User").select("id").ilike("username", username).maybeSingle();
    if (conflict) return NextResponse.json({ message: "Ce username est déjà utilisé. Choisis-en un autre." }, { status: 409 });
    const { data: existing, error: existingError } = await supabase.from("User").select("id").eq("authUserId", authUser.id).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    const now = new Date().toISOString();
    const payload = { authUserId: authUser.id, email, phone, firstName, lastName, displayName: username, username, country, privacyAcceptedAt: now, updatedAt: now };
    let userId = existing?.id;
    if (userId) {
      const { error } = await supabase.from("User").update(payload).eq("id", userId); if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase.from("User").insert({ id: crypto.randomUUID(), ...payload }).select("id").single(); if (error) throw new Error(error.message); userId = data.id;
    }
    const { data: profile } = await supabase.from("Profile").select("id").eq("userId", userId).maybeSingle();
    const profilePayload = { firstName, lastName, phone, country };
    if (profile) {
      const { error } = await supabase.from("Profile").update(profilePayload).eq("id", profile.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("Profile").insert({ id: crypto.randomUUID(), userId, ...profilePayload });
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ ok: true, userId, username, profile: profilePayload });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de finaliser le compte." }, { status: 500 }); }
}
