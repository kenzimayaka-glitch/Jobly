import path from "node:path";
import {
  BASE_URL, addCheck, createReport, loadFixtures, loadRuntimeConfig,
  localGet, saveReport, signInFixture,
} from "./runtime-readonly-common.mjs";

const reportPath = path.resolve("artifacts/e2e/lot3-runtime-readonly.json");
const report = createReport("lot3-recruiter-runtime-readonly", reportPath);

try {
  const config = await loadRuntimeConfig(process.argv[2]);
  const { document } = await loadFixtures(config.sourceRoot);
  const health = await fetch(BASE_URL + "/api/profile", { signal: AbortSignal.timeout(3000), cache: "no-store" });
  if (health.status !== 401) throw new Error("LOCAL_SERVER_NOT_READY_EXPECTED_401");
  addCheck(report, "LOCAL_SERVER_LOOPBACK", "PASS", health.status, "Serveur local prêt ; API protégée sans jeton.");

  const session = await signInFixture(config, document, "recruiter", "RECRUITER");
  addCheck(report, "RECRUITER_FIXTURE_AUTH", "PASS", 200, "Session Auth JOBLY-E2E et rôle RECRUITER confirmés.");

  const checks = [
    ["RECRUITER_PROFILE_READ", "/api/recruiter/profile"],
    ["RECRUITER_JOBS_READ", "/api/recruiter/jobs"],
    ["RECRUITER_APPLICATIONS_PASSIVE_READ", "/api/recruiter/applications?markViewed=0"],
    ["RECRUITER_TALENTS_READ", "/api/recruiter/talents"],
    ["RECRUITMENT360_APPLICATIONS_READ", "/api/recruitment360/applications"],
    ["RECRUITMENT360_DECISIONS_READ", "/api/recruitment360/decisions"],
  ];
  const metrics = {};
  for (const [id, route] of checks) {
    const result = await localGet(route, session.token);
    const ok = result.status === 200;
    addCheck(report, id, ok ? "PASS" : "FAIL", result.status, "GET lecture seule ; aucun statut de candidature marqué comme vu.");
    if (id === "RECRUITER_JOBS_READ") metrics.ownedRecruiterJobs = Array.isArray(result.payload?.jobs) ? result.payload.jobs.length : null;
    if (id === "RECRUITER_APPLICATIONS_PASSIVE_READ") metrics.ownedApplications = Array.isArray(result.payload?.applications) ? result.payload.applications.length : null;
    if (id === "RECRUITER_TALENTS_READ") metrics.publicTalentsAvailable = Number(result.payload?.count) || 0;
    if (id === "RECRUITMENT360_APPLICATIONS_READ") metrics.recruitment360Applications = Array.isArray(result.payload?.applications) ? result.payload.applications.length : null;
    if (id === "RECRUITMENT360_DECISIONS_READ") metrics.recruitment360Candidates = Array.isArray(result.payload?.candidates) ? result.payload.candidates.length : null;
  }

  const unowned = await localGet("/api/recruitment360/applications?recruitmentId=00000000-0000-4000-8000-000000000001", session.token);
  addCheck(report, "RECRUITMENT360_DENY_UNOWNED_RECRUITMENT", unowned.status === 403 ? "PASS" : "FAIL", unowned.status,
    "Un recrutement hors rôles autorisés doit être refusé avant lecture des candidatures.");
  metrics.recruiterJobs = metrics.ownedRecruiterJobs;
  report.metrics = metrics;
} catch (error) {
  addCheck(report, "LOT03_RUNTIME_EXECUTION", "FAIL", null, error instanceof Error ? error.message : "RUNTIME_ERROR");
}

const status = await saveReport(report, reportPath);
console.log(JSON.stringify({ status, report: reportPath, summary: report.summary, remoteBusinessDataMayBeModified: false, remoteAuthDeviceStateMayBeModified: true }, null, 2));
if (status !== "PASS") process.exitCode = 1;
