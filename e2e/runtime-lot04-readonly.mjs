import path from "node:path";
import {
  PROJECT_REF, SUPABASE_URL, addCheck, countsBy, createReport,
  loadRuntimeConfig, saveReport,
} from "./runtime-readonly-common.mjs";

const reportPath = path.resolve("artifacts/e2e/lot4-runtime-readonly.json");
const report = createReport("lot4-africa-runtime-readonly", reportPath);
report.remoteAuthDeviceStateMayBeModified = false;
const PAGE_SIZE = 1000;
const MAX_PAGES = 10;

async function readTable(secretKey, table, columns) {
  const rows = [];
  let offset = 0;
  let total = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL("/rest/v1/" + table, SUPABASE_URL);
    url.searchParams.set("select", columns);
    url.searchParams.set("order", "id.asc");
    url.searchParams.set("limit", String(PAGE_SIZE));
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: secretKey,
        Prefer: "count=exact",
        Range: offset + "-" + (offset + PAGE_SIZE - 1),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const raw = await response.text();
    if (response.status !== 200 && response.status !== 206) {
      let code = "HTTP_" + response.status;
      try { code = JSON.parse(raw)?.code || code; } catch {}
      throw new Error(table + "_READ_" + code);
    }
    const batch = JSON.parse(raw || "[]");
    if (!Array.isArray(batch)) throw new Error(table + "_INVALID_PAYLOAD");
    rows.push(...batch);
    const contentRange = response.headers.get("content-range") || "";
    const match = contentRange.match(/\/(\d+|\*)$/);
    if (match && match[1] !== "*") total = Number(match[1]);
    offset += batch.length;
    if (batch.length < PAGE_SIZE || total !== null && offset >= total) {
      return { rows, total: total ?? rows.length, truncated: false };
    }
    if (offset >= PAGE_SIZE * MAX_PAGES) return { rows, total, truncated: true };
  }
  return { rows, total, truncated: true };
}

function classifyFreshness(row, now = new Date()) {
  const sourceDate = row.publishedAt ? new Date(row.publishedAt) : null;
  const harvestDate = row.discoveredAt ? new Date(row.discoveredAt) : null;
  const reference = sourceDate && Number.isFinite(sourceDate.getTime()) ? sourceDate
    : harvestDate && Number.isFinite(harvestDate.getTime()) ? harvestDate : null;
  if (!reference) return "DATE_MISSING";
  if (reference.getTime() > now.getTime()) return "DATE_FUTURE";
  if (row.deadline && Number.isFinite(new Date(row.deadline).getTime()) && new Date(row.deadline).getTime() < now.getTime()) return "DEADLINE_EXPIRED";
  const expires = new Date(reference);
  if (sourceDate && Number.isFinite(sourceDate.getTime())) {
    const month = expires.getUTCMonth() + 2;
    const year = expires.getUTCFullYear() + Math.floor(month / 12);
    const monthIndex = month % 12;
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    expires.setUTCFullYear(year, monthIndex, Math.min(expires.getUTCDate(), lastDay));
  } else {
    expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  return now.getTime() > expires.getTime() ? sourceDate ? "SOURCE_DATE_OVER_2_MONTHS" : "ESTIMATED_DATE_OVER_30_DAYS" : "FRESH";
}

try {
  const config = await loadRuntimeConfig(process.argv[2]);
  if (config.url !== SUPABASE_URL) throw new Error("SUPABASE_PROJECT_REF_MISMATCH");
  addCheck(report, "JOBLY_E2E_TARGET", "PASS", 200, "Lecture REST limitée au projet JOBLY-E2E confirmé.");

  const [captures, pipelines] = await Promise.all([
    readTable(config.secretKey, "JobHarvestCapture",
      "id,sourceKey,status,countryCode,rejectionCode,publishedAt,deadline,discoveredAt,processedAt,jobId"),
    readTable(config.secretKey, "JobOfferPipeline",
      "id,sourceKey,status,countryCode,rejectionCode,qualityScore,createdAt,processedAt,jobId"),
  ]);

  addCheck(report, "JOB_HARVEST_CAPTURE_READ", captures.truncated ? "BLOCKED" : "PASS", 200,
    captures.truncated ? "Lecture bornée à 10000 captures ; le comptage complet exige une campagne paginée plus longue." : "Captures lues intégralement par pages ; aucune mise à jour ni suppression.");
  addCheck(report, "JOB_OFFER_PIPELINE_READ", pipelines.truncated ? "BLOCKED" : "PASS", 200,
    pipelines.truncated ? "Lecture bornée à 10000 lignes pipeline ; le comptage complet exige une campagne paginée plus longue." : "Pipeline canonique lu intégralement par pages ; aucune mise à jour ni suppression.");
  const freshness = {};
  for (const row of captures.rows) {
    const category = classifyFreshness(row);
    freshness[category] = (freshness[category] || 0) + 1;
  }
  addCheck(report, "AFRICA_FRESHNESS_AUDIT", captures.truncated ? "BLOCKED" : "PASS", 200,
    captures.truncated ? "Analyse de fraîcheur partielle car plus de 10000 captures sont présentes." : "Fraîcheur recalculée en mémoire à partir des dates capturées ; aucune écriture.");

  report.metrics = {
    captures: {
      rowsObserved: captures.rows.length,
      totalRows: captures.total,
      truncated: captures.truncated,
      byStatus: countsBy(captures.rows, "status"),
      bySource: countsBy(captures.rows, "sourceKey"),
      byCountry: countsBy(captures.rows, "countryCode"),
      byRejectionCode: countsBy(captures.rows, "rejectionCode"),
      freshness,
    },
    pipelines: {
      rowsObserved: pipelines.rows.length,
      totalRows: pipelines.total,
      truncated: pipelines.truncated,
      byStatus: countsBy(pipelines.rows, "status"),
      bySource: countsBy(pipelines.rows, "sourceKey"),
      byCountry: countsBy(pipelines.rows, "countryCode"),
      byRejectionCode: countsBy(pipelines.rows, "rejectionCode"),
    },
    readOnly: true,
    projectRef: PROJECT_REF,
  };
} catch (error) {
  addCheck(report, "LOT04_RUNTIME_EXECUTION", "FAIL", null, error instanceof Error ? error.message : "RUNTIME_ERROR");
}

const status = await saveReport(report, reportPath);
console.log(JSON.stringify({
  status,
  report: reportPath,
  summary: report.summary,
  metrics: report.metrics ? {
    capturesObserved: report.metrics.captures?.rowsObserved,
    capturesTotal: report.metrics.captures?.totalRows,
    pipelineObserved: report.metrics.pipelines?.rowsObserved,
    pipelineTotal: report.metrics.pipelines?.totalRows,
    truncated: Boolean(report.metrics.captures?.truncated || report.metrics.pipelines?.truncated),
  } : null,
  remoteBusinessDataMayBeModified: false,
  remoteAuthDeviceStateMayBeModified: false,
  externalActions: false,
}, null, 2));
if (status !== "PASS") process.exitCode = 1;
