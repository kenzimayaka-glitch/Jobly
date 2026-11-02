import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveEffectivePublicationDate } from "../supabase/functions/_shared/job-freshness.ts";
const NOW="2026-11-02T12:00:00.000Z";
test("real source date uses the 62-day freshness window",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-09-20T12:00:00.000Z",firstHarvestAt:"2026-11-01T12:00:00.000Z",createdAt:"2026-11-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,true);assert.equal(r.publicationDateEstimated,false);assert.equal(r.publicationDateSource,"SOURCE");
 assert.equal(r.effectivePublishedAt,"2026-09-20T12:00:00.000Z");
});
test("real source date older than 62 days is excluded",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-08-31T12:00:00.000Z",firstHarvestAt:"2026-11-01T12:00:00.000Z",createdAt:"2026-11-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,false);assert.equal(r.rejectionCode,"SOURCE_PUBLICATION_OVER_62_DAYS");
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


test("shadow crawl ingestion is limited to approved events", () => {
  const workflow = readFileSync(new URL("../.github/workflows/africa-shadow-crawl.yml", import.meta.url), "utf8");
  assert.ok(workflow.includes("if: github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.apply == true)"));
  assert.ok(workflow.includes("if: github.event_name != 'pull_request'"));
  assert.ok(workflow.includes("default: false"));
  assert.ok(!workflow.includes("  push:\\n    branches:\\n      - main"));
});
test("future publication dates are rejected instead of becoming fresh offers",()=>{
 const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-11-03T12:00:00.000Z",firstHarvestAt:null,createdAt:"2026-11-01T12:00:00.000Z",deadline:null,now:NOW});
 assert.equal(r.visible,false);assert.equal(r.publishedInFuture,true);assert.equal(r.rejectionCode,"PUBLICATION_DATE_IN_FUTURE");
});
