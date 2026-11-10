import path from "node:path";
import {
  BASE_URL, addCheck, createReport, loadFixtures, loadRuntimeConfig,
  localGet, saveReport, signInFixture,
} from "./runtime-readonly-common.mjs";

const reportPath = path.resolve("artifacts/e2e/lot2-runtime-readonly.json");
const report = createReport("lot2-talent-runtime-readonly", reportPath);

try {
  const config = await loadRuntimeConfig(process.argv[2]);
  const { document } = await loadFixtures(config.sourceRoot);
  const health = await fetch(BASE_URL + "/api/profile", { signal: AbortSignal.timeout(3000), cache: "no-store" });
  if (health.status !== 401) throw new Error("LOCAL_SERVER_NOT_READY_EXPECTED_401");
  addCheck(report, "LOCAL_SERVER_LOOPBACK", "PASS", health.status, "Serveur local prêt ; API protégée sans jeton.");

  const session = await signInFixture(config, document, "talent", "TALENT");
  addCheck(report, "TALENT_FIXTURE_AUTH", "PASS", 200, "Session Auth JOBLY-E2E et rôle TALENT confirmés.");

  const profile = await localGet("/api/profile", session.token);
  addCheck(report, "TALENT_PROFILE_READ", profile.status === 200 && !!profile.payload?.profile, profile.status === 200 && !!profile.payload?.profile ? "PASS" : "FAIL", profile.status, "Lecture du profil Talent.");
  const applications = await localGet("/api/applications", session.token);
  const applicationsOk = applications.status === 200 && Array.isArray(applications.payload?.applications) && !!applications.payload?.counters;
  addCheck(report, "TALENT_APPLICATIONS_READ", applicationsOk ? "PASS" : "FAIL", applications.status, "Lecture des candidatures et compteurs sans mutation.");

  const localFeed = await localGet("/api/jobs?scope=local&limit=10&page=1", session.token);
  const localOk = localFeed.status === 200 && Array.isArray(localFeed.payload?.jobs) &&
    Number.isFinite(localFeed.payload?.totalAvailable) && localFeed.payload.totalAvailable >= localFeed.payload.jobs.length &&
    localFeed.payload?.market?.scope === "local";
  addCheck(report, "TALENT_LOCAL_OFFERS_READ", localOk ? "PASS" : "FAIL", localFeed.status, "Flux local : structure, compteur et périmètre conformes.");
  const africaFeed = await localGet("/api/jobs?scope=africa&limit=10&page=1", session.token);
  const africaOk = africaFeed.status === 200 && Array.isArray(africaFeed.payload?.jobs) &&
    Number.isFinite(africaFeed.payload?.totalAvailable) && africaFeed.payload.totalAvailable >= africaFeed.payload.jobs.length &&
    africaFeed.payload?.market?.scope === "africa";
  addCheck(report, "TALENT_AFRICA_OFFERS_READ", africaOk ? "PASS" : "FAIL", africaFeed.status, "Flux Afrique : structure, compteur et périmètre conformes.");

  const candidate = [...(localFeed.payload?.jobs || []), ...(africaFeed.payload?.jobs || [])]
    .find((job) => typeof job?.id === "string" && ["discovery", "recruiter"].includes(job.source));
  if (candidate && localOk && africaOk) {
    const detail = await localGet("/api/jobs/" + encodeURIComponent(candidate.id) + "?source=" + encodeURIComponent(candidate.source), session.token);
    const detailOk = detail.status === 200 && detail.payload?.source === candidate.source &&
      detail.payload?.job?.id === candidate.id && !!detail.payload?.job?.title;
    addCheck(report, "TALENT_OFFER_DETAIL_READ", detailOk ? "PASS" : "FAIL", detail.status, "Le détail correspond à l'offre sélectionnée dans le flux.");
    const query = String(candidate.title || "").split(/\s+/).find((word) => word.length >= 3)?.slice(0, 24);
    if (query) {
      const search = await localGet("/api/jobs?scope=" + encodeURIComponent(candidate.source === "discovery" ? "africa" : "local") + "&limit=10&q=" + encodeURIComponent(query), session.token);
      const searchOk = search.status === 200 && Array.isArray(search.payload?.jobs) &&
        Number.isFinite(search.payload?.totalAvailable) &&
        search.payload.jobs.every((job) => String(job.title || "").toLowerCase().includes(query.toLowerCase()) ||
          String(job.company?.name || "").toLowerCase().includes(query.toLowerCase()));
      addCheck(report, "TALENT_OFFER_SEARCH_READ", searchOk ? "PASS" : "FAIL", search.status, "Recherche par titre/entreprise et cohérence des résultats.");
    } else {
      addCheck(report, "TALENT_OFFER_SEARCH_READ", "BLOCKED", null, "Aucun terme de recherche exploitable dans les offres retournées.");
    }
  } else {
    addCheck(report, "TALENT_OFFER_DETAIL_READ", "BLOCKED", null, "Aucune offre exploitable dans les flux ; détail non testable.");
    addCheck(report, "TALENT_OFFER_SEARCH_READ", "BLOCKED", null, "Aucune offre exploitable pour initialiser la recherche.");
  }

  const cv = await localGet("/api/talent/cv/original", session.token);
  const cvOk = cv.status === 404 && cv.payload?.error === "CV_NOT_FOUND" ||
    cv.status === 200 && cv.payload?.ok === true && cv.payload?.expiresIn === 60 && typeof cv.payload?.url === "string";
  addCheck(report, "TALENT_CV_ORIGINAL_READ", cvOk ? "PASS" : "FAIL", cv.status, cv.status === 200 ? "Lien signé privé 60 secondes créé ; fichier non téléchargé." : "Absence du CV original gérée proprement.");
  const journey = await localGet("/api/career-journey", session.token);
  const journeyOk = journey.status === 200 && journey.payload?.ok === true &&
    Array.isArray(journey.payload?.evidence) && Array.isArray(journey.payload?.portfolio);
  addCheck(report, "TALENT_CAREER_JOURNEY_READ", journeyOk ? "PASS" : "FAIL", journey.status, "Lecture Career Journey, preuves et portfolio sans création.");

  report.metrics = {
    localOffersAvailable: Number(localFeed.payload?.totalAvailable) || 0,
    africaOffersAvailable: Number(africaFeed.payload?.totalAvailable) || 0,
    applicationsExisting: Array.isArray(applications.payload?.applications) ? applications.payload.applications.length : null,
    cvOriginalPresent: cv.status === 200,
    offerDetailTested: Boolean(candidate),
  };
} catch (error) {
  addCheck(report, "LOT02_RUNTIME_EXECUTION", "FAIL", null, error instanceof Error ? error.message : "RUNTIME_ERROR");
}

const status = await saveReport(report, reportPath);
console.log(JSON.stringify({ status, report: reportPath, summary: report.summary, remoteBusinessDataMayBeModified: false, remoteAuthDeviceStateMayBeModified: true }, null, 2));
if (status !== "PASS") process.exitCode = 1;
