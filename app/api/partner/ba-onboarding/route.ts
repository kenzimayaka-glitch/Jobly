import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

const TERMS_VERSION = "BA-2026.09";
const BUCKET = "partner-private-documents";

function extension(name: string) {
  const value = name.toLowerCase().split(".").pop() || "bin";
  return value.replace(/[^a-z0-9]/g, "") || "bin";
}

function buildAgreement(input: { name: string; username: string | null; email: string | null; phone: string | null; signerName: string; signerRole: string; acceptedAt: string }) {
  return `ACCORD DE COLLABORATION — BRAND AMBASSADOR\n\nJOBLY\n\nBrand Ambassador\nNom : ${input.name}\nUsername : ${input.username || "—"}\nEmail : ${input.email || "—"}\nTéléphone : ${input.phone || "—"}\n\nOBJET\nLe présent accord définit les conditions de collaboration du Brand Ambassador avec JOBLY pour la promotion de la plateforme, l'acquisition d'utilisateurs, la prospection commerciale et l'exécution des missions proposées dans son espace Partner.\n\nENGAGEMENTS\n• respecter les conditions du programme Brand Ambassador et les règles de rémunération ;\n• préserver la confidentialité des informations et données auxquelles il accède ;\n• protéger ses identifiants et respecter les règles de sécurité ;\n• ne pas créer de faux comptes, s'auto-parrainer, manipuler les conversions ou pratiquer le spam ;\n• utiliser les données de prospects et d'utilisateurs uniquement dans le cadre autorisé ;\n• accepter que les commissions et bonus soient déclenchés uniquement selon les événements validés par JOBLY.\n\nLes conditions détaillées du programme, la politique de confidentialité et les règles de sécurité complètent le présent accord. Une rémunération peut être suspendue pendant une vérification de conformité ou de fraude.\n\nPOUR JOBLY\n${input.signerName}\n${input.signerRole}\nSignature administrateur enregistrée\n\nPOUR LE BRAND AMBASSADOR\n${input.name}\nAcceptation électronique enregistrée le ${new Date(input.acceptedAt).toLocaleString("fr-FR")}\n\nVersion : ${TERMS_VERSION}`;
}

async function ensurePrivateBucket(supabase: ReturnType<typeof adminClient>) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"] });
    if (error && !error.message.toLowerCase().includes("already exists")) throw new Error(error.message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const { data: partner } = await supabase.from("Partner").select("*").eq("userId", user.id).maybeSingle();
    if (!partner) return NextResponse.json({ message: "Profil Partner introuvable." }, { status: 404 });
    const [{ data: kyc }, { data: agreement }] = await Promise.all([
      supabase.from("PartnerKyc").select("id,locationText,locationLat,locationLng,locationConsent,consentProgramme,consentPrivacy,consentSecurity,consentAntiFraud,termsVersion,acceptedAt,status,createdAt,updatedAt").eq("partnerId", partner.id).maybeSingle(),
      supabase.from("PartnerAgreement").select("id,version,agreementType,partnerName,partnerUsername,adminSignerName,adminSignerRole,documentContent,acceptedAt,status,createdAt").eq("partnerId", partner.id).order("createdAt", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return NextResponse.json({ partner, kyc, agreement, termsVersion: TERMS_VERSION });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Onboarding indisponible." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const form = await request.formData();
    const locationText = String(form.get("locationText") || "").trim();
    const locationLat = Number(form.get("locationLat"));
    const locationLng = Number(form.get("locationLng"));
    const locationConsent = form.get("locationConsent") === "true";
    const consentProgramme = form.get("consentProgramme") === "true";
    const consentPrivacy = form.get("consentPrivacy") === "true";
    const consentSecurity = form.get("consentSecurity") === "true";
    const consentAntiFraud = form.get("consentAntiFraud") === "true";
    const identityFront = form.get("identityFront");
    const identityBack = form.get("identityBack");
    if (!(identityFront instanceof File) || !(identityBack instanceof File)) return NextResponse.json({ message: "Les deux faces du document d'identité sont requises." }, { status: 400 });
    if (!locationConsent || !consentProgramme || !consentPrivacy || !consentSecurity || !consentAntiFraud) return NextResponse.json({ message: "Tous les consentements obligatoires doivent être acceptés." }, { status: 400 });
    if (!locationText || !Number.isFinite(locationLat) || !Number.isFinite(locationLng)) return NextResponse.json({ message: "La localisation est requise pour le programme BA." }, { status: 400 });
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (identityFront.size > 10 * 1024 * 1024 || identityBack.size > 10 * 1024 * 1024 || !allowed.includes(identityFront.type) || !allowed.includes(identityBack.type)) return NextResponse.json({ message: "Document d'identité non accepté : JPEG, PNG ou PDF, 10 Mo maximum par fichier." }, { status: 400 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const { data: partner, error: partnerError } = await supabase.from("Partner").select("*").eq("userId", user.id).maybeSingle();
    if (partnerError) throw new Error(partnerError.message);
    if (!partner) return NextResponse.json({ message: "Profil Partner introuvable." }, { status: 404 });
    if (partner.partnerType && partner.partnerType !== "BRAND_AMBASSADOR") return NextResponse.json({ message: "Ce parcours est réservé aux Brand Ambassadors." }, { status: 400 });

    await ensurePrivateBucket(supabase);
    const stamp = Date.now();
    const frontPath = `${user.id}/identity-front-${stamp}.${extension(identityFront.name)}`;
    const backPath = `${user.id}/identity-back-${stamp}.${extension(identityBack.name)}`;
    const frontUpload = await supabase.storage.from(BUCKET).upload(frontPath, identityFront, { contentType: identityFront.type, upsert: false });
    if (frontUpload.error) throw new Error(frontUpload.error.message);
    const backUpload = await supabase.storage.from(BUCKET).upload(backPath, identityBack, { contentType: identityBack.type, upsert: false });
    if (backUpload.error) throw new Error(backUpload.error.message);

    const now = new Date().toISOString();
    const { error: kycError } = await supabase.from("PartnerKyc").upsert({ partnerId: partner.id, locationText, locationLat, locationLng, locationConsent, idFrontPath: frontPath, idBackPath: backPath, consentProgramme, consentPrivacy, consentSecurity, consentAntiFraud, termsVersion: TERMS_VERSION, acceptedAt: now, status: "SUBMITTED", updatedAt: now }, { onConflict: "partnerId" });
    if (kycError) throw new Error(kycError.message);

    const signerName = process.env.JOBLY_BA_ADMIN_SIGNER_NAME || "Administrateur JOBLY";
    const signerRole = process.env.JOBLY_BA_ADMIN_SIGNER_ROLE || "Administration JOBLY";
    const partnerName = user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Brand Ambassador";
    const documentContent = buildAgreement({ name: partnerName, username: user.username, email: user.email, phone: user.phone, signerName, signerRole, acceptedAt: now });
    const { data: agreement, error: agreementError } = await supabase.from("PartnerAgreement").insert({ partnerId: partner.id, version: TERMS_VERSION, agreementType: "BRAND_AMBASSADOR_FREELANCE", partnerName, partnerUsername: user.username, partnerEmail: user.email, partnerPhone: user.phone, adminSignerName: signerName, adminSignerRole: signerRole, documentContent, acceptedAt: now, status: "ACCEPTED" }).select("id,version,agreementType,partnerName,partnerUsername,adminSignerName,adminSignerRole,documentContent,acceptedAt,status,createdAt").single();
    if (agreementError) throw new Error(agreementError.message);

    const { data: updatedPartner, error: updateError } = await supabase.from("Partner").update({ kycStatus: "VERIFIED", kycCompletedAt: now, agreementId: agreement.id, locationText, locationLat, locationLng, locationConsent: true, locationUpdatedAt: now }).eq("id", partner.id).select("*").single();
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ partner: updatedPartner, kyc: { status: "SUBMITTED", termsVersion: TERMS_VERSION }, agreement }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de finaliser le parcours BA." }, { status: 500 });
  }
}
