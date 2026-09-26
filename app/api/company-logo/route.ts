import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, { logoUrl: string | null; expiresAt: number }>();
const TTL = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const name = params.get("name")?.trim();
  const domain = params.get("domain")?.trim();

  if (!name && !domain) {
    return NextResponse.json({ logoUrl: null }, { status: 400 });
  }

  // Logo.dev secret keys stay server-side. Never expose them through the client bundle.
  const secretKey = process.env.LOGO_DEV_SECRET_KEY?.trim();
  if (!secretKey) {
    return NextResponse.json(
      { logoUrl: null, reason: "logo_api_not_configured" },
      { status: 503 },
    );
  }

  const key = (domain || name || "company").toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ logoUrl: cached.logoUrl });
  }

  try {
    const response = await fetch(
      `https://api.logo.dev/search?q=${encodeURIComponent(domain || name || "")}&strategy=match`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      cache.set(key, { logoUrl: null, expiresAt: Date.now() + 10 * 60 * 1000 });
      return NextResponse.json({ logoUrl: null }, { status: 502 });
    }

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    const resultDomain = typeof first?.domain === "string" ? first.domain : domain || null;
    const logoUrl =
      typeof first?.logo_url === "string"
        ? first.logo_url
        : resultDomain
          ? `https://img.logo.dev/${encodeURIComponent(resultDomain)}?size=128&format=png&fallback=404`
          : null;

    cache.set(key, { logoUrl, expiresAt: Date.now() + TTL });

    return NextResponse.json({
      logoUrl,
      domain: resultDomain,
      name: typeof first?.name === "string" ? first.name : name || null,
    });
  } catch {
    cache.set(key, { logoUrl: null, expiresAt: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json({ logoUrl: null }, { status: 502 });
  }
}
