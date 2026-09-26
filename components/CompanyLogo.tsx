"use client";

import { useEffect, useMemo, useState } from "react";

type CompanyLogoProps = {
  companyName?: string | null;
  logoUrl?: string | null;
  domain?: string | null;
  website?: string | null;
  size?: number;
  className?: string;
};

function normalizeDomain(value?: string | null) {
  if (!value) return null;
  try {
    const raw = value.trim();
    const url = raw.includes("://") ? raw : `https://${raw}`;
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hostname || null;
  } catch {
    return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || null;
  }
}

function initials(name?: string | null) {
  const parts = (name || "Entreprise").trim().split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0]?.slice(0, 2) || "EN").toUpperCase();
}

function cacheKey(name?: string | null, domain?: string | null, logoUrl?: string | null) {
  const identity = [name?.trim().toLowerCase() || "entreprise", domain?.trim().toLowerCase() || "nodomain", logoUrl?.trim() || "auto"].join(":");
  return `jobly:company-logo:v6:${encodeURIComponent(identity)}`;
}

export default function CompanyLogo({
  companyName,
  logoUrl,
  domain,
  website,
  size = 40,
  className = "",
}: CompanyLogoProps) {
  const resolvedDomain = useMemo(() => normalizeDomain(domain || website), [domain, website]);
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const candidates = useMemo(() => {
    const urls: string[] = [];
    const direct = logoUrl?.trim();

    if (direct) urls.push(direct);
    if (resolvedDomain) {
      // Same-origin proxy first: avoids browser/CDN/referrer failures that can hide
      // otherwise valid company favicons in production.
      urls.push(
        `/api/company-logo/image?domain=${encodeURIComponent(resolvedDomain)}`,
      );
      urls.push(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(resolvedDomain)}&sz=128`,
      );
      urls.push(
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(resolvedDomain)}.ico`,
      );
    }
    if (companyName?.trim()) {
      urls.push(`/api/company-logo?name=${encodeURIComponent(companyName.trim())}`);
    }

    return [...new Set(urls)];
  }, [logoUrl, resolvedDomain, companyName]);

  const [index, setIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIndex(0);
    setFailed(false);
    setResolvedLogo(null);
    setResolving(false);

    const direct = logoUrl?.trim();

    // Resolve through the server first so LOGO_DEV_SECRET_KEY is never exposed
    // to the browser and Logo.dev remains the preferred source.
    if (resolvedDomain || companyName?.trim()) {
      setResolving(true);
      const query = resolvedDomain
        ? `domain=${encodeURIComponent(resolvedDomain)}`
        : `name=${encodeURIComponent(companyName!.trim())}`;

      fetch(`/api/company-logo?${query}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("logo-resolution-failed");
          const body = await response.json();
          return typeof body.logoUrl === "string" ? body.logoUrl : null;
        })
        .then((url) => {
          if (cancelled) return;
          setResolvedLogo(url);
          setSrc(url || direct || candidates[0] || null);
        })
        .catch(() => {
          if (!cancelled) setSrc(direct || candidates[0] || null);
        })
        .finally(() => {
          if (!cancelled) setResolving(false);
        });

      return () => { cancelled = true; };
    }

    setSrc(direct || candidates[0] || null);
    return () => { cancelled = true; };
  }, [companyName, resolvedDomain, logoUrl, candidates]);
  function invalidateCache() {
    try { localStorage.removeItem(cacheKey(companyName, resolvedDomain, logoUrl)); } catch {}
  }

  function handleLoad() {
    if (!src) return;
    try { localStorage.setItem(cacheKey(companyName, resolvedDomain, logoUrl), src); } catch {}
  }

  function handleError() {
    invalidateCache();
    const next = index + 1;
    if (next < candidates.length) {
      setIndex(next);
      setSrc(candidates[next]);
      return;
    }
    setFailed(true);
    setSrc(null);
  }

  const fallback = (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-[#E5EAF2] bg-[#0F2040] font-black text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.3)) }}
      aria-label={companyName || "Entreprise"}
      role="img"
    >
      {initials(companyName)}
    </span>
  );

  if (failed || (!src && !resolving)) return fallback;
  if (!src) return <span aria-hidden="true" className={`block shrink-0 rounded-full bg-slate-100 ${className}`} style={{ width: size, height: size }} />;

  return (
    <img
      src={src}
      alt={companyName ? `Logo de ${companyName}` : "Logo entreprise"}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={handleLoad}
      onError={handleError}
      className={`shrink-0 rounded-full border border-[#E5EAF2] bg-white p-1 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
