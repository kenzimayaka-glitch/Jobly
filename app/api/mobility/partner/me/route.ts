import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

const PROVIDER_TERMS_VERSION = "JOBLY-MOBILITY-PROVIDER-2026-11-05-v1";
const BUCKET = "mobility-provider-documents";

async function ownedKycFileExists(db: ReturnType<typeof adminClient>, userId: string, storagePath: string) {
  if (!storagePath.startsWith(userId + "/") || storagePath.includes("..")) return false;
  const filename = storagePath.slice(userId.length + 1);
  const { data, error } = await db.storage.from(BUCKET).list(userId, { search: filename, limit: 100 });
  if (error) throw new Error(error.message);
  return (data || []).some((file) => file.name === filename);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-profile-read",
      identity: user.id,
      accountWindows: [{ limit: 20, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      ipWindows: [{ limit: 40, windowSeconds: 60 }, { limit: 400, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data: provider, error } = await db.from("MobilityServiceProvider")
      .select("id,providerType,legalName,displayName,registrationNumber,countryCode,city,contactEmail,contactPhone,kycStatus,kycEvidenceStoragePath,status,contractVersion,contractAcceptedAt,createdAt,updatedAt")
      .eq("userId", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!provider) return NextResponse.json({ provider: null, termsVersion: PROVIDER_TERMS_VERSION }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
    const { data: services, error: serviceError } = await db.from("MobilityProviderService")
      .select("id,serviceType,title,description,city,priceAmount,currency,serviceCapacity,status,createdAt")
      .eq("providerId", provider.id)
      .order("createdAt", { ascending: false });
    if (serviceError) throw new Error(serviceError.message);
    return NextResponse.json({ provider, services: services || [], termsVersion: PROVIDER_TERMS_VERSION }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Profil prestataire indisponible." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 32 * 1024) return NextResponse.json({ message: "Dossier prestataire trop volumineux." }, { status: 413 });
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-profile-submit",
      identity: user.id,
      accountWindows: [{ limit: 3, windowSeconds: 3600 }, { limit: 5, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const body = await req.json().catch(() => ({}));
    const providerType = String(body.providerType || "").toUpperCase();
    const legalName = String(body.legalName || "").trim();
    const displayName = String(body.displayName || legalName).trim();
    const city = String(body.city || "").trim();
    const storagePath = String(body.kycEvidenceStoragePath || "").trim();
    if (!["FINANCE", "HOUSING", "TRANSPORT"].includes(providerType)) {
      return NextResponse.json({ message: "Type de prestataire invalide." }, { status: 400 });
    }
    if (!legalName || !displayName || !city || !storagePath) {
      return NextResponse.json({ message: "Raison sociale, nom affiché, ville et justificatif KYC privé sont obligatoires." }, { status: 400 });
    }
    if (body.acceptTerms !== true || body.termsVersion !== PROVIDER_TERMS_VERSION) {
      return NextResponse.json({ message: "L'acceptation explicite de la convention prestataire est obligatoire.", termsVersion: PROVIDER_TERMS_VERSION }, { status: 422 });
    }
    if (!await ownedKycFileExists(db, String(user.id), storagePath)) {
      return NextResponse.json({ message: "Le justificatif KYC doit avoir été déposé dans le coffre privé Mobility du même compte." }, { status: 422 });
    }

    const { data: existing, error: existingError } = await db.from("MobilityServiceProvider")
      .select("id,providerType")
      .eq("userId", user.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing && existing.providerType !== providerType) {
      return NextResponse.json({ message: "Un compte prestataire ne peut représenter qu'une seule catégorie de service. Contacte Jobly pour changer la catégorie après clôture des services existants." }, { status: 409 });
    }

    const contractAcceptedAt = new Date().toISOString();
    const values = {
      userId: user.id,
      providerType,
      legalName,
      displayName,
      registrationNumber: String(body.registrationNumber || "").trim() || null,
      countryCode: String(body.countryCode || "CM").trim().toUpperCase().slice(0, 2),
      city,
      contactEmail: String(body.contactEmail || user.email || "").trim() || null,
      contactPhone: String(body.contactPhone || user.phone || "").trim() || null,
      kycEvidenceStoragePath: storagePath,
      kycStatus: "PENDING",
      status: "PENDING_REVIEW",
      kycReviewedByUserId: null,
      kycReviewedAt: null,
      contractVersion: PROVIDER_TERMS_VERSION,
      contractAcceptedAt,
      contractAcceptedByUserId: user.id,
      updatedAt: contractAcceptedAt,
    };
    const result = existing
      ? await db.from("MobilityServiceProvider").update(values).eq("id", existing.id)
        .select("id,providerType,legalName,displayName,kycStatus,status,contractVersion,contractAcceptedAt").single()
      : await db.from("MobilityServiceProvider").insert(values)
        .select("id,providerType,legalName,displayName,kycStatus,status,contractVersion,contractAcceptedAt").single();
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({
      provider: result.data,
      message: "Dossier prestataire reçu. L'activation interviendra après vérification indépendante du KYC et de la convention.",
    }, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Inscription prestataire impossible." }, { status: 500 });
  }
}
