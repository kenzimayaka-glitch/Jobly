import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const admin = await ensureUser(db, auth);
    if (String(admin.role).toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Espace ADMIN requis." }, { status: 403 });
    const { data: identity, error: identityError } = await db.from("AdminIdentity").select("active")
      .eq("authUserId", auth.id).eq("ownerUserId", admin.id).maybeSingle();
    if (identityError) throw new Error(identityError.message);
    if (!identity?.active) return NextResponse.json({ message: "Identité ADMIN maître inactive." }, { status: 403 });

    const { id } = await context.params;
    const { data: managed, error } = await db.from("AdminManagedAccount")
      .select("id,userId,accountType,organizationType,organizationName,website,city,country,status,createdAt")
      .eq("id", id).eq("ownerAdminUserId", admin.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!managed) return NextResponse.json({ message: "Ce compte ne fait pas partie de votre portefeuille administré." }, { status: 404 });

    const { data: user, error: userError } = await db.from("User")
      .select("id,email,displayName,firstName,lastName,phone,country,role,createdAt")
      .eq("id", managed.userId).maybeSingle();
    if (userError) throw new Error(userError.message);
    if (!user) return NextResponse.json({ message: "Identité Jobly introuvable." }, { status: 404 });

    let profile: Record<string, unknown> | null = null;
    if (managed.accountType === "RECRUITER") {
      const { data, error: profileError } = await db.from("RecruiterProfile")
        .select("companyName,sector,website,location").eq("userId", managed.userId).maybeSingle();
      if (profileError) throw new Error(profileError.message);
      profile = data;
    } else if (managed.accountType === "PARTNER") {
      const [{data:partner,error:partnerError},{data:extended,error:extendedError}] = await Promise.all([
        db.from("Partner").select("referralCode,kycStatus,payoutProvider,payoutPhone").eq("userId",managed.userId).maybeSingle(),
        db.from("PartnerExtended").select("type,code").eq("partnerUserId",managed.userId),
      ]);
      if (partnerError) throw new Error(partnerError.message);
      if (extendedError) throw new Error(extendedError.message);
      profile = { ...(partner || {}), partnerSpaces: extended || [] };
    } else {
      const { data, error: profileError } = await db.from("Profile")
        .select("headline,summary,location,targetRoles").eq("userId", managed.userId).maybeSingle();
      if (profileError) throw new Error(profileError.message);
      profile = data;
    }

    const status = managed.status;
    return NextResponse.json({
      account: { ...managed, user, profile, status },
      context: { principal: "ADMIN_MASTER", selectedAccountId: managed.id, writeAsPartner: false },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Contexte de compte indisponible." }, { status: 500 });
  }
}
