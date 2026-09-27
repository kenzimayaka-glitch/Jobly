import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CompanyProfile = {
  name: string;
  address: string | null;
  location: { lat: number; lng: number } | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  activity: string[];
  status: string | null;
  rating: number | null;
  reviewCount: number | null;
  description: string | null;
  summary: string | null;
  news: Array<{ title: string; link: string; publishedAt: string | null }>;
  source: string[];
  logoUrl: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const name = clean(params.get("name"));
  const location = clean(params.get("location"));
  if (!name) return NextResponse.json({ message: "Nom d'entreprise requis." }, { status: 400 });

  const result: CompanyProfile = {
    name, address: null, location: null, phone: null, website: null,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, location].filter(Boolean).join(", "))}`, activity: [], status: null, rating: null, reviewCount: null,
    description: null, summary: null, news: [], source: [], logoUrl: null,
  };

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.types,places.businessStatus,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({ textQuery: location ? `${name}, ${location}` : name, languageCode: "fr", regionCode: "CM", maxResultCount: 5 }),
        cache: "no-store",
      });
      if (response.ok) {
        const body = await response.json();
        const place = body?.places?.[0];
        if (place) {
          result.address = clean(place.formattedAddress) || null;
          result.location = place.location ? { lat: Number(place.location.latitude), lng: Number(place.location.longitude) } : null;
          result.phone = clean(place.nationalPhoneNumber) || null;
          result.website = clean(place.websiteUri) || result.website;
          result.mapsUrl = clean(place.googleMapsUri) || null;
          result.activity = Array.isArray(place.types) ? place.types.slice(0, 8).map((x: unknown) => String(x).replace(/_/g, " ")) : [];
          result.status = clean(place.businessStatus) || null;
          result.rating = typeof place.rating === "number" ? place.rating : null;
          result.reviewCount = typeof place.userRatingCount === "number" ? place.userRatingCount : null;
          result.source.push("Google Maps");
        }
      }
    } catch {}
  }

  if (!result.address && location) {
    try {
      const query = encodeURIComponent([name, location, "Cameroon"].filter(Boolean).join(", "));
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cm&q=${query}`, {
        headers: { "User-Agent": "JoblyCompanyProfile/1.0 (+https://jobly-c0651.vercel.app)" },
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      if (response.ok) {
        const rows = await response.json();
        const place = Array.isArray(rows) ? rows[0] : null;
        if (place) {
          result.address = clean(place.display_name) || null;
          result.location = Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)) ? { lat: Number(place.lat), lng: Number(place.lon) } : null;
          result.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.address || [name, location].join(", "))}`;
          result.source.push("OpenStreetMap");
        }
      }
    } catch {}
  }



  const summaryParts: string[] = [];
  if (result.description) summaryParts.push(result.description);
  if (result.website) summaryParts.push(`Site officiel : ${result.website}.`);
  if (result.activity.length) summaryParts.push(`Activité identifiée : ${result.activity.join(", ")}.`);
  if (result.address) summaryParts.push(`Localisation : ${result.address}.`);
  if (result.phone) summaryParts.push(`Contact : ${result.phone}.`);
  if (result.status) summaryParts.push(`Statut : ${result.status.replace(/_/g, " ").toLowerCase()}.`);
  if (result.rating != null) summaryParts.push(`Évaluation Google : ${result.rating}/5${result.reviewCount != null ? ` sur ${result.reviewCount} avis` : ""}.`);
  result.summary = summaryParts.length ? summaryParts.join(" ") : null;

  // Jobly ne présente pas des résultats de recherche comme s'ils constituaient le profil de l'entreprise.
  // Les informations affichées sont uniquement celles qui peuvent être rattachées directement à l'entreprise.
  result.news = [];


  return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=300" } });
}
