import { createClient } from "npm:@supabase/supabase-js@2";
import path from "node:path";
import { ingestHarvestItems } from "../supabase/functions/job-harvest-ingest/index.ts";
import { runHarvestProcessorBatch } from "../supabase/functions/job-harvest-process/index.ts";

const REF = "ofqqrryamslxoqkklraw";
const URL = "https://" + REF + ".supabase.co";
const API_BASE = "http://127.0.0.1:3217";
const PUBLISHABLE_KEY = "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
const SOURCE_ROOT = path.resolve(Deno.args[0] || "");
const OUT = path.resolve("artifacts/e2e");
const STATE = path.resolve(Deno.args[1] || OUT);
const REPORT = path.join(OUT, "africa-bulk-recipe-report.json");
const MANIFEST = path.join(STATE, "africa-bulk-recipe-cleanup.json");

type Row = Record<string, any>;
const report: Row = {
  createdAt: new Date().toISOString(),
  environment: "JOBLY-E2E",
  projectRef: REF,
  mode: "africa-harvest-bulk-integration",
  status: "RUNNING",
  checks: [],
  metrics: {},
  credentialsPrinted: false,
  tokensPrinted: false,
  externalActions: false,
  productionModified: false,
  temporaryE2EBusinessWrites: true,
  remoteBusinessDataMayBeModified: true,
  cleanupVerified: false,
  reportPath: REPORT,
};
let admin: any;
let runId = "";
let sourceKey = "";

function add(id: string, status: "PASS" | "FAIL" | "BLOCKED", detail: string, metrics: Row = {}) {
  report.checks.push({ id, status, detail: String(detail).slice(0, 500), metrics });
}
function insist(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
async function readText(file: string): Promise<string | null> {
  try { return await Deno.readTextFile(file); }
  catch (e) { if (e instanceof Deno.errors.NotFound) return null; throw e; }
}
async function saveJson(file: string, value: unknown) {
  await Deno.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + ".tmp-" + crypto.randomUUID();
  try {
    await Deno.writeTextFile(temporary, JSON.stringify(value, null, 2) + "\n");
    await Deno.rename(temporary, file);
  } catch (error) {
    await Deno.remove(temporary).catch(() => undefined);
    throw error;
  }
}
async function connectE2E() {
  insist(SOURCE_ROOT && SOURCE_ROOT !== path.parse(SOURCE_ROOT).root, "SOURCE_ROOT_INVALID");
  const env: Record<string, string> = {};
  for (const filename of [".env.local", ".env.e2e.local"]) {
    const text = await readText(path.join(SOURCE_ROOT, filename));
    if (!text) continue;
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "").trim();
      }
      env[match[1]] = value;
    }
  }

  const runtimeText = await readText(path.join(SOURCE_ROOT, ".e2e-fixture-runtime.json"));
  let runtimeVerified = false;
  let key = "";
  if (runtimeText) {
    const runtime = JSON.parse(runtimeText);
    insist(runtime.environment === "JOBLY-E2E", "E2E_RUNTIME_ENVIRONMENT_MISMATCH");
    insist(runtime.projectRef === REF, "E2E_RUNTIME_PROJECT_MISMATCH");
    runtimeVerified = true;
    key = String(runtime.serviceRoleKey || runtime.secretKey || "").trim();
  }

  const configuredUrls = [env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_URL].filter(Boolean);
  insist(configuredUrls.every((value) => value === URL), "NON_E2E_ENV_URL_REFUSED");
  if (!key) {
    key = String(
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SERVICE_KEY ||
      "",
    ).trim();
  }
  insist(key.startsWith("sb_secret_") || key.startsWith("eyJ"), "E2E_SERVER_KEY_MISSING");

  if (key.startsWith("eyJ")) {
    const part = (key.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    insist(claims.ref === REF && claims.role === "service_role", "SERVER_KEY_PROJECT_OR_ROLE_MISMATCH");
  }
  // sb_secret_ project binding is checked below by a read-only request against
  // the code-pinned E2E host when no trusted local proof is available.

  const client = createClient(URL, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("apikey", key);
      if (key.startsWith("sb_secret_")) headers.delete("authorization");
      return fetch(input, { ...init, headers });
    } },
  });

  // A Supabase sb_secret_ key has no locally decodable project claim.
  // Always prove it against the pinned JOBLY-E2E project with a zero-row,
  // read-only HEAD, even when a local URL/manifest is present. A production or
  // foreign key is rejected by the E2E API before any business write.
  if (key.startsWith("sb_secret_")) {
    const { error } = await client.from("Job")
      .select("id", { count: "exact", head: true })
      .limit(0);
    insist(!error, "SECRET_KEY_E2E_PROOF_FAILED");
    add(
      "E2E_SECRET_KEY_PROJECT_PROOF",
      "PASS",
      "Clé sb_secret acceptée par une lecture HEAD sans lignes sur la table Job du projet E2E épinglé",
      { operation: "GET/HEAD", table: "Job", rowsReturned: 0, projectRef: REF },
    );
  }

  return client;
}

async function exactCount(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await admin.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  if (error) throw new Error("COUNT_" + table + "_" + error.message);
  return Number(count || 0);
}
async function cleanup(key: string) {
  insist(key.startsWith("jobly_e2e_bulk_"), "CLEANUP_SOURCE_KEY_REFUSED");
  const [captureRead, jobRead] = await Promise.all([
    admin.from("JobHarvestCapture").select("id,jobId").eq("sourceKey", key),
    admin.from("Job").select("id").eq("sourceKey", key),
  ]);
  if (captureRead.error) throw new Error("CLEANUP_CAPTURE_READ_" + captureRead.error.message);
  if (jobRead.error) throw new Error("CLEANUP_JOB_READ_" + jobRead.error.message);
  const ids = [...new Set([
    ...(captureRead.data || []).map((x: Row) => x.jobId).filter(Boolean),
    ...(jobRead.data || []).map((x: Row) => x.id).filter(Boolean),
  ])];
  if (ids.length) {
    const p = await admin.from("JobOfferPipeline").delete().in("jobId", ids);
    if (p.error) throw new Error("CLEANUP_PIPELINE_" + p.error.message);
    const j = await admin.from("Job").delete().in("id", ids);
    if (j.error) throw new Error("CLEANUP_JOB_" + j.error.message);
  }
  const c = await admin.from("JobHarvestCapture").delete().eq("sourceKey", key);
  if (c.error) throw new Error("CLEANUP_CAPTURE_" + c.error.message);
  const [capturesLeft, jobsLeft] = await Promise.all([
    exactCount("JobHarvestCapture", "sourceKey", key),
    exactCount("Job", "sourceKey", key),
  ]);
  insist(capturesLeft === 0 && jobsLeft === 0, "CLEANUP_ROWS_REMAIN");
  if (ids.length) {
    const { count, error } = await admin.from("JobOfferPipeline")
      .select("id", { count: "exact", head: true }).in("jobId", ids);
    if (error) throw new Error("CLEANUP_PIPELINE_VERIFY_" + error.message);
    insist(Number(count || 0) === 0, "CLEANUP_PIPELINE_REMAINS");
  }
  return { capturesRemoved: captureRead.data?.length || 0, jobsRemoved: jobRead.data?.length || 0 };
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000).toISOString();
const ago = (d: Date, n: number) => new Date(d.getTime() - n * 86400000).toISOString();

function validItem(key: string, run: string, estimated: boolean, countryCode: string) {
  return {
    sourceKey: key,
    url: "https://jobs.e2e.invalid/" + run + (estimated ? "/estimated" : "/source-date"),
    title: (estimated ? "Assistant administratif — fixture estimée " : "Chargé de projet — fixture source ") + run.slice(0, 8),
    description: "Fixture synthétique Jobly E2E. Missions : planification des activités, suivi des indicateurs, coordination des partenaires, rédaction des rapports et accompagnement des équipes. Profil : gestion de projet, rigueur et communication.",
    company: "",
    location: countryCode === "SN" ? "Dakar, Senegal" : "Douala, Cameroon",
    countryCode,
    opportunityType: "EMPLOI",
    sourceType: "national",
    sourceName: "JOBLY E2E BULK RECIPE",
    sourceCaptureMode: "http",
    language: "fr",
    published: estimated ? null : ago(new Date(), 7),
    publicationDateEstimated: estimated,
    discoveredAt: estimated ? ago(new Date(), 4) : null,
    deadline: addDays(new Date(), 20),
    applicationEmail: "apply-" + (estimated ? "estimated" : "source") + "-" + run + "@example.invalid",
    displayModel: "jobly-e2e-africa-bulk-v1",
    e2eRunId: run,
  };
}
function negativeCapture(key: string, run: string, kind: "stale" | "deadline" | "missing", countryCode: string): Row {
  const now = new Date();
  const url = "https://jobs.e2e.invalid/" + run + "/processor-" + kind;
  const published = kind === "stale" ? "2026-08-01T12:00:00.000Z" : kind === "missing" ? null : ago(now, 5);
  const deadline = kind === "deadline" ? ago(now, 1) : addDays(now, 20);
  const payload = {
    e2eRunId: run, url, countryCode, opportunityType: "EMPLOI",
    sourceType: "national", sourceName: "JOBLY E2E BULK RECIPE",
    published, deadline, applicationEmail: "apply-" + kind + "-" + run + "@example.invalid",
  };
  return {
    sourceKey: key, externalId: url, sourceUrl: url,
    title: "Technicien support — contrôle " + kind,
    company: null, location: countryCode === "SN" ? "Dakar, Senegal" : "Douala, Cameroon",
    description: "Fixture synthétique pour le processeur Afrique. Missions : assistance technique, documentation, suivi des incidents et accompagnement des utilisateurs. Profil : rigueur et communication.",
    contractType: "CDD", remoteMode: "NO", deadline, publishedAt: published,
    applicationProfile: { countryCode, opportunityType: "EMPLOI", applicationEmail: payload.applicationEmail, publicationDateEstimated: false, e2eRunId: run },
    payload, captureMode: "http", status: "PENDING", attempts: 0,
    discoveredAt: now.toISOString(), updatedAt: now.toISOString(),
  };
}

async function main() {
  await Deno.mkdir(OUT, { recursive: true });
  admin = await connectE2E();
  add("JOBLY_E2E_TARGET", "PASS", "Projet JOBLY-E2E confirmé avant toute écriture.");

  const fixturesText = await readText(path.join(SOURCE_ROOT, ".e2e-fixtures.json"));
  insist(Boolean(fixturesText), "E2E_FIXTURES_FILE_MISSING");
  const fixtures = JSON.parse(fixturesText!);
  insist(fixtures.environment === "JOBLY-E2E" && fixtures.projectRef === REF, "E2E_FIXTURES_PROJECT_MISMATCH");
  const talentFixture = fixtures.accounts?.find((item: Row) => item?.key === "talent" && item?.role === "TALENT");
  insist(talentFixture?.email && talentFixture?.password, "TALENT_FIXTURE_MISSING");
  const authClient = createClient(URL, PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const signedIn = await authClient.auth.signInWithPassword({
    email: talentFixture.email,
    password: talentFixture.password,
  });
  if (signedIn.error || !signedIn.data.session?.access_token) throw new Error("TALENT_AUTH_FAILED");
  insist(
    signedIn.data.user?.app_metadata?.e2e_fixture === true &&
    signedIn.data.user?.app_metadata?.e2e_role === "TALENT",
    "TALENT_FIXTURE_ROLE_MISMATCH",
  );
  add("TALENT_FIXTURE_AUTH", "PASS", "Session Talent synthétique JOBLY-E2E obtenue ; aucun token journalisé.");
  const talentUser = await admin.from("User").select("country")
    .eq("authUserId", signedIn.data.user.id).maybeSingle();
  if (talentUser.error) throw new Error("TALENT_COUNTRY_READ_" + talentUser.error.message);
  const homeCountry = String(talentUser.data?.country || "").trim().toUpperCase();
  const countryCode = homeCountry === "CM" || homeCountry.includes("CAMER") || homeCountry.includes("CAMEROUN")
    ? "SN" : "CM";

  const previousText = await readText(MANIFEST);
  if (previousText) {
    const previous = JSON.parse(previousText);
    insist(previous.environment === "JOBLY-E2E" && previous.projectRef === REF, "OLD_MANIFEST_TARGET_MISMATCH");
    if (previous.pendingCleanup === true) {
      const cleaned = await cleanup(String(previous.sourceKey || ""));
      await Deno.remove(MANIFEST).catch(() => undefined);
      add("PREVIOUS_RUN_CLEANUP", "PASS", "Nettoyage exact du run interrompu précédent.", cleaned);
    } else await Deno.remove(MANIFEST).catch(() => undefined);
  }

  runId = crypto.randomUUID();
  sourceKey = "jobly_e2e_bulk_" + runId.replace(/-/g, "").slice(0, 20);
  insist(await exactCount("JobHarvestCapture", "sourceKey", sourceKey) === 0, "RUN_CAPTURE_KEY_COLLISION");
  insist(await exactCount("Job", "sourceKey", sourceKey) === 0, "RUN_JOB_KEY_COLLISION");
  await saveJson(MANIFEST, { environment: "JOBLY-E2E", projectRef: REF, runId, sourceKey, pendingCleanup: true, createdAt: new Date().toISOString() });

  const ingest = await ingestHarvestItems(admin, [
    validItem(sourceKey, runId, false, countryCode),
    validItem(sourceKey, runId, true, countryCode),
    { ...validItem(sourceKey, runId, false, countryCode), url: "https://jobs.e2e.invalid/" + runId + "/ingest-stale", published: "2026-08-01T12:00:00.000Z", title: "Fixture ancienne" },
    { ...validItem(sourceKey, runId, false, countryCode), url: "https://jobs.e2e.invalid/" + runId + "/ingest-deadline", deadline: ago(new Date(), 1), title: "Fixture délai dépassé" },
  ]);
  insist(ingest.status === 200, "INGEST_STATUS_" + ingest.status);
  insist(ingest.body.insertedOrRefreshed === 2 && ingest.body.expired === 2, "INGEST_BULK_FILTER_MISMATCH");
  insist(ingest.body.estimatedDateCandidates === 1, "INGEST_ESTIMATED_COUNT_MISMATCH");
  add("BULK_INGEST_FILTERS", "PASS", "2 captures fraîches acceptées ; publication ancienne et date limite dépassée rejetées avant persistance.", ingest.body);

  const negative = await admin.from("JobHarvestCapture")
    .insert([negativeCapture(sourceKey, runId, "stale", countryCode), negativeCapture(sourceKey, runId, "deadline", countryCode), negativeCapture(sourceKey, runId, "missing", countryCode)])
    .select("id,status");
  if (negative.error) throw new Error("NEGATIVE_CAPTURE_INSERT_" + negative.error.message);
  insist(negative.data?.length === 3, "NEGATIVE_CAPTURE_COUNT_MISMATCH");

  const before = await admin.from("JobHarvestCapture").select("id,status")
    .eq("sourceKey", sourceKey);
  if (before.error) throw new Error("CAPTURE_PREFLIGHT_" + before.error.message);
  insist(before.data?.length === 5, "EXPECTED_5_PENDING_CAPTURES_GOT_" + before.data?.length);

  const processed = await runHarvestProcessorBatch(admin, { limit: 40, sourceKeys: [sourceKey] });
  insist(processed.selected === 5 && processed.processed === 2, "PROCESSOR_COUNTS_MISMATCH");
  insist(processed.expired === 2 && processed.quarantined === 1, "PROCESSOR_FILTER_COUNTS_MISMATCH");
  insist(processed.failed === 0 && processed.persistenceErrors === 0, "PROCESSOR_ERRORS_PRESENT");
  add("BULK_PROCESSOR", "PASS", "Le vrai processeur a créé 2 offres, expiré 2 captures et mis en quarantaine 1 date manquante.", processed);

  const [capturesRes, jobsRes] = await Promise.all([
    admin.from("JobHarvestCapture").select("id,sourceUrl,status,publishedAt,discoveredAt,processedAt,jobId,applicationProfile,lastError").eq("sourceKey", sourceKey),
    admin.from("Job").select("id,title,sourceKey,sourcePublishedAt,countryCode,applicationReady,qualityStatus,normalizedContent").eq("sourceKey", sourceKey),
  ]);
  if (capturesRes.error) throw new Error("CAPTURE_POSTCHECK_" + capturesRes.error.message);
  if (jobsRes.error) throw new Error("JOB_POSTCHECK_" + jobsRes.error.message);
  const captures = capturesRes.data || [];
  const jobs = jobsRes.data || [];
  const byUrl = new Map(captures.map((x: Row) => [x.sourceUrl, x]));
  const sourceCapture = byUrl.get("https://jobs.e2e.invalid/" + runId + "/source-date") as Row | undefined;
  const estimatedCapture = byUrl.get("https://jobs.e2e.invalid/" + runId + "/estimated") as Row | undefined;
  const stale = byUrl.get("https://jobs.e2e.invalid/" + runId + "/processor-stale") as Row | undefined;
  const deadline = byUrl.get("https://jobs.e2e.invalid/" + runId + "/processor-deadline") as Row | undefined;
  const missing = byUrl.get("https://jobs.e2e.invalid/" + runId + "/processor-missing") as Row | undefined;
  insist(sourceCapture?.status === "PROCESSED" && sourceCapture.jobId, "SOURCE_CAPTURE_NOT_PROCESSED");
  insist(estimatedCapture?.status === "PROCESSED" && estimatedCapture.jobId, "ESTIMATED_CAPTURE_NOT_PROCESSED");
  insist(stale?.status === "EXPIRED" && deadline?.status === "EXPIRED", "EXPIRED_STATUSES_WRONG");
  insist(missing?.status === "QUARANTINED" && String(missing.lastError).includes("MISSING_PUBLICATION_AND_FALLBACK_DATE"), "MISSING_DATE_NOT_QUARANTINED");

  const sourceJob = jobs.find((x: Row) => x.id === sourceCapture.jobId);
  const estimatedJob = jobs.find((x: Row) => x.id === estimatedCapture.jobId);
  insist(sourceJob?.sourcePublishedAt, "SOURCE_DATE_NOT_PERSISTED");
  insist(estimatedJob && estimatedJob.sourcePublishedAt === null, "ESTIMATED_DATE_STORED_AS_REAL_SOURCE_DATE");
  insist(sourceJob.countryCode === countryCode && estimatedJob.countryCode === countryCode, "COUNTRY_CODE_MISMATCH");
  insist(sourceJob.applicationReady === true && estimatedJob.applicationReady === true, "APPLICATION_CONTACT_NOT_DETECTED");

  const pipelineRes = await admin.from("JobOfferPipeline")
    .select("id,jobId,status,canonicalContent,confidence")
    .in("jobId", [sourceJob.id, estimatedJob.id]);
  if (pipelineRes.error) throw new Error("PIPELINE_POSTCHECK_" + pipelineRes.error.message);
  const pipelines = pipelineRes.data || [];
  insist(pipelines.length === 2 && pipelines.every((x: Row) => x.status === "READY"), "PIPELINE_READY_COUNT_MISMATCH");
  const estimatedPipeline = pipelines.find((x: Row) => x.jobId === estimatedJob.id);
  insist(estimatedPipeline?.confidence?.publicationDateVerified === false, "ESTIMATED_DATE_CONFIDENCE_WRONG");
  insist(estimatedPipeline?.canonicalContent?.publicationDateEstimated === true, "ESTIMATED_FLAG_MISSING_FROM_CANONICAL");
  insist(estimatedPipeline?.canonicalContent?.sourcePublishedAt === null, "ESTIMATED_SOURCE_DATE_NOT_NULL_IN_CANONICAL");

  add("BULK_DATABASE_ASSERTIONS", "PASS", "Dates source et fallback, pays, contact, états, Jobs et pipelines cohérents.", {
    captures: captures.length, jobs: jobs.length, pipelines: pipelines.length,
    sourceDatePersisted: true, estimatedDateStoredAsSource: false,
  });
  const queryToken = runId.slice(0, 8);
  const feedUrl = new URL("/api/jobs", API_BASE);
  feedUrl.searchParams.set("scope", "africa");
  feedUrl.searchParams.set("limit", "20");
  feedUrl.searchParams.set("page", "1");
  feedUrl.searchParams.set("q", queryToken);
  const feedResponse = await fetch(feedUrl, {
    headers: {
      Authorization: "Bearer " + signedIn.data.session.access_token,
      "x-real-ip": "127.0.0.1",
      "Cache-Control": "no-store",
    },
    signal: AbortSignal.timeout(30000),
  });
  const feedBody = await feedResponse.json().catch(() => ({}));
  insist(
    feedResponse.status === 200 && feedBody.market?.scope === "africa" && Array.isArray(feedBody.jobs),
    "TALENT_AFRICA_FEED_HTTP_" + feedResponse.status,
  );
  const sourceFeedJob = feedBody.jobs.find((job: Row) => job.id === sourceJob.id && job.source === "discovery");
  const estimatedFeedJob = feedBody.jobs.find((job: Row) => job.id === estimatedJob.id && job.source === "discovery");
  insist(sourceFeedJob && estimatedFeedJob, "TALENT_AFRICA_FEED_MISSING_SYNTHETIC_OFFERS");
  insist(sourceFeedJob.countryCode === countryCode && estimatedFeedJob.countryCode === countryCode, "TALENT_FEED_COUNTRY_MISMATCH");
  insist(
    sourceFeedJob.publishedAt === sourceJob.sourcePublishedAt && sourceFeedJob.publicationDateEstimated === false,
    "TALENT_FEED_SOURCE_DATE_MISMATCH",
  );
  insist(
    estimatedFeedJob.publicationDateEstimated === true && estimatedFeedJob.publicationDateSource === "FIRST_HARVEST",
    "TALENT_FEED_ESTIMATED_DATE_MISMATCH",
  );
  insist(
    sourceFeedJob.applicationReady === true && estimatedFeedJob.applicationReady === true,
    "TALENT_FEED_APPLICATION_READINESS_MISMATCH",
  );
  add("TALENT_AFRICA_FEED", "PASS", "Les deux offres produites par le processeur sont visibles dans l’API Talent Afrique avec pays, dates et canaux cohérents.", {
    visibleOffers: 2,
    countryCode,
    sourcePublicationDate: sourceFeedJob.publishedAt,
    estimatedPublicationSource: estimatedFeedJob.publicationDateSource,
  });

  const detailCases = [
    { job: sourceJob, expectedPublishedAt: String(sourceJob.sourcePublishedAt), estimated: false },
    { job: estimatedJob, expectedPublishedAt: String(estimatedCapture.discoveredAt), estimated: true },
  ];
  for (const item of detailCases) {
    const detailResponse = await fetch(
      new URL("/api/jobs/" + encodeURIComponent(item.job.id) + "?source=discovery", API_BASE),
      {
        headers: {
          Authorization: "Bearer " + signedIn.data.session.access_token,
          "x-real-ip": "127.0.0.1",
          "Cache-Control": "no-store",
        },
        signal: AbortSignal.timeout(30000),
      },
    );
    const detailBody = await detailResponse.json().catch(() => ({}));
    insist(
      detailResponse.status === 200 && detailBody.job?.id === item.job.id,
      "TALENT_OFFER_DETAIL_HTTP_" + detailResponse.status,
    );
    insist(detailBody.job.publishedAt === item.expectedPublishedAt, "TALENT_OFFER_DETAIL_PUBLICATION_DATE_MISMATCH");
    insist(
      detailBody.job.publicationDateEstimated === item.estimated,
      "TALENT_OFFER_DETAIL_ESTIMATED_FLAG_MISMATCH",
    );
  }
  add("TALENT_OFFER_DETAILS", "PASS", "Les détails des deux offres reprennent la même date de publication réelle ou estimée que le flux.");

  report.metrics = {
    ingest: ingest.body,
    processor: processed,
    captures: captures.length,
    jobs: jobs.length,
    pipelines: pipelines.length,
    sourceKey,
    talent: {
      countryCode: homeCountry || null,
      testedCountryCode: countryCode,
      africaFeedOffers: 2,
      offerDetailsChecked: 2,
    },
  };
}

try {
  await main();
} catch (error) {
  add("AFRICA_BULK_RECIPE_EXECUTION", "FAIL", error instanceof Error ? error.message : String(error));
} finally {
  if (admin && sourceKey) {
    try {
      const result = await cleanup(sourceKey);
      report.cleanupVerified = true;
      report.metrics.cleanup = result;
      add("BULK_CLEANUP", "PASS", "Objets synthétiques supprimés ; absence vérifiée dans les trois tables.", result);
      await Deno.remove(MANIFEST).catch(() => undefined);
    } catch (error) {
      report.cleanupVerified = false;
      add("BULK_CLEANUP", "FAIL", error instanceof Error ? error.message : String(error));
    }
  }
  const failed = report.checks.filter((x: Row) => x.status === "FAIL").length;
  const blocked = report.checks.filter((x: Row) => x.status === "BLOCKED").length;
  report.status = failed ? "FAIL" : blocked ? "PARTIAL" : "PASS";
  report.completedAt = new Date().toISOString();
  report.summary = {
    executed: report.checks.length,
    passed: report.checks.filter((x: Row) => x.status === "PASS").length,
    failed,
    blocked,
  };
  await saveJson(REPORT, report);
  console.log(JSON.stringify({
    status: report.status,
    report: REPORT,
    summary: report.summary,
    projectRef: REF,
    cleanupVerified: report.cleanupVerified,
    productionModified: false,
    externalActions: false,
  }, null, 2));
}
