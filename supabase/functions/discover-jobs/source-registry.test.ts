import { assertEquals } from "jsr:@std/assert@1";
import {
  AFRICA_COUNTRIES,
  SOURCE_REGISTRY,
  getActiveSources,
  getRegistryStats,
} from "./source-registry.ts";
import {
  auditRegistry,
  buildSourceRunPlan,
  sourceCanBeCrawled,
  validateSourceDefinition,
} from "./source-engine.ts";

Deno.test("source catalogue contains 248 unique registered keys", () => {
  const keys = SOURCE_REGISTRY.map((source) => source.key);
  assertEquals(SOURCE_REGISTRY.length, 248);
  assertEquals(new Set(keys).size, 248);
  assertEquals(getRegistryStats().sources, 248);
});

Deno.test("active source definitions are complete enough for a crawl", () => {
  const active = getActiveSources();
  assertEquals(active.length, 113);
  assertEquals(active.filter((source) => !sourceCanBeCrawled(source)).map((source) => source.key), []);
  assertEquals(
    active.flatMap((source) => validateSourceDefinition(source).map((error) => `${source.key}:${error}`)),
    [],
  );
});

Deno.test("all source country declarations use the 54-country registry", () => {
  const countryCodes = new Set(AFRICA_COUNTRIES.map((country) => country.code));
  const invalid = SOURCE_REGISTRY.flatMap((source) =>
    source.countries.filter((countryCode) => !countryCodes.has(countryCode)).map((countryCode) =>
      `${source.key}:${countryCode}`
    )
  );
  assertEquals(invalid, []);
});

Deno.test("discovery-only and inactive sources are never crawlable", () => {
  const unqualified = SOURCE_REGISTRY.filter((source) =>
    source.status !== "active" || !source.enabled
  );
  assertEquals(unqualified.length > 0, true);
  assertEquals(unqualified.filter(sourceCanBeCrawled).map((source) => source.key), []);
});

Deno.test("country run plans contain only qualified active sources", () => {
  for (const country of AFRICA_COUNTRIES) {
    const plan = buildSourceRunPlan(country.code);
    assertEquals(plan.every(sourceCanBeCrawled), true);
    assertEquals(
      plan.every((source) => source.countries.includes(country.code)),
      true,
    );
  }
});

Deno.test("registry integrity and source qualification are reported separately", () => {
  const report = auditRegistry();
  assertEquals(report.sources, 248);
  assertEquals(report.uniqueSourceKeys, 248);
  assertEquals(report.duplicateKeys, []);
  assertEquals(report.registryIntegrity, "GREEN");
  assertEquals(report.qualificationStatus, "INCOMPLETE");
  assertEquals(report.candidateReviewStatus, "COMPLETE");
  assertEquals(report.readyForCrawlSources, 113);
  assertEquals(report.invalidActiveSources, 0);
  assertEquals(report.missingUrlSources, 17);
  assertEquals(report.unresolvedUrlSources, 0);
  assertEquals(report.retiredNoUrlSources, 17);
  assertEquals(report.withUrl, 231);
  assertEquals(report.activeSources, 113);
  assertEquals(report.discoveredSources, 107);
});

Deno.test("all source entries without a URL are explicitly terminal and cannot be crawled", () => {
  const withoutUrl = SOURCE_REGISTRY.filter((source) => !source.url);
  assertEquals(withoutUrl.length, 17);
  assertEquals(withoutUrl.every((source) =>
    ["retired", "blocked", "inactive"].includes(source.status)
  ), true);
  assertEquals(withoutUrl.filter(sourceCanBeCrawled), []);
  assertEquals(withoutUrl.map((source) => source.key).includes("fne_west"), true);
});
