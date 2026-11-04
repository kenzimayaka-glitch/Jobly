import {
  AFRICA_COUNTRIES,
  SOURCE_REGISTRY,
  getActiveSources,
  getRegistryStats,
  type SourceDefinition,
} from "./source-registry.ts";

export type SourceRunPlan = SourceDefinition & {
  selectedBecause: "active" | "country";
};

const AFRICAN_COUNTRY_CODES = new Set(AFRICA_COUNTRIES.map((country) => country.code));

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateSourceDefinition(source: SourceDefinition): string[] {
  const errors: string[] = [];

  if (!source.key?.trim()) errors.push("missing_key");
  if (!source.name?.trim()) errors.push("missing_name");
  if (!Array.isArray(source.countries) || source.countries.length === 0) {
    errors.push("missing_country");
  } else {
    if (new Set(source.countries).size !== source.countries.length) {
      errors.push("duplicate_country");
    }
    if (source.countries.some((code) => !AFRICAN_COUNTRY_CODES.has(code))) {
      errors.push("unsupported_country");
    }
  }

  if (source.status === "active" && !source.enabled) {
    errors.push("active_source_disabled");
  }
  if (source.enabled && source.status !== "active") {
    errors.push("enabled_source_not_active");
  }

  // Discovery entries may intentionally have no URL. Active or enabled
  // entries may never reach a crawler without a valid HTTP(S) entry point.
  if ((source.status === "active" || source.enabled) && !source.url) {
    errors.push("active_source_missing_url");
  }
  if (source.url && !isHttpUrl(source.url)) {
    errors.push("invalid_source_url");
  }
  if (source.status === "active" && source.captureMode === "unknown") {
    errors.push("active_source_unknown_capture_mode");
  }
  if (
    (source.captureMode === "api" || source.captureMode === "rss") &&
    !source.structuredAdapter
  ) {
    errors.push(source.captureMode === "api" ? "api_source_missing_adapter" : "rss_source_missing_adapter");
  }

  return errors;
}

/**
 * A source is crawlable only after it has been explicitly qualified and its
 * static configuration passes validation. Discovery-only entries are never
 * promoted just because a caller supplies their key.
 */
export function sourceCanBeCrawled(source: SourceDefinition): boolean {
  return source.enabled &&
    source.status === "active" &&
    validateSourceDefinition(source).length === 0;
}

export function buildSourceRunPlan(countryCode = "CM"): SourceRunPlan[] {
  return getActiveSources(countryCode)
    .filter(sourceCanBeCrawled)
    .map((source) => ({
      ...source,
      selectedBecause: source.countries.includes(countryCode) ? "country" : "active",
    }));
}

export function auditRegistry() {
  const keyCounts = new Map<string, number>();
  for (const source of SOURCE_REGISTRY) {
    keyCounts.set(source.key, (keyCounts.get(source.key) ?? 0) + 1);
  }

  const duplicateKeys = [...keyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key)
    .sort();

  const invalid = SOURCE_REGISTRY.flatMap((source) => {
    const errors = validateSourceDefinition(source);
    return errors.length ? [{ source: source.key, status: source.status, errors }] : [];
  });
  const invalidActiveSources = invalid.filter((entry) => entry.status === "active");
  const active = SOURCE_REGISTRY.filter((source) => source.status === "active" && source.enabled);
  const discovered = SOURCE_REGISTRY.filter((source) => source.status === "discovered");
  const missingUrl = SOURCE_REGISTRY.filter((source) => !source.url);
  const unresolvedUrl = missingUrl.filter((source) =>
    source.status === "active" || source.status === "discovered" || source.enabled
  );
  const retiredNoUrl = missingUrl.filter((source) =>
    source.status === "retired" || source.status === "blocked" || source.status === "inactive"
  );
  const unknownCaptureMode = SOURCE_REGISTRY.filter((source) => source.captureMode === "unknown");
  const readyForCrawl = SOURCE_REGISTRY.filter(sourceCanBeCrawled);
  const uniqueSourceKeys = keyCounts.size;
  const stats = getRegistryStats();

  const registryIntegrity =
    duplicateKeys.length === 0 &&
    uniqueSourceKeys === stats.sources &&
    invalidActiveSources.length === 0 &&
    readyForCrawl.length === active.length
      ? "GREEN"
      : "BLOCKED";

  return {
    ...stats,
    uniqueSourceKeys,
    duplicateKeys,
    readyForCrawlSources: readyForCrawl.length,
    invalidActiveSources: invalidActiveSources.length,
    invalid,
    discoveryOnlySources: discovered.length,
    missingUrlSources: missingUrl.length,
    missingUrlSourceKeys: missingUrl.map((source) => source.key).sort(),
    unresolvedUrlSources: unresolvedUrl.length,
    unresolvedUrlSourceKeys: unresolvedUrl.map((source) => source.key).sort(),
    retiredNoUrlSources: retiredNoUrl.length,
    retiredNoUrlSourceKeys: retiredNoUrl.map((source) => source.key).sort(),
    unknownCaptureModeSources: unknownCaptureMode.length,
    registryIntegrity,
    candidateReviewStatus: unresolvedUrl.length === 0 ? "COMPLETE" : "INCOMPLETE",
    qualificationStatus: discovered.length > 0 ? "INCOMPLETE" : "COMPLETE",
    note: "GREEN measures registry integrity and active configuration only. COMPLETE candidate review means every source candidate has either a usable URL or an explicit terminal status; it does not claim that discovered websites have passed a live crawl or are production-ready.",
  };
}

export function sourceHealthClass(input: {
  httpStatus?: number;
  discovered: number;
  extracted: number;
  eligible: number;
  error?: string | null;
}): "healthy" | "degraded" | "failed" {
  if (input.error || (input.httpStatus && input.httpStatus >= 400)) return "failed";
  if (input.discovered === 0) return "degraded";
  const extractionRate = input.extracted / input.discovered;
  const eligibilityRate = input.eligible / Math.max(input.extracted, 1);
  if (extractionRate < 0.5 || eligibilityRate < 0.3) return "degraded";
  return "healthy";
}
