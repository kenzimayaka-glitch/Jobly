import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../../lib/mobilityServer";

const BUCKET = "mobility-provider-documents";

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (String(user.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({ message: "Validation KYC réservée à un administrateur Jobly." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const providerId = String(body.providerId || "").trim();
    const decision = String(body.decision || "").toUpperCase();
    const reason = String(body.reason || "").trim();
    if (!providerId || !["VERIFY", "REJECT", "SUSPEND"].includes(decision)) {
      return NextResponse.json({ message: "Prestataire ou décision invalide." }, { status: 400 });
    }
    if (decision === "REJECT" && !reason) return NextResponse.json({ message: "Un motif est requis pour rejeter un dossier." }, { status: 400 });

    const { data: provider, error: lookupError } = await db.from("MobilityServiceProvider")
      .select("id,userId,kycEvidenceStoragePath,contractAcceptedAt,contractVersion")
      .eq("id", providerId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!provider) return NextResponse.json({ message: "Prestataire introuvable." }, { status: 404 });
    if (decision === "VERIFY") {
      const storagePath = String(provider.kycEvidenceStoragePath || "");
      if (!storagePath.startsWith(String(provider.userId) + "/") || storagePath.includes("..")
        || !provider.contractAcceptedAt || !provider.contractVersion) {
        return NextResponse.json({ message: "Document KYC privé et acceptation contractuelle obligatoires." }, { status: 422 });
      }
      const filename = storagePath.slice(String(provider.userId).length + 1);
      const { data: files, error: storageError } = await db.storage.from(BUCKET).list(String(provider.userId), { search: filename, limit: 100 });
      if (storageError) throw new Error(storageError.message);
      if (!(files || []).some((file) => file.name === filename)) {
        return NextResponse.json({ message: "Le document KYC privé est introuvable." }, { status: 422 });
      }
    }

    const status = decision === "VERIFY" ? "ACTIVE" : decision === "REJECT" ? "REJECTED" : "SUSPENDED";
    const kycStatus = decision === "VERIFY" ? "VERIFIED" : decision === "REJECT" ? "REJECTED" : "IN_REVIEW";
    const { data, error } = await db.from("MobilityServiceProvider").update({
      status,
      kycStatus,
      kycReviewedByUserId: user.id,
      kycReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq("id", providerId).select("id,status,kycStatus,kycReviewedByUserId,kycReviewedAt").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ provider: data, reason: reason || null });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Vérification prestataire impossible." }, { status: 500 });
  }
}
