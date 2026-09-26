import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, { logoUrl: string | null; expiresAt: number }>();
const TTL = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const name = params.get("name")?.trim();
  const domain = params.get("domain")?.trim();
  if (!name && !domain) return NextResponse.json({ logoUrl: null }, { status: 400 });
  const token = process.env.LOGO_DEV_API_KEY?.trim() || process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN?.trim();
  if (!token) {
    if (domain) return NextResponse.json({ logoUrl: `/api/company-logo/image?domain=${encodeURIComponent(domain)}`, domain });
    return NextResponse.json({ logoUrl: null, reason: "logo_api_not_configured" }, { status: 503 });
  }

  const key = (name || domain || "company").toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ logoUrl: cached.logoUrl });
  }

  const token = process.env.LOGO_DEV_API_KEY?.trim() || process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN?.trim();
  if (!token) return NextResponse.json({ logoUrl: null, reason: "logo_api_not_configured" }, { status: 503 });

  try {
    const response = await fetch(
      `https://api.logo.dev/search?q=${encodeURIComponent(name || domain || "")}&strategy=match`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      cache.set(key, { logoUrl: null, expiresAt: Date.now() + 10 * 60 * 1000 });
      return NextResponse.json({ logoUrl: null }, { status: 502 });
    }

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    const logoUrl = typeof first?.logo_url === "string"
      ? first.logo_url
      : typeof first?.domain === "string"
        ? `https://img.logo.dev/${encodeURIComponent(first.domain)}?token=${encodeURIComponent(token)}&size=128&format=png&fallback=404`
        : null;

    cache.set(key, { logoUrl, expiresAt: Date.now() + TTL });
    return NextResponse.json({ logoUrl, domain: first?.domain || null, name: first?.name || null });
  } catch {
    cache.set(key, { logoUrl: null, expiresAt: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json({ logoUrl: null }, { status: 502 });
  }
}
