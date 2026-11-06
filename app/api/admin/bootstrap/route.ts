import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Connectez-vous d'abord à votre compte Jobly." }, { status: 401 });

    const verifiedEmail = String(auth.email || "").trim().toLowerCase();
    const emailConfirmedAt = (auth as { email_confirmed_at?: string | null }).email_confirmed_at;
    const rootEmail = String(process.env.JOBLY_ROOT_ADMIN_EMAIL || "").trim().toLowerCase();

    if (!rootEmail) {
      return NextResponse.json({
        message: "Le bootstrap administrateur n'est pas configuré. Définissez JOBLY_ROOT_ADMIN_EMAIL côté serveur avec l'adresse qui doit devenir administrateur.",
        code: "ROOT_ADMIN_EMAIL_NOT_CONFIGURED",
      }, { status: 503 });
    }
    if (!emailConfirmedAt || !verifiedEmail || verifiedEmail !== rootEmail) {
      return NextResponse.json({ message: "Cette session ne correspond pas à l'adresse e-mail administrateur autorisée et vérifiée." }, { status: 403 });
    }

    const db = adminClient();
    const user = await ensureUser(db, auth);
    const { data: activeIdentities, error: activeError } = await db.from("AdminIdentity")
      .select("authUserId")
      .eq("active", true)
      .limit(10);
    if (activeError) throw new Error(activeError.message);
    if ((activeIdentities || []).some((entry: { authUserId: string }) => entry.authUserId !== auth.id)) {
      return NextResponse.json({ message: "Un compte administrateur maître est déjà activé. Contactez cet administrateur pour toute délégation." }, { status: 409 });
    }

    const { data: ownerIdentity, error: ownerError } = await db.from("AdminIdentity")
      .select("id,authUserId")
      .eq("ownerUserId", user.id)
      .maybeSingle();
    if (ownerError) throw new Error(ownerError.message);
    if (ownerIdentity && ownerIdentity.authUserId !== auth.id) {
      return NextResponse.json({ message: "Cette identité Jobly est déjà rattachée à un autre accès administrateur." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { error: identityError } = await db.from("AdminIdentity").upsert({
      id: ownerIdentity?.id || crypto.randomUUID(),
      ownerUserId: user.id,
      authUserId: auth.id,
      active: true,
      updatedAt: now,
    }, { onConflict: "ownerUserId" });
    if (identityError) throw new Error(identityError.message);

    const metadata = auth.user_metadata || {};
    const firstName = String(metadata.first_name || "").trim() || null;
    const lastName = String(metadata.last_name || "").trim() || null;
    const phone = auth.phone || null;
    const { error: userError } = await db.from("User").update({
      role: "ADMIN",
      email: verifiedEmail,
      phone,
      firstName,
      lastName,
      displayName: String(metadata.full_name || metadata.name || user.displayName || verifiedEmail),
      updatedAt: now,
    }).eq("id", user.id);
    if (userError) throw new Error(userError.message);

    const { data: profile, error: profileLookupError } = await db.from("Profile")
      .select("id").eq("userId", user.id).maybeSingle();
    if (profileLookupError) throw new Error(profileLookupError.message);
    if (!profile) {
      const { error: profileError } = await db.from("Profile").insert({
        id: crypto.randomUUID(), userId: user.id, firstName, lastName, phone,
      });
      if (profileError) throw new Error(profileError.message);
    }

    return NextResponse.json({ ok: true, mode: "ADMIN", message: "Compte administrateur activé. Votre identité Jobly peut maintenant basculer entre l'espace utilisateur et l'administration." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Activation administrateur impossible." }, { status: 500 });
  }
}
