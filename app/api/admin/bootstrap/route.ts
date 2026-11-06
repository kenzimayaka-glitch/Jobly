import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, getAuthUser } from "@/lib/server-auth";

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
    const metadata = auth.user_metadata || {};
    const firstName = String(metadata.first_name || "").trim() || null;
    const lastName = String(metadata.last_name || "").trim() || null;
    const phone = auth.phone || null;
    const now = new Date().toISOString();

    const { data: activeIdentities, error: activeError } = await db.from("AdminIdentity")
      .select("authUserId")
      .eq("active", true)
      .limit(10);
    if (activeError) throw new Error(activeError.message);
    if ((activeIdentities || []).some((entry: { authUserId: string }) => entry.authUserId !== auth.id)) {
      return NextResponse.json({ message: "Un compte administrateur maître est déjà activé. Contactez cet administrateur pour toute délégation." }, { status: 409 });
    }

    const { data: linkedUser, error: linkedError } = await db.from("User")
      .select("*").eq("authUserId", auth.id).maybeSingle();
    if (linkedError) throw new Error(linkedError.message);

    let user = linkedUser;
    if (!user) {
      // Reuse the pre-existing unlinked ADMIN row when present instead of creating a duplicate identity.
      const { data: unlinkedAdmin, error: unlinkedError } = await db.from("User")
        .select("*").eq("role", "ADMIN").is("authUserId", null).limit(1).maybeSingle();
      if (unlinkedError) throw new Error(unlinkedError.message);
      if (unlinkedAdmin) {
        const { data: rebound, error: reboundError } = await db.from("User").update({
          authUserId: auth.id,
          email: verifiedEmail,
          phone,
          firstName,
          lastName,
          displayName: String(metadata.full_name || metadata.name || unlinkedAdmin.displayName || verifiedEmail),
          role: "ADMIN",
          updatedAt: now,
        }).eq("id", unlinkedAdmin.id).is("authUserId", null).select("*").maybeSingle();
        if (reboundError) throw new Error(reboundError.message);
        if (!rebound) throw new Error("Le compte administrateur initial a changé pendant l'activation. Réessayez.");
        user = rebound;
      } else {
        const { data: created, error: createError } = await db.from("User").insert({
          id: crypto.randomUUID(),
          authUserId: auth.id,
          email: verifiedEmail,
          phone,
          firstName,
          lastName,
          displayName: String(metadata.full_name || metadata.name || verifiedEmail),
          role: "ADMIN",
          updatedAt: now,
        }).select("*").single();
        if (createError) throw new Error(createError.message);
        user = created;
      }
    } else {
      const { data: updated, error: updateError } = await db.from("User").update({
        email: verifiedEmail,
        phone: phone || user.phone,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        displayName: String(metadata.full_name || metadata.name || user.displayName || verifiedEmail),
        role: "ADMIN",
        updatedAt: now,
      }).eq("id", user.id).select("*").single();
      if (updateError) throw new Error(updateError.message);
      user = updated;
    }
    const { data: ownerIdentity, error: ownerError } = await db.from("AdminIdentity")
      .select("id,authUserId")
      .eq("ownerUserId", user.id)
      .maybeSingle();
    if (ownerError) throw new Error(ownerError.message);
    if (ownerIdentity && ownerIdentity.authUserId !== auth.id) {
      return NextResponse.json({ message: "Cette identité Jobly est déjà rattachée à un autre accès administrateur." }, { status: 409 });
    }

    const { error: identityError } = await db.from("AdminIdentity").upsert({
      id: ownerIdentity?.id || crypto.randomUUID(),
      ownerUserId: user.id,
      authUserId: auth.id,
      active: true,
      updatedAt: now,
    }, { onConflict: "ownerUserId" });
    if (identityError) throw new Error(identityError.message);

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
