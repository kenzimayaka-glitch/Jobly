import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (String(user.role || "").toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Accès administrateur requis." }, { status: 403 });
    const { data, error } = await db.from("MobilityServiceProvider")
      .select("id,userId,providerType,legalName,displayName,registrationNumber,countryCode,city,contactEmail,contactPhone,kycStatus,kycEvidenceStoragePath,status,contractVersion,contractAcceptedAt,createdAt")
      .order("createdAt", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return NextResponse.json({ providers: data || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Registre prestataire indisponible." }, { status: 500 });
  }
}
