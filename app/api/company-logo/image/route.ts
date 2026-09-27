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

function fallbackLogo(domain: string) {
  const initials = domain
    .split(".")[0]
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase() || "CO";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#22448B"/>
    <text x="64" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#FFFFFF">${initials}</text>
  </svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

export async function GET(request: NextRequest) {
  const rawDomain = new URL(request.url).searchParams.get("domain");
  const domain = rawDomain ? normalizeDomain(rawDomain) : null;
  if (!domain) return new Response("Invalid domain", { status: 400 });

  const providers = [
    `https://${domain}/favicon.ico`,
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

  // Never leave a broken image request: return a deterministic company placeholder.
  return fallbackLogo(domain);
}
