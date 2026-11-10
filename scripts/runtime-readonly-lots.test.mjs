import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("runtime common helper forces only the JOBLY-E2E project and uses GET for local APIs", () => {
  const common = read("e2e/runtime-readonly-common.mjs");
  assert.match(common, /const PROJECT_REF = "ofqqrryamslxoqkklraw"/);
  assert.match(common, /publicUrl && publicUrl !== SUPABASE_URL/);
  assert.match(common, /serverUrl && serverUrl !== SUPABASE_URL/);
  assert.match(common, /method: "GET"/);
  assert.match(common, /127\.0\.0\.1:3217/);
});

test("LOT-02 Talent runner never invokes ingestion, bulk preparation or application submission", () => {
  const runner = read("e2e/runtime-lot02-readonly.mjs");
  assert.match(runner, /TALENT_LOCAL_OFFERS_READ/);
  assert.match(runner, /TALENT_AFRICA_OFFERS_READ/);
  assert.match(runner, /TALENT_OFFER_DETAIL_READ/);
  assert.match(runner, /TALENT_CV_ORIGINAL_READ/);
  assert.doesNotMatch(runner, /ingest\/sources|applications\/bulk-check|\/submit/i);
  assert.doesNotMatch(runner, /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i);
});

test("LOT-03 Recruiter runner keeps candidature reads passive and sends GET only", () => {
  const runner = read("e2e/runtime-lot03-readonly.mjs");
  assert.match(runner, /recruiter\/applications\?markViewed=0/);
  assert.match(runner, /RECRUITMENT360_DENY_UNOWNED_RECRUITMENT/);
  assert.doesNotMatch(runner, /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i);
  assert.doesNotMatch(runner, /gmail|sendEmail|shortlist|action:\s*["'](?:score|decision|document)/i);
});

test("LOT-04 Africa runtime runner reads only approved E2E harvest tables", () => {
  const runner = read("e2e/runtime-lot04-readonly.mjs");
  assert.match(runner, /JobHarvestCapture/);
  assert.match(runner, /JobOfferPipeline/);
  assert.match(runner, /apikey:\s*secretKey/);
  assert.match(runner, /method:\s*["']GET["']/);
  assert.doesNotMatch(runner, /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i);
  assert.doesNotMatch(runner, /\.from\(["'][^"']+["']\)\s*\.(?:insert|update|upsert|delete)\s*\(/i);
  assert.match(runner, /remoteAuthDeviceStateMayBeModified = false/);
});

test("shared server launcher builds once, stays on loopback JOBLY-E2E and rejects an occupied port", () => {
  const runner = read("e2e/start-readonly-runtime-server.mjs");
  assert.match(runner, /const PORT = "3217"/);
  assert.match(runner, /assertPortFree/);
  assert.match(runner, /gitValue\(\["rev-parse", "origin\/e2e\/recette"\]\)/);
  assert.match(runner, /SUPABASE_SECRET_KEY: config\.secretKey/);
  assert.match(runner, /127\.0\.0\.1/);
});
