import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../../lib/mobilityServer";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (String(user.role || "").toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Accès administrateur requis." }, { status: 403 });
    const providerId = req.nextUrl.searchParams.get("providerId");
    if (!providerId) return NextResponse.json({ message: "providerId requis." }, { status: 400 });
    const { data: provider, error } = await db.from("MobilityServiceProvider")
      .select("userId,kycEvidenceStoragePath")
      .eq("id", providerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!provider || !provider.kycEvidenceStoragePath) return NextResponse.json({ message: "Document KYC introuvable." }, { status: 404 });
    const expectedPrefix = String(provider.userId) + "/";
    if (!String(provider.kycEvidenceStoragePath).startsWith(expectedPrefix)) return NextResponse.json({ message: "Chemin KYC invalide." }, { status: 422 });
    const { data, error: signedError } = await db.storage.from("mobility-provider-documents")
      .createSignedUrl(provider.kycEvidenceStoragePath, 300);
    if (signedError) throw new Error(signedError.message);
    return NextResponse.json({ signedUrl: data.signedUrl, expiresInSeconds: 300 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Document KYC indisponible." }, { status: 500 });
  }
}
