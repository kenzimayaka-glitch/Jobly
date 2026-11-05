import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds } from "../../../../../lib/mobilityAccess";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!institutionIds.length) return NextResponse.json({ message: "Membre INSTITUTION_ADMIN actif requis." }, { status: 403 });

    const { data: providers, error: providerError } = await db.from("MobilityServiceProvider")
      .select("id,providerType,displayName,city,kycStatus,status")
      .eq("status", "ACTIVE")
      .eq("kycStatus", "VERIFIED")
      .order("displayName", { ascending: true });
    if (providerError) throw new Error(providerError.message);
    const ids = (providers || []).map((provider: { id: string }) => provider.id);
    if (!ids.length) return NextResponse.json({ providers: [], services: [] });
    const { data: services, error: serviceError } = await db.from("MobilityProviderService")
      .select("id,providerId,serviceType,title,description,city,priceAmount,currency,serviceCapacity,status")
      .in("providerId", ids)
      .eq("status", "ACTIVE")
      .order("createdAt", { ascending: false });
    if (serviceError) throw new Error(serviceError.message);
    return NextResponse.json({ providers: providers || [], services: services || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Prestataires Mobility indisponibles." }, { status: 500 });
  }
}
