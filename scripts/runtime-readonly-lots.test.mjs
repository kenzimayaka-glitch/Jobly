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
  const isolated = read("e2e/run-africa-bulk-isolated.ps1");
  const bootstrap = read("e2e/run-africa-bulk-bootstrap.cmd");
  const readme = read("e2e/README.md");
  assert.match(runner, /ofqqrryamslxoqkklraw/);
  assert.match(runner, /\.env\.local", "\.env\.e2e\.local/);
  assert.match(runner, /NON_E2E_ENV_URL_REFUSED/);
  assert.doesNotMatch(runner, /SECRET_KEY_WITHOUT_E2E_URL_PROOF/);
  assert.match(runner, /SECRET_KEY_E2E_PROOF_FAILED/);
  assert.match(runner, /if \(key\.startsWith\("sb_secret_"\)\)/);
  assert.match(runner, /client\.from\("Job"\)[\s\S]*?\.select\("id", \{ count: "exact", head: true \}\)[\s\S]*?\.limit\(0\)/);
  assert.match(runner, /E2E_SECRET_KEY_PROJECT_PROOF/);
  assert.match(runner, /const ingest = await ingestHarvestItems\(admin, \[/);
  assert.match(runner, /validItem\\(sourceKey, runId, false, countryCode\\)/);
  assert.match(runner, /validItem\\(sourceKey, runId, true, countryCode\\)/);
  assert.match(runner, /ingest-stale/);
  assert.match(runner, /ingest-deadline/);
  assert.match(runner, /runHarvestProcessorBatch\(admin, \{ limit: 40, sourceKeys: \[sourceKey\] \}\)/);
  assert.match(runner, /jobly_e2e_bulk_/);
  assert.match(runner, /MISSING_PUBLICATION_AND_FALLBACK_DATE/);
  assert.match(runner, /ESTIMATED_DATE_STORED_AS_REAL_SOURCE_DATE|ESTIMATED_DATE_STORED_AS_SOURCE_DATE/);
  assert.match(runner, /async function cleanup\(key: string\)/);
  assert.match(runner, /JobOfferPipeline/);
  assert.match(runner, /pendingCleanup: true/);
  assert.match(runner, /BULK_CLEANUP/);
  assert.match(runner, /productionModified: false/);
  assert.match(command, /e2e\\africa-bulk-recipe\.ts/);
  assert.match(command, /africa-bulk-recipe-report\.json/);
  assert.match(command, /africa-bulk-recipe-process\.log/);
  assert.match(command, /start "" notepad/);
  assert.match(command, /africa-bulk-recipe-report\.previous\.json/);
  assert.match(command, /where deno/);
  assert.match(command, /--node-modules-dir=none/);
  assert.match(command, /exit \/b %RC%/i);
  assert.match(isolated, /Invoke-Native "git" @\("-C", \$GitRoot, "archive", "--format=zip"/);
  assert.match(isolated, /FETCH_E2E_RECETTE/);
  assert.match(isolated, /"--depth=1", "--progress", "--no-tags"/);
  assert.match(isolated, /Tee-Object -FilePath \$Log -Append/);
  assert.match(isolated, /ForEach-Object \{ Write-Host \(\[string\]\$_\) \}/);
  assert.match(isolated, /\[switch\]\$Capture/);
  assert.match(isolated, /CHECK_ORIGIN" -Capture/);
  assert.match(isolated, /RESOLVE_FETCH_HEAD" -Capture/);
  assert.doesNotMatch(isolated, /WORKTREE NON PROPRE|git clean|reset --hard/);
  assert.doesNotMatch(isolated, /git status --porcelain/);
  assert.match(isolated, /Join-Path \$env:TEMP/);
  assert.match(isolated, /Write-Host \$Message/);
  assert.match(isolated, /LAUNCH_LOG/);
  assert.match(isolated, /GIT_FETCH_FAILED_ON_ALL_LOCAL_CHECKOUTS/);
  assert.match(isolated, /RUNTIME_RECIPE_PASS/);
  assert.match(isolated, /RUNTIME_RECIPE_NOT_PASS/);
  assert.match(isolated, /--node-modules-dir=none/);
  assert.match(isolated, /E2E_SECRET_KEY_PROJECT_PROOF/);
  assert.match(isolated, /RUNTIME_REPORT_STATUS/);
  assert.match(isolated, /CLEANUP_VERIFIED/);
  assert.match(isolated, /STATIC_TESTS_UPDATED_GUARDRAILS/);
  assert.match(isolated, /ofqqrryamslxoqkklraw/);
  assert.match(isolated, /FetchedSha/);
  assert.match(isolated, /cat-file/);
  assert.match(bootstrap, /\[1\/5\] Verification du depot local/);
  assert.match(bootstrap, /\[2\/5\] Recuperation de la branche distante/);
  assert.match(bootstrap, /git -C "%ROOT%" fetch --depth=1 --progress --no-tags origin refs\/heads\/e2e\/recette/);
  assert.match(bootstrap, /GIT_TERMINAL_PROMPT=0/);
  assert.match(bootstrap, /GCM_INTERACTIVE=never/);
  assert.doesNotMatch(bootstrap, /set "RC=%ERRORLEVEL%"/);
  assert.match(bootstrap, /if errorlevel 2 \(set "RC=2"\) else if errorlevel 1 \(set "RC=1"\) else \(set "RC=0"\)/);
  assert.match(bootstrap, /if errorlevel 1 \(set "RC=1"\) else \(set "RC=0"\)/);
  const bootstrapLogInit = bootstrap.indexOf('if not exist "%BOOTLOG%" > "%BOOTLOG%" echo JOBLY AFRICA BULK BOOTSTRAP');
  const bootstrapFetch = bootstrap.indexOf('git -C "%ROOT%" fetch --depth=1 --progress --no-tags origin refs/heads/e2e/recette');
  assert.ok(bootstrapLogInit >= 0 && bootstrapLogInit < bootstrapFetch, "bootstrap must create its stable log before git fetch");
  const documentedCommandStart = readme.indexOf('set "BOOTLOG=%TEMP%\\jobly-africa-bulk-bootstrap.log"');
  const documentedLogCreate = readme.indexOf('(echo JOBLY AFRICA BULK BOOTSTRAP > "%BOOTLOG%")', documentedCommandStart);
  const documentedFetch = readme.indexOf('git fetch --depth=1 --progress --no-tags origin refs/heads/e2e/recette', documentedCommandStart);
  assert.ok(documentedCommandStart >= 0 && documentedLogCreate > documentedCommandStart && documentedLogCreate < documentedFetch, "documented launch command must create the log before fetch");
  assert.match(bootstrap, /FETCH_SHA=%SHA%/);
  assert.match(bootstrap, /git -C "%ROOT%" show %SHA%:e2e\/run-africa-bulk-isolated\.ps1/);
  assert.match(bootstrap, /if not "%~1"==""/);
  assert.match(bootstrap, /set "SHA=%~1"/);
  assert.match(bootstrap, /if \/i "%~1"=="FETCH_HEAD"/);
  assert.match(bootstrap, /rev-parse FETCH_HEAD/);
  assert.match(bootstrap, /\[2\/5\] Reutilisation du FETCH_HEAD deja recupere/);
  assert.match(bootstrap, /:sha_ready/);
  assert.match(bootstrap, /:resolve_fetch_head/);
  assert.match(bootstrap, /:use_argument_sha/);
  assert.match(bootstrap, /-FetchedSha "%SHA%"/);
  assert.match(bootstrap, /pause >nul/);
  assert.match(bootstrap, /jobly-africa-bulk-bootstrap\.log/);
  assert.doesNotMatch(bootstrap, /git clean|reset --hard|status --porcelain|checkout --detach/);

});


test("Next typecheck excludes the Deno-only Africa recipe while CI checks it with Deno", () => {
  const config = JSON.parse(read("tsconfig.json"));
  assert.ok(config.exclude.includes("e2e/africa-bulk-recipe.ts"));
  const workflow = read(".github/workflows/verify-offer-pipeline.yml");
  assert.ok(workflow.includes("deno check --node-modules-dir=none e2e/africa-bulk-recipe.ts"));
  const processor = read("supabase/functions/job-harvest-process/index.ts");
  assert.ok(processor.includes("export type HarvestProcessorBatchResult"));
  assert.ok(processor.includes("Promise<HarvestProcessorBatchResult>"));
});

test("Talent offer detail uses the same source/first-harvest publication precedence as the feed", () => {
  const detail = read("app/api/jobs/[id]/route.ts");
  assert.ok(detail.includes("sourcePublishedAt"));
  assert.ok(detail.includes('from("JobHarvestCapture")'));
  assert.ok(detail.includes('order("discoveredAt", { ascending: true })'));
  assert.ok(detail.includes("resolveEffectivePublicationDate"));
  assert.ok(detail.includes("freshness.effectivePublishedAt || data.createdAt"));
  assert.ok(detail.includes("publicationDateEstimated: freshness.publicationDateEstimated"));
});

test("Africa bulk recipe validates ingestion through the authenticated Talent Africa feed and offer details", () => {
  const recipe = read("e2e/africa-bulk-recipe.ts");
  const server = read("e2e/start-readonly-runtime-server.mjs");
  const isolated = read("e2e/run-africa-bulk-isolated.ps1");
  assert.ok(recipe.includes("TALENT_FIXTURE_AUTH"));
  assert.ok(recipe.includes('searchParams.set("scope", "africa")'));
  assert.ok(recipe.includes("TALENT_AFRICA_FEED"));
  assert.ok(recipe.includes("TALENT_OFFER_DETAILS"));
  assert.ok(recipe.includes("TALENT_FEED_SOURCE_DATE_MISMATCH"));
  assert.ok(recipe.includes("TALENT_FEED_ESTIMATED_DATE_MISMATCH"));
  assert.ok(server.includes('process.argv.includes("--snapshot")'));
  assert.ok(server.includes("SNAPSHOT_COMMIT_SHA_REQUIRED"));
  assert.ok(isolated.includes("New-Item -ItemType Junction"));
  assert.ok(isolated.includes("START_LOCAL_JOBLY_E2E_SERVER"));
  assert.ok(isolated.includes("STOP_LOCAL_JOBLY_E2E_SERVER"));
  assert.ok(isolated.includes("--allow-net=127.0.0.1:3217"));
});


test("snapshot server start is pinned to the fetched commit and stopped by its exact recorded PID", () => {
  const server = read("e2e/start-readonly-runtime-server.mjs");
  const isolated = read("e2e/run-africa-bulk-isolated.ps1");
  const stop = read("e2e/stop-readonly-runtime-server.mjs");
  assert.match(server, /process\.argv\.includes\("--snapshot"\)/);
  assert.match(server, /E2E_RECIPE_SHA/);
  assert.match(isolated, /New-Item -ItemType Junction/);
  assert.match(isolated, /START_LOCAL_JOBLY_E2E_SERVER/);
  assert.match(isolated, /STOP_LOCAL_JOBLY_E2E_SERVER/);
  assert.match(stop, /taskkill", \["\/PID", String\(meta\.pid\), "\/T", "\/F"\]/);
  assert.doesNotMatch(stop, /taskkill", \["\/IM", "node\.exe"/i);
});

test("manual GitHub E2E workflow is a no-secret static/build preflight, not an interactive fixture run", () => {
  const workflow = read(".github/workflows/jobly-e2e-recipe.yml");
  assert.ok(workflow.includes("workflow_dispatch"));
  assert.ok(workflow.includes("node --test scripts/runtime-readonly-lots.test.mjs"));
  assert.ok(workflow.includes("deno check --node-modules-dir=none e2e/africa-bulk-recipe.ts"));
  assert.ok(workflow.includes("pnpm typecheck"));
  assert.ok(workflow.includes("pnpm build"));
  assert.ok(!workflow.includes("scripts/e2e-local-recipe.mjs"));
  assert.ok(!workflow.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!workflow.includes("SUPABASE_SECRET_KEY"));
});

test("Africa snapshot runtime requires Talent fixture only; it does not block on unrelated Recruiter fixture", () => {
  const server = read("e2e/start-readonly-runtime-server.mjs");
  assert.match(server, /const requiredFixtures = snapshotMode/);
  assert.match(server, /\[\["talent", "TALENT"\]\]/);
  assert.match(server, /\[\["talent", "TALENT"\], \["recruiter", "RECRUITER"\]\]/);
});
