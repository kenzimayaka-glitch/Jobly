import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

const serviceForProvider: Record<string, string> = {
  FINANCE: "FINANCING",
  HOUSING: "HOUSING",
  TRANSPORT: "TRANSPORT",
};

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-services-read",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 400, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data: provider, error: providerError } = await db.from("MobilityServiceProvider")
      .select("id,providerType,status,kycStatus")
      .eq("userId", user.id)
      .maybeSingle();
    if (providerError) throw new Error(providerError.message);
    if (!provider || provider.status !== "ACTIVE" || provider.kycStatus !== "VERIFIED") {
      return NextResponse.json({ message: "Prestataire Mobility vérifié et actif requis." }, { status: 403 });
    }
    const { data, error } = await db.from("MobilityProviderService")
      .select("id,serviceType,title,description,city,priceAmount,currency,serviceCapacity,status,createdAt,updatedAt")
      .eq("providerId", provider.id)
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ services: data || [] }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Catalogue indisponible." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 24 * 1024) return NextResponse.json({ message: "Données du service trop volumineuses." }, { status: 413 });
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-service-create",
      identity: user.id,
      accountWindows: [{ limit: 10, windowSeconds: 3600 }],
      ipWindows: [{ limit: 20, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data: provider, error: providerError } = await db.from("MobilityServiceProvider")
      .select("id,providerType,status,kycStatus")
      .eq("userId", user.id)
      .maybeSingle();
    if (providerError) throw new Error(providerError.message);
    if (!provider || provider.status !== "ACTIVE" || provider.kycStatus !== "VERIFIED") {
      return NextResponse.json({ message: "Prestataire Mobility vérifié et actif requis avant publication d'un service." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const city = String(body.city || "").trim();
    const description = String(body.description || "").trim();
    const priceAmount = body.priceAmount === null || body.priceAmount === "" || body.priceAmount === undefined
      ? null : Number(body.priceAmount);
    const serviceCapacity = body.serviceCapacity === null || body.serviceCapacity === "" || body.serviceCapacity === undefined
      ? null : Number(body.serviceCapacity);
    const currency = String(body.currency || "XAF").toUpperCase();
    if (!title || !city) return NextResponse.json({ message: "Titre et ville requis." }, { status: 400 });
    if (priceAmount !== null && (!Number.isFinite(priceAmount) || priceAmount < 0)) {
      return NextResponse.json({ message: "Prix invalide." }, { status: 400 });
    }
    if (serviceCapacity !== null && (!Number.isInteger(serviceCapacity) || serviceCapacity < 0)) {
      return NextResponse.json({ message: "Capacité invalide." }, { status: 400 });
    }
    if (currency !== "XAF") return NextResponse.json({ message: "Les tarifs Mobility sont actuellement libellés en XAF." }, { status: 400 });
    const serviceType = serviceForProvider[String(provider.providerType)];
    const { data, error } = await db.from("MobilityProviderService").insert({
      providerId: provider.id,
      serviceType,
      title,
      description: description || null,
      city,
      priceAmount,
      currency,
      serviceCapacity,
      status: "ACTIVE",
      termsVersion: "JOBLY-MOBILITY-SERVICE-2026-11-05-v1",
    }).select("id,serviceType,title,description,city,priceAmount,currency,serviceCapacity,status,createdAt").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ service: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Publication du service impossible." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Identifiant de service requis." }, { status: 400 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-service-archive",
      identity: user.id,
      accountWindows: [{ limit: 10, windowSeconds: 3600 }],
      ipWindows: [{ limit: 20, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data: provider, error: providerError } = await db.from("MobilityServiceProvider")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();
    if (providerError) throw new Error(providerError.message);
    if (!provider) return NextResponse.json({ message: "Prestataire introuvable." }, { status: 403 });
    const { data, error } = await db.from("MobilityProviderService")
      .update({ status: "ARCHIVED", updatedAt: new Date().toISOString() })
      .eq("id", id)
      .eq("providerId", provider.id)
      .select("id,status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Service introuvable." }, { status: 404 });
    return NextResponse.json({ service: data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Archivage impossible." }, { status: 500 });
  }
}
