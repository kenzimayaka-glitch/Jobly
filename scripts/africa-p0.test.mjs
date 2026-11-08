import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveEffectivePublicationDate } from "../supabase/functions/_shared/job-freshness.ts";
import { AFRICA_COUNTRY_CODES, resolveAfricaCountryCode } from "../lib/countries/africa.ts";
const NOW="2026-11-02T12:00:00.000Z";
test("real source date remains fresh within two calendar months",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-09-20T12:00:00.000Z",firstHarvestAt:"2026-11-01T12:00:00.000Z",createdAt:"2026-11-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,true);assert.equal(r.publicationDateEstimated,false);assert.equal(r.publicationDateSource,"SOURCE");
 assert.equal(r.effectivePublishedAt,"2026-09-20T12:00:00.000Z");
});
test("real source date older than two calendar months is excluded",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-08-31T12:00:00.000Z",firstHarvestAt:"2026-11-01T12:00:00.000Z",createdAt:"2026-11-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,false);assert.equal(r.rejectionCode,"SOURCE_PUBLICATION_OVER_2_MONTHS");
});
test("first harvest is the first fallback and is limited to 30 days",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:null,firstHarvestAt:"2026-10-20T12:00:00.000Z",createdAt:"2026-10-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,true);assert.equal(r.publicationDateEstimated,true);assert.equal(r.publicationDateSource,"FIRST_HARVEST");
 assert.equal(r.effectivePublishedAt,"2026-10-20T12:00:00.000Z");
});
test("Job.createdAt is the last fallback and is limited to 30 days",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:null,firstHarvestAt:null,createdAt:"2026-10-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,false);assert.equal(r.publicationDateSource,"JOB_CREATED_AT");assert.equal(r.rejectionCode,"ESTIMATED_PUBLICATION_OVER_30_DAYS");
});
test("expired source deadline excludes the offer",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-10-30T12:00:00.000Z",firstHarvestAt:null,createdAt:"2026-10-30T12:00:00.000Z",deadline:"2026-11-01T23:59:59.000Z",now:NOW});
 assert.equal(r.visible,false);assert.equal(r.rejectionCode,"DEADLINE_PASSED");
});
test("missing dates are not fabricated",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:null,firstHarvestAt:null,createdAt:"",deadline:null,now:NOW});
 assert.equal(r.visible,false);assert.equal(r.effectivePublishedAt,null);assert.equal(r.publicationDateEstimated,false);
});
test("Talent GET remains read-only and excludes expired offers",()=>{
 const source=readFileSync(new URL("../app/api/jobs/route.ts",import.meta.url),"utf8");
 const start=source.indexOf("export async function GET");assert.notEqual(start,-1);
 const body=source.slice(start);
 assert.doesNotMatch(body,/\bensureUser\s*\(/);
 assert.doesNotMatch(body,/\.from\(["'][^"']+["']\)\s*\.(?:insert|update|upsert|delete)\s*\(/);
 assert.match(body,/ranked\.filter\(job=>job\.isVisible\)/);
});


test("scheduled production harvest is restricted to the approved first 20 sources", () => {
  const workflow = readFileSync(new URL("../.github/workflows/africa-shadow-crawl.yml", import.meta.url), "utf8");
  const processor = readFileSync(new URL("../.github/workflows/africa-harvest-processor.yml", import.meta.url), "utf8");
  const expectedSources = [
    "inep_mozambique", "lmis_sl", "nelex_ng", "ajira_portal", "sica_anpe_bj",
    "zimbabwe_psc_erecruitment", "anpe_bj", "anpe_bf", "anpe_ne", "anpetogo",
    "essa_sa", "hrjobs_liberia", "iefp_cv", "kenya_psc_jobs", "oppz_zambia_jobs",
    "onem_app_cd", "senjob_sn", "south_africa_gov_jobs", "beta_mauritania", "botswana_mof_recruitment"
  ];
  assert.equal(expectedSources.length, 20);
  assert.ok(workflow.includes("pull_request:"));
  assert.ok(workflow.includes("if: github.event_name != 'pull_request'"));
  assert.ok(workflow.includes("workflow_dispatch:"));
  assert.ok(workflow.includes("apply:"));
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.apply == true"));
  assert.ok(workflow.includes("github.event_name == 'schedule'"));
  assert.ok(workflow.includes('allowed_sources = {x.strip() for x in os.environ["SOURCE_KEYS"].split(",") if x.strip()}'));
  for (const key of expectedSources) assert.ok(workflow.includes(key), `Missing approved source key: ${key}`);
  assert.ok(processor.includes("github.event_name == 'schedule'"));
  assert.ok(processor.includes("cancel-in-progress: false"));
});
test("future publication dates are rejected instead of becoming fresh offers",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-11-03T12:00:00.000Z",firstHarvestAt:null,createdAt:"2026-11-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,false);assert.equal(r.publishedInFuture,true);assert.equal(r.rejectionCode,"PUBLICATION_DATE_IN_FUTURE");
});


test("homepage offer and talent counters share the canonical 54-country Africa catalogue", () => {
  const route = readFileSync(new URL("../app/api/public/home-stats/route.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.equal(AFRICA_COUNTRY_CODES.length, 54);
  assert.equal(resolveAfricaCountryCode("EH"), null);
  assert.equal(resolveAfricaCountryCode("Cameroon"), "CM");
  assert.match(route, /AFRICA_COUNTRY_CODES, resolveAfricaCountryCode/);
  assert.doesNotMatch(route, /"EH"/);
  assert.match(route, /\.in\("countryCode", \[\.\.\.AFRICA_COUNTRY_CODES\]\)/);
  assert.match(route, /select\("id,country,User!inner\(role,country\)"\)/);
  assert.match(route, /fetchAfricanTalentCount\(supabase\)/);
  assert.match(route, /\.range\(offset, offset \+ PAGE_SIZE - 1\)/);
  assert.match(page, /Talents partout en Afrique\./);
  assert.match(page, /PUBLIC_HOME_OFFERS_BASE = 75_000/);
  assert.match(page, /PUBLIC_HOME_TALENTS_BASE = 415_000/);
});
