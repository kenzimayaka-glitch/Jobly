import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const memoryCache = new Map<string, { logoUrl: string | null; expiresAt: number }>();
const MEMORY_TTL = 24 * 60 * 60 * 1000;
const REGISTRY_TTL = 30 * 24 * 60 * 60 * 1000;
const SELF_HOST_ENABLED = process.env.LOGO_DEV_SELF_HOST_ENABLED === "true";
const BUCKET = "company-logos";

function normalizeDomain(value?: string | null) {
  if (!value) return null;
  try {
    const raw = value.trim();
    const url = raw.includes("://") ? raw : `https://${raw}`;
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname || hostname.length > 253 || !hostname.includes(".")) return null;
    return hostname;
  } catch {
    return null;
  }
}

function normalizeName(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 200) || null;
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hostLogoIfAllowed(sourceLogoUrl: string) {
  if (!SELF_HOST_ENABLED) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const response = await fetch(sourceLogoUrl, {
      headers: { "User-Agent": "Jobly/1.0 company-logo-cache" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
    if (!allowed.has(contentType)) return null;

    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 2 * 1024 * 1024) return null;

    const hash = await sha256(bytes);
    const extension =
      contentType === "image/png" ? "png" :
      contentType === "image/jpeg" ? "jpg" :
      contentType === "image/gif" ? "gif" : "webp";
    const path = `companies/${hash.slice(0, 2)}/${hash}.${extension}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data.publicUrl) return null;

    return { hostedLogoUrl: data.publicUrl, storagePath: path, contentType, contentHash: hash };
  } catch {
    return null;
  }
}

async function readRegistry(domain: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("company_logo_registry")
    .select("domain,company_name,source_logo_url,hosted_logo_url,storage_path,content_type,content_hash,status,fetched_at,last_checked_at")
    .eq("domain", domain)
    .maybeSingle();

  return error || !data ? null : data;
}

async function saveRegistry(input: {
  domain: string;
  companyName: string | null;
  sourceLogoUrl: string | null;
  hostedLogoUrl?: string | null;
  storagePath?: string | null;
  contentType?: string | null;
  contentHash?: string | null;
  status: "resolved" | "hosted" | "missing" | "error";
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("company_logo_registry").upsert({
    domain: input.domain,
    company_name: input.companyName,
    source_logo_url: input.sourceLogoUrl,
    hosted_logo_url: input.hostedLogoUrl ?? null,
    storage_path: input.storagePath ?? null,
    content_type: input.contentType ?? null,
    content_hash: input.contentHash ?? null,
    status: input.status,
    fetched_at: input.hostedLogoUrl ? new Date().toISOString() : null,
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "domain" });
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const name = normalizeName(params.get("name"));
  const requestedDomain = normalizeDomain(params.get("domain"));

  if (!name && !requestedDomain) {
    return NextResponse.json({ logoUrl: null }, { status: 400 });
  }

  const memoryKey = requestedDomain || `name:${name}`;
  const memory = memoryCache.get(memoryKey);
  if (memory && memory.expiresAt > Date.now()) {
    return NextResponse.json({ logoUrl: memory.logoUrl, cached: true });
  }

  const secretKey = process.env.LOGO_DEV_SECRET_KEY?.trim();
  if (!secretKey) {
    return NextResponse.json({ logoUrl: null, reason: "logo_api_not_configured" }, { status: 503 });
  }

  if (requestedDomain) {
    const registry = await readRegistry(requestedDomain);
    if (registry?.hosted_logo_url) {
      memoryCache.set(memoryKey, { logoUrl: registry.hosted_logo_url, expiresAt: Date.now() + MEMORY_TTL });
      return NextResponse.json({ logoUrl: registry.hosted_logo_url, domain: registry.domain, name: registry.company_name, cached: true, hosted: true });
    }

    if (registry?.source_logo_url && registry.fetched_at &&
        Date.now() - new Date(registry.fetched_at).getTime() < REGISTRY_TTL) {
      memoryCache.set(memoryKey, { logoUrl: registry.source_logo_url, expiresAt: Date.now() + MEMORY_TTL });
      return NextResponse.json({ logoUrl: registry.source_logo_url, domain: registry.domain, name: registry.company_name, cached: true, hosted: false });
    }
  }

  try {
    let resolvedDomain = requestedDomain;
    let companyName = name;
    let logoUrl: string | null = null;

    if (requestedDomain) {
      const brandResponse = await fetch(
        `https://api.logo.dev/brand/${encodeURIComponent(requestedDomain)}`,
        { headers: { Authorization: `Bearer ${secretKey}` }, next: { revalidate: 86400 } },
      );

      if (brandResponse.ok) {
        const brand = await brandResponse.json();
        if (typeof brand?.domain === "string") resolvedDomain = normalizeDomain(brand.domain) || requestedDomain;
        if (typeof brand?.name === "string") companyName = normalizeName(brand.name) || name;
        if (typeof brand?.logo === "string") logoUrl = brand.logo;
      }

      if (!logoUrl && resolvedDomain) {
        logoUrl = `https://img.logo.dev/${encodeURIComponent(resolvedDomain)}?size=256&format=webp&fallback=404`;
      }
    } else {
      const response = await fetch(
        `https://api.logo.dev/search?q=${encodeURIComponent(name || "")}&strategy=match`,
        { headers: { Authorization: `Bearer ${secretKey}` }, next: { revalidate: 86400 } },
      );

      if (response.ok) {
        const results = await response.json();
        const first = Array.isArray(results) ? results[0] : null;
        resolvedDomain = normalizeDomain(first?.domain);
        companyName = normalizeName(first?.name) || name;
        logoUrl = typeof first?.logo_url === "string" ? first.logo_url : null;
      }
    }

    if (!resolvedDomain || !logoUrl) {
      if (resolvedDomain) await saveRegistry({ domain: resolvedDomain, companyName, sourceLogoUrl: null, status: "missing" });
      memoryCache.set(memoryKey, { logoUrl: null, expiresAt: Date.now() + 10 * 60 * 1000 });
      return NextResponse.json({ logoUrl: null }, { status: 404 });
    }

    const hosted = await hostLogoIfAllowed(logoUrl);
    const finalLogoUrl = hosted?.hostedLogoUrl || logoUrl;

    await saveRegistry({
      domain: resolvedDomain,
      companyName,
      sourceLogoUrl: logoUrl,
      hostedLogoUrl: hosted?.hostedLogoUrl || null,
      storagePath: hosted?.storagePath || null,
      contentType: hosted?.contentType || null,
      contentHash: hosted?.contentHash || null,
      status: hosted ? "hosted" : "resolved",
    });

    memoryCache.set(memoryKey, { logoUrl: finalLogoUrl, expiresAt: Date.now() + MEMORY_TTL });

    return NextResponse.json({
      logoUrl: finalLogoUrl,
      domain: resolvedDomain,
      name: companyName,
      cached: false,
      hosted: Boolean(hosted),
    });
  } catch {
    memoryCache.set(memoryKey, { logoUrl: null, expiresAt: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json({ logoUrl: null }, { status: 502 });
  }
}
