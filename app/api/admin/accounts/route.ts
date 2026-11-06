import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_TYPES = new Set(["TALENT", "RECRUITER", "PARTNER"]);
const PARTNER_TYPES = new Set([
  "UNIVERSITY", "HIGHER_EDUCATION", "TRAINING_CENTER", "PUBLIC_INSTITUTION",
  "MINISTRY", "NGO", "ASSOCIATION", "EMPLOYER", "FINANCIAL_INSTITUTION",
  "MOBILITY_PROVIDER", "HOUSING_PROVIDER", "TRANSPORT_PROVIDER", "CAMPUS",
  "MEDIA", "EVENTS", "OTHER",
]);

async function requireRootAdmin(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") {
    return { response: NextResponse.json({ message: "Passez en mode ADMIN pour gérer les comptes." }, { status: 403 }) };
  }
  const { data: identity, error } = await db.from("AdminIdentity")
    .select("active").eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) {
    return { response: NextResponse.json({ message: "Identité administrateur maître inactive." }, { status: 403 }) };
  }
  return { db, auth, user };
}

function makeReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join("");
  return "JBLY-" + suffix;
}

function makePartnerExtendedType(type: string) {
  if (type === "FINANCIAL_INSTITUTION") return "FINANCE";
  if (type === "HOUSING_PROVIDER") return "HOUSING";
  if (type === "TRANSPORT_PROVIDER") return "TRANSPORT";
  return type;
}

function safeText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireRootAdmin(request);
    if ("response" in access) return access.response;
    const { db, user: admin } = access;

    const { data: managed, error } = await db.from("AdminManagedAccount")
      .select("id,userId,accountType,organizationType,organizationName,website,city,country,status,createdAt")
      .eq("ownerAdminUserId", admin.id)
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = managed || [];
    const userIds = rows.map((row: { userId: string }) => row.userId);
    if (!userIds.length) return NextResponse.json({ accounts: [], count: 0 });

    const { data: users, error: usersError } = await db.from("User")
      .select("id,authUserId,email,displayName,firstName,lastName,phone,role")
      .in("id", userIds);
    if (usersError) throw new Error(usersError.message);

    const userById = new Map<string, Record<string, unknown>>((users || []).map((entry: Record<string, unknown>): [string, Record<string, unknown>] => [String(entry.id), entry]));
    const accounts = await Promise.all(rows.map(async (row: Record<string, unknown>) => {
      const managedUser = userById.get(String(row.userId)) || null;
      let status = String(row.status || "INVITED");
      const authUserId = managedUser && typeof managedUser.authUserId === "string" ? managedUser.authUserId : "";
      if (authUserId) {
        const { data: authData } = await db.auth.admin.getUserById(authUserId);
        if (authData?.user?.email_confirmed_at) status = "ACTIVE";
      }
      if (status !== String(row.status)) {
        await db.from("AdminManagedAccount").update({ status, updatedAt: new Date().toISOString() }).eq("id", row.id);
      }
      return {
        ...row,
        status,
        user: managedUser ? {
          email: managedUser.email,
          displayName: managedUser.displayName,
          firstName: managedUser.firstName,
          lastName: managedUser.lastName,
          phone: managedUser.phone,
          role: managedUser.role,
        } : null,
      };
    }));
    return NextResponse.json({ accounts, count: accounts.length });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Comptes indisponibles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let invitedAuthUserId = "";
  let createdUserId = "";
  let db: ReturnType<typeof adminClient> | null = null;
  let createdManagedAccount = false;
  try {
    const access = await requireRootAdmin(request);
    if ("response" in access) return access.response;
    db = access.db;
    const admin = access.user;
    const body = await request.json().catch(() => ({}));

    const accountType = safeText(body.accountType, 24).toUpperCase();
    const email = safeText(body.email, 254).toLowerCase();
    const firstName = safeText(body.firstName, 80);
    const lastName = safeText(body.lastName, 80);
    const phone = safeText(body.phone, 40) || null;
    const country = safeText(body.country, 3).toUpperCase() || "CM";
    const organizationName = safeText(body.organizationName, 180) || null;
    const organizationType = safeText(body.organizationType, 48).toUpperCase() || null;
    const website = safeText(body.website, 240) || null;
    const city = safeText(body.city, 100) || null;

    if (!ACCOUNT_TYPES.has(accountType)) {
      return NextResponse.json({ message: "Type de compte non autorisé. Les comptes maîtres sont créés séparément." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Adresse e-mail invalide." }, { status: 400 });
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ message: "Le prénom et le nom du titulaire sont obligatoires." }, { status: 400 });
    }
    if (accountType === "RECRUITER" && !organizationName) {
      return NextResponse.json({ message: "Le nom de l'entreprise ou de l'employeur est obligatoire." }, { status: 400 });
    }
    if (accountType === "PARTNER" && (!organizationName || !organizationType || !PARTNER_TYPES.has(organizationType))) {
      return NextResponse.json({ message: "Renseignez l'organisation et sélectionnez une catégorie partenaire valide." }, { status: 400 });
    }

    const { data: duplicate, error: duplicateError } = await db.from("User")
      .select("id").ilike("email", email).maybeSingle();
    if (duplicateError) throw new Error(duplicateError.message);
    if (duplicate) {
      return NextResponse.json({
        message: "Un compte Jobly utilise déjà cette adresse. Aucun compte ni rôle existant n'a été modifié.",
        code: "ACCOUNT_ALREADY_EXISTS",
      }, { status: 409 });
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const invite = await db.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        account_role: accountType,
        organization_name: organizationName,
        organization_type: organizationType,
      },
    });
    if (invite.error) {
      const duplicateAuth = /already|registered|exists/i.test(invite.error.message);
      return NextResponse.json({
        message: duplicateAuth
          ? "Cette adresse possède déjà une identité Supabase. Vérifiez le compte existant avant de créer une nouvelle invitation."
          : "Invitation impossible : " + invite.error.message,
        code: duplicateAuth ? "AUTH_IDENTITY_EXISTS" : "INVITATION_FAILED",
      }, { status: duplicateAuth ? 409 : 502 });
    }
    if (!invite.data.user?.id) throw new Error("Supabase n'a pas retourné l'identité invitée.");
    invitedAuthUserId = invite.data.user.id;

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const displayName = organizationName || fullName;
    const { data: newUser, error: userError } = await db.from("User").insert({
      id: userId,
      authUserId: invitedAuthUserId,
      email,
      phone,
      displayName,
      firstName,
      lastName,
      country,
      role: accountType,
      updatedAt: now,
    }).select("id").single();
    if (userError) throw new Error(userError.message);
    createdUserId = newUser.id;

    const { error: profileError } = await db.from("Profile").insert({
      id: crypto.randomUUID(),
      userId,
      firstName,
      lastName,
      phone,
      country,
      headline: accountType === "PARTNER" ? organizationName : accountType === "RECRUITER" ? organizationName : null,
    });
    if (profileError) throw new Error(profileError.message);

    if (accountType === "RECRUITER") {
      const { error } = await db.from("RecruiterProfile").insert({
        id: crypto.randomUUID(),
        userId,
        companyName: organizationName,
        website,
        location: city,
        updatedAt: now,
      });
      if (error) throw new Error(error.message);
    }

    if (accountType === "PARTNER") {
      const { error: partnerError } = await db.from("Partner").insert({
        id: crypto.randomUUID(),
        userId,
        referralCode: makeReferralCode(),
        kycStatus: "PENDING",
      });
      if (partnerError) throw new Error(partnerError.message);

      const cityCode = (city || "AFRIQUE").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "AFRIQUE";
      const code = "PART-" + makePartnerExtendedType(organizationType || "OTHER") + "-" + cityCode + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
      const { error: extendedError } = await db.from("PartnerExtended").insert({
        id: crypto.randomUUID(),
        partnerUserId: userId,
        type: makePartnerExtendedType(organizationType || "OTHER"),
        code,
        lat: null,
        lng: null,
      });
      if (extendedError) throw new Error(extendedError.message);
    }

    const { error: managedError } = await db.from("AdminManagedAccount").insert({
      id: crypto.randomUUID(),
      ownerAdminUserId: admin.id,
      userId,
      accountType,
      organizationType: accountType === "PARTNER" ? organizationType : null,
      organizationName,
      website,
      city,
      country,
      status: "INVITED",
      updatedAt: now,
    });
    if (managedError) throw new Error(managedError.message);
    createdManagedAccount = true;

    await db.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "ADMIN_ACCOUNT_INVITED",
      entityType: "User",
      entityId: userId,
      metadata: { accountType, organizationType, organizationName, invitedEmail: email },
    });

    return NextResponse.json({
      ok: true,
      inviteSent: true,
      account: { id: userId, email, displayName, role: accountType, organizationType, organizationName, status: "INVITED" },
      message: "Invitation envoyée. Le titulaire définira son mot de passe depuis son propre lien sécurisé.",
    }, { status: 201 });
  } catch (error) {
    if (db && invitedAuthUserId) {
      if (createdManagedAccount && createdUserId) {
        await db.from("AdminManagedAccount").delete().eq("userId", createdUserId);
      }
      if (createdUserId) {
        await db.from("PartnerExtended").delete().eq("partnerUserId", createdUserId);
        await db.from("Partner").delete().eq("userId", createdUserId);
        await db.from("RecruiterProfile").delete().eq("userId", createdUserId);
        await db.from("Profile").delete().eq("userId", createdUserId);
        await db.from("User").delete().eq("id", createdUserId);
      }
      await db.auth.admin.deleteUser(invitedAuthUserId);
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Création de compte impossible." }, { status: 500 });
  }
}
