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
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(resolvedDomain)}&sz=256`,
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

  const fillFrame = className.includes("company-logo-fill-frame");
  const fallback = (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-[#E5EAF2] bg-[#0F2040] font-black text-white ${className}`}
      style={{ width: fillFrame ? "100%" : size, height: fillFrame ? "100%" : size, fontSize: Math.max(10, Math.round(size * 0.3)) }}
      aria-label={companyName || "Entreprise"}
      role="img"
    >
      {initials(companyName)}
    </span>
  );

  if (failed || (!src && !resolving)) return fallback;
  if (!src) return <span aria-hidden="true" className={`block shrink-0 rounded-full bg-slate-100 ${className}`} style={{ width: fillFrame ? "100%" : size, height: fillFrame ? "100%" : size }} />;

  if (fillFrame) {
    return (
      <span className="relative block h-full w-full overflow-hidden">
        <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl" />
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
          className="absolute left-1/2 top-1/2 h-[72%] w-auto max-w-[80%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-100 drop-shadow-sm"
        />
      </span>
    );
  }

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
      className={`shrink-0 max-h-full max-w-full rounded-full border border-[#E5EAF2] bg-white p-1 object-contain ${className}`}
      style={{ width: fillFrame ? "100%" : size, height: fillFrame ? "100%" : size }}
    />
  );
}
