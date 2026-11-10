import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("runtime common helper forces only the JOBLY-E2E project and uses GET for local APIs", () => {
  const common = read("e2e/runtime-readonly-common.mjs");
  assert.match(common, /const PROJECT_REF = "ofqqrryamslxoqkklraw"/);
  assert.match(common, /for \(const filename of \["\.env\.local", "\.env\.e2e\.local"\]\)/);
  assert.doesNotMatch(common, /loadEnvConfig\(sourceRoot,\s*false/);
  assert.match(common, /\.e2e-fixture-runtime\.json/);
  assert.match(common, /NON_E2E_REFUSED_SOURCE_/);
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
  assert.match(runner, /id,sourceKey,status,publishedAt,deadline,discoveredAt,processedAt,jobId/);
  assert.match(runner, /id,jobId,sourceKey,status,qualityScore,createdAt,processedAt/);
  assert.doesNotMatch(runner, /countryCode|rejectionCode/);
  assert.match(runner, /AFRICA_DATA_PRESENCE/);
  assert.match(runner, /AFRICA_FRESHNESS_AUDIT/);
  assert.match(runner, /captures\.rows\.length === 0/);
  assert.match(runner, /apikey:\s*secretKey/);
  assert.doesNotMatch(runner, /Authorization:\s*["']Bearer ["']\s*\+\s*secretKey/);
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

test("server shutdown targets only the recorded JOBLY-E2E PID after health and process checks", () => {
  const runner = read("e2e/stop-readonly-runtime-server.mjs");
  assert.match(runner, /projectRef !== "ofqqrryamslxoqkklraw"/);
  assert.match(runner, /meta\.baseURL !== "http:\/\/127\.0\.0\.1:3217"/);
  assert.match(runner, /tasklist/);
  assert.match(runner, /taskkill", \["\/PID", String\(meta\.pid\), "\/T", "\/F"\]/);
  assert.doesNotMatch(runner, /taskkill", \["\/IM", "node\.exe"/i);
});

test("global recipe is one-command, parallel by independent module and safely shuts down its own server", () => {
  const runner = read("e2e/run-global-readonly-recipe.mjs");
  const command = read("e2e/run-global-e2e.cmd");
  assert.match(runner, /scripts\/e2e-bulk-runner\.mjs/);
  assert.match(runner, /Promise\.all/);
  assert.match(runner, /e2e\/stop-readonly-runtime-server\.mjs/);
  assert.match(runner, /Date\.parse\(pidMeta\.startedAt/);
  assert.match(runner, /safeStaticEnv/);
  assert.match(runner, /global-e2e-report\.md/);
  assert.match(command, /run-global-readonly-recipe\.mjs/);
  assert.match(command, /global-e2e-process\.log/);
  assert.doesNotMatch(runner, /taskkill|SERVICE_ROLE_KEY|SECRET_KEY/);
});

test("all Windows recipe wrappers auto-open their report in Notepad with a log fallback", () => {
  const wrappers = [
    ["e2e/run-runtime-lot02-readonly.cmd", "lot2-runtime-readonly.json", "lot2-runtime-readonly-process.log"],
    ["e2e/run-runtime-lot03-readonly.cmd", "lot3-runtime-readonly.json", "lot3-runtime-readonly-process.log"],
    ["e2e/run-runtime-lot04-readonly.cmd", "lot4-runtime-readonly.json", "lot4-runtime-readonly-process.log"],
    ["e2e/start-readonly-runtime-server.cmd", "parallel-runtime-server.json", "parallel-runtime-server-process.log"],
    ["e2e/stop-readonly-runtime-server.cmd", "parallel-runtime-server-stop.json", "parallel-runtime-server-stop-process.log"],
    ["e2e/run-global-e2e.cmd", "global-e2e-report.md", "global-e2e-process.log"],
  ];
  for (const [file, report, log] of wrappers) {
    const command = read(file);
    assert.match(command, /start "" notepad "%CD%\\artifacts\\e2e\\/);
    assert.ok(command.includes(report), file + " must open its structured report");
    assert.ok(command.includes(log), file + " must open its process log when report is missing");
    assert.match(command, /exit \/b %RC%/i, file + " must preserve the original exit code");
  }
});


test("Africa ingest exposes the production batch logic for a local isolated E2E run", () => {
  const ingest = read("supabase/functions/job-harvest-ingest/index.ts");
  assert.match(ingest, /export async function ingestHarvestItems/);
  assert.match(ingest, /publicationDateEstimated = item\?\.\s*publicationDateEstimated === true \|\| !publishedAt/);
  assert.match(ingest, /discoveredAt: firstHarvestAt/);
  assert.match(ingest, /onConflict: "sourceKey,sourceUrl"/);
  assert.match(ingest, /if \(import\.meta\.main\) Deno\.serve\(handleRequest\)/);
});

test("Africa processor preserves estimated dates as harvest fallbacks, not source publication dates", () => {
  const processor = read("supabase/functions/job-harvest-process/index.ts");
  assert.match(processor, /export async function runHarvestProcessorBatch/);
  assert.equal((processor.match(/sourcePublishedAt: freshness\.publicationDateEstimated \? null : publicationDate/g) || []).length, 2);
  assert.match(processor, /publicationDateVerified: Boolean\(publicationDate\) && !freshness\.publicationDateEstimated/);
  assert.match(processor, /if \(import\.meta\.main\) Deno\.serve\(handleRequest\)/);
});

test("Africa bulk recipe exercises the real ingest and processor in one uniquely tagged run and cleans only that source", () => {
  const runner = read("e2e/africa-bulk-recipe.ts");
  const command = read("e2e/run-africa-bulk-recipe.cmd");
  assert.match(runner, /ofqqrryamslxoqkklraw/);
  assert.match(runner, /ingestHarvestItems\(admin, candidates\)/);
  assert.match(runner, /runHarvestProcessorBatch\(admin, \{ limit: 40, sourceKeys: \[sourceKey\] \}\)/);
  assert.match(runner, /jobly_e2e_bulk_/);
  assert.match(runner, /MISSING_PUBLICATION_AND_FALLBACK_DATE/);
  assert.match(runner, /ESTIMATED_DATE_STORED_AS_REAL_SOURCE_DATE|ESTIMATED_DATE_STORED_AS_SOURCE_DATE/);
  assert.match(runner, /async function cleanup\(key: string\)/);
  assert.match(runner, /JobOfferPipeline/);
  assert.match(runner, /pendingCleanup: true/);
  assert.match(runner, /BULK_CLEANUP/);
  assert.match(runner, /productionModified: false/);
  assert.match(command, /run-africa-bulk-recipe\.ts/);
  assert.match(command, /africa-bulk-recipe-report\.json/);
  assert.match(command, /africa-bulk-recipe-process\.log/);
  assert.match(command, /start "" notepad/);
  assert.match(command, /africa-bulk-recipe-report\.previous\.json/);
  assert.match(command, /where deno/);
  assert.match(command, /exit \/b %RC%/i);
});
