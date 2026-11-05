import { assertEquals } from "jsr:@std/assert@1";
import {
  decodeHtmlEntities,
  inferCountryFromLocation,
  isGenericRecruitmentTitle,
  mapOpportunityType,
  normalizeCountryCode,
  normalizeLanguage,
  normalizeRemoteMode,
  normalizePipelineCaptureMode,
  resolveCountryCode,
  safeHttpUrl,
} from "./processor-logic.ts";

Deno.test("decodes numeric and named HTML entities before storage", () => {
  assertEquals(decodeHtmlEntities("Environmental and Social Specialist REoI &#8211; Published"), "Environmental and Social Specialist REoI – Published");
  assertEquals(decodeHtmlEntities("R&amp;D &eacute;quipe &ldquo;Jobly&rdquo;"), "R&D équipe “Jobly”");
  assertEquals(decodeHtmlEntities("&amp;#8211;"), "–");
});

Deno.test("normalizes French country names with accents", () => {
  assertEquals(normalizeCountryCode("Côte d’Ivoire"), "CI");
  assertEquals(normalizeCountryCode("Afrique du Sud"), "ZA");
  assertEquals(normalizeCountryCode("Democratic Republic of the Congo"), "CD");
});

Deno.test("uses a clear location country ahead of crawler loop metadata", () => {
  const geita = resolveCountryCode("RW", "Geita, Geita");
  assertEquals(geita.countryCode, "TZ");
  assertEquals(geita.conflict, true);
  assertEquals(geita.evidence, "LOCATION");

  assertEquals(inferCountryFromLocation("Kilimani, 03, TZ, 41110"), "TZ");
  assertEquals(inferCountryFromLocation("Mbarara"), "UG");
  assertEquals(inferCountryFromLocation("Johannesburg, ZA, 2198"), "ZA");
  assertEquals(inferCountryFromLocation("Kigali, Rwanda"), "RW");
});

Deno.test("does not guess when a location contains conflicting country evidence", () => {
  assertEquals(inferCountryFromLocation("Nairobi, Kenya; Kampala, Uganda"), null);
  assertEquals(resolveCountryCode("RW", "unknown location").countryCode, "RW");
  assertEquals(resolveCountryCode(null, "unknown location").countryCode, null);
});

Deno.test("rejects account pages and generic CV-bank notices, not named vacancies", () => {
  assertEquals(isGenericRecruitmentTitle("Compte recruteur"), true);
  assertEquals(isGenericRecruitmentTitle("Submit CVs – Latest Recruitment"), true);
  assertEquals(isGenericRecruitmentTitle("Submit CVs – New Recruitment"), true);
  assertEquals(isGenericRecruitmentTitle("Finance and Office Admin Assistant"), false);
});

Deno.test("maps source opportunity classes onto the supported Job enum", () => {
  assertEquals(mapOpportunityType("STAGE")?.jobType, "EMPLOI");
  assertEquals(mapOpportunityType("CONSULTANCE")?.jobType, "EMPLOI");
  assertEquals(mapOpportunityType("CONCOURS")?.jobType, "CONCOURS");
  assertEquals(mapOpportunityType("FORMATION")?.jobType, "FORMATION");
  assertEquals(mapOpportunityType("APPEL_A_CANDIDATURE")?.jobType, "RECRUTEMENT_INSUFFISANT");
  assertEquals(mapOpportunityType("APPEL_OFFRES"), null);
  assertEquals(mapOpportunityType("EVENEMENT"), null);
});

Deno.test("normalizes supported language and remote-work values", () => {
  assertEquals(normalizeLanguage("pt", "texto"), "pt");
  assertEquals(normalizeLanguage(null, "The candidate must apply for this position"), "en");
  assertEquals(normalizeLanguage(null, "Le candidat doit postuler"), "fr");
  assertEquals(normalizeRemoteMode("Hybrid"), "PARTIAL");
  assertEquals(normalizeRemoteMode("Télétravail"), "YES");
  assertEquals(normalizeRemoteMode("On-site"), "NO");
});

Deno.test("accepts only HTTP(S) source and application URLs", () => {
  assertEquals(safeHttpUrl("https://example.org/jobs") !== null, true);
  assertEquals(safeHttpUrl("javascript:alert(1)"), null);
  assertEquals(safeHttpUrl("mailto:jobs@example.org"), null);
});

Deno.test("normalizes crawler-only capture modes to database-supported values", () => {
  assertEquals(normalizePipelineCaptureMode("browser"), "browser");
  assertEquals(normalizePipelineCaptureMode("http"), "http");
  assertEquals(normalizePipelineCaptureMode("api"), "api");
  assertEquals(normalizePipelineCaptureMode("rss"), "rss");
  assertEquals(normalizePipelineCaptureMode("shadow-crawl"), "unknown");
  assertEquals(normalizePipelineCaptureMode(undefined), "unknown");
});
