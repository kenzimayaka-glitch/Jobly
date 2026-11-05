import { NextRequest } from "next/server";

function normalizeDomain(value: string) {
  try {
    const raw = value.trim();
    const url = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rawDomain = new URL(request.url).searchParams.get("domain");
  const domain = rawDomain ? normalizeDomain(rawDomain) : null;
  if (!domain) return new Response("Invalid domain", { status: 400 });

  const providers = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
  ];

  for (const url of providers) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Jobly/1.0 company-logo-proxy" },
        next: { revalidate: 86400 },
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "image/png";
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength) continue;
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      // Try the next trusted provider.
    }
  }

  return new Response("Logo unavailable", { status: 404 });
}
