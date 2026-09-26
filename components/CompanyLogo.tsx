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
  return `jobly:company-logo:v3:${encodeURIComponent(identity)}`;
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
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN?.trim();

  // Logo.dev supports name -> logo resolution as well as domain -> logo.
  // This is important for Jobly because many imported employers have no website stored.
  const candidates = useMemo(() => {
    const urls: string[] = [];
    const direct = logoUrl?.trim();
    const name = companyName?.trim();

    if (direct) urls.push(direct);

    if (name && logoDevToken) {
      urls.push(
        `https://img.logo.dev/name/${encodeURIComponent(name)}?token=${encodeURIComponent(logoDevToken)}&size=128&fallback=404`,
      );
    }

    if (resolvedDomain && logoDevToken) {
      urls.push(
        `https://img.logo.dev/${encodeURIComponent(resolvedDomain)}?token=${encodeURIComponent(logoDevToken)}&size=128&fallback=404`,
      );
    }

    // Last network fallback for companies whose Logo.dev record cannot be resolved.
    if (resolvedDomain) {
      urls.push(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(resolvedDomain)}&sz=128`,
      );
    }

    return [...new Set(urls)];
  }, [companyName, logoUrl, resolvedDomain, logoDevToken]);

  const [index, setIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);

    try {
      const cached = localStorage.getItem(cacheKey(companyName, resolvedDomain, logoUrl));
      setSrc(cached && cached !== "1" ? cached : candidates[0] || null);
    } catch {
      setSrc(candidates[0] || null);
    }
  }, [companyName, resolvedDomain, logoUrl, candidates]);

  function invalidateCache() {
    try {
      localStorage.removeItem(cacheKey(companyName, resolvedDomain, logoUrl));
    } catch {}
  }

  function handleLoad() {
    if (!src) return;
    try {
      localStorage.setItem(cacheKey(companyName, resolvedDomain, logoUrl), src);
    } catch {}
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

  if (failed || !src) return fallback;

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
