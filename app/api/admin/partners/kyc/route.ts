import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export const dynamic = "force-dynamic";

const BUCKET = "partner-private-documents";
const SIGNED_URL_TTL_SECONDS = 300;

async function requireAdmin(request: NextRequest, scope: string) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const supabase = adminClient();
  const user = await ensureUser(supabase, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") {
    return { error: NextResponse.json({ message: "Accès réservé à l’administrateur." }, { status: 403 }) };
  }
  const rateLimited = await enforceApiRateLimit(request, supabase, {
    scope,
    identity: user.id,
    accountWindows: [{ limit: 30, windowSeconds: 60 }],
    ipWindows: [{ limit: 60, windowSeconds: 60 }],
    requireIp: true,
  });
  if (rateLimited) return { error: rateLimited };
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireAdmin(request, "admin-partner-kyc-list");
    if ("error" in context) return context.error;
    const { supabase } = context;

    const { data: kycRows, error: kycError } = await supabase
      .from("PartnerKyc")
      .select("id,partnerId,locationText,locationLat,locationLng,locationConsent,consentProgramme,consentPrivacy,consentSecurity,consentAntiFraud,termsVersion,acceptedAt,status,createdAt,updatedAt,idFrontPath,idBackPath")
      .eq("status", "SUBMITTED")
      .order("createdAt", { ascending: true })
      .limit(100);
    if (kycError) throw new Error(kycError.message);
    if (!kycRows?.length) return NextResponse.json({ count: 0, submissions: [] });

    const partnerIds = [...new Set(kycRows.map((item: any) => String(item.partnerId)))];
    const { data: partners, error: partnerError } = await supabase
      .from("Partner")
      .select("id,userId,referralCode,partnerType,kycStatus")
      .in("id", partnerIds);
    if (partnerError) throw new Error(partnerError.message);

    const partnerById = new Map((partners || []).map((item: any) => [String(item.id), item]));
    const userIds = [...new Set((partners || []).map((item: any) => String(item.userId)))];
    const { data: users, error: userError } = userIds.length
      ? await supabase.from("User").select("id,displayName,firstName,lastName,email,phone").in("id", userIds)
      : { data: [], error: null };
    if (userError) throw new Error(userError.message);
    const userById = new Map((users || []).map((item: any) => [String(item.id), item]));

    const submissions = await Promise.all((kycRows || []).map(async (kyc: any) => {
      const partner = partnerById.get(String(kyc.partnerId));
      const user = partner ? userById.get(String((partner as any).userId)) : null;
      const [front, back] = await Promise.all([
        kyc.idFrontPath
          ? supabase.storage.from(BUCKET).createSignedUrl(kyc.idFrontPath, SIGNED_URL_TTL_SECONDS)
          : Promise.resolve({ data: null, error: null }),
        kyc.idBackPath
          ? supabase.storage.from(BUCKET).createSignedUrl(kyc.idBackPath, SIGNED_URL_TTL_SECONDS)
          : Promise.resolve({ data: null, error: null }),
      ]);
      return {
        ...kyc,
        partner: partner || null,
        applicant: user || null,
        documents: {
          frontUrl: front.error ? null : front.data?.signedUrl || null,
          backUrl: back.error ? null : back.data?.signedUrl || null,
          expiresInSeconds: SIGNED_URL_TTL_SECONDS,
        },
      };
    }));

    return NextResponse.json(
      { count: submissions.length, submissions },
      { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } }
    );
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de charger les dossiers KYC.",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireAdmin(request, "admin-partner-kyc-review");
    if ("error" in context) return context.error;
    const { supabase, user } = context;

    const body = await request.json().catch(() => ({}));
    const partnerId = typeof body.partnerId === "string" ? body.partnerId.trim() : "";
    const decision = typeof body.decision === "string" ? body.decision.trim().toUpperCase() : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (!partnerId || !["VERIFIED", "REJECTED"].includes(decision)) {
      return NextResponse.json({ message: "Dossier et décision de validation requis." }, { status: 400 });
    }
    if (decision === "REJECTED" && note.length < 8) {
      return NextResponse.json({ message: "Un motif de rejet d’au moins 8 caractères est obligatoire." }, { status: 422 });
    }

    const { data: kyc, error: lookupError } = await supabase
      .from("PartnerKyc")
      .select("id,partnerId,status")
      .eq("partnerId", partnerId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!kyc) return NextResponse.json({ message: "Dossier KYC introuvable." }, { status: 404 });
    if (kyc.status !== "SUBMITTED") {
      return NextResponse.json({ message: "Ce dossier a déjà été traité ou n’est pas soumis.", currentStatus: kyc.status }, { status: 409 });
    }

    const { data: previousPartner, error: previousPartnerError } = await supabase
      .from("Partner")
      .select("id,kycStatus,kycCompletedAt,partnerType")
      .eq("id", partnerId)
      .maybeSingle();
    if (previousPartnerError) throw new Error(previousPartnerError.message);
    if (!previousPartner) return NextResponse.json({ message: "Profil partenaire introuvable." }, { status: 404 });
    if (previousPartner.partnerType && previousPartner.partnerType !== "BRAND_AMBASSADOR") {
      return NextResponse.json({ message: "Ce dossier ne correspond pas à un Brand Ambassador." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: changedKyc, error: kycUpdateError } = await supabase
      .from("PartnerKyc")
      .update({ status: decision, updatedAt: now })
      .eq("id", kyc.id)
      .eq("status", "SUBMITTED")
      .select("id")
      .maybeSingle();
    if (kycUpdateError) throw new Error(kycUpdateError.message);
    if (!changedKyc) return NextResponse.json({ message: "Le dossier a été traité entre-temps. Rechargez la liste." }, { status: 409 });

    const { data: changedPartner, error: partnerUpdateError } = await supabase
      .from("Partner")
      .update({
        kycStatus: decision,
        kycCompletedAt: decision === "VERIFIED" ? now : null,
      })
      .eq("id", partnerId)
      .select("id")
      .maybeSingle();

    if (partnerUpdateError || !changedPartner) {
      await supabase.from("PartnerKyc").update({ status: "SUBMITTED", updatedAt: now }).eq("id", kyc.id);
      throw new Error(partnerUpdateError?.message || "Le profil partenaire n’a pas pu être mis à jour.");
    }

    const { error: auditError } = await supabase.from("CEOAuditLog").insert({
      adminUserId: user.id,
      action: decision === "VERIFIED" ? "PARTNER_KYC_APPROVED" : "PARTNER_KYC_REJECTED",
      endpoint: "/api/admin/partners/kyc",
      metadata: { partnerId, kycId: String(kyc.id), decision, note: note || null, reviewedAt: now },
    });
    if (auditError) {
      await supabase.from("Partner").update({
        kycStatus: previousPartner.kycStatus,
        kycCompletedAt: previousPartner.kycCompletedAt,
      }).eq("id", partnerId);
      await supabase.from("PartnerKyc").update({ status: "SUBMITTED", updatedAt: now }).eq("id", kyc.id);
      throw new Error(auditError.message);
    }

    return NextResponse.json({ ok: true, partnerId, status: decision, reviewedAt: now });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "La revue KYC a échoué.",
    }, { status: 500 });
  }
}
