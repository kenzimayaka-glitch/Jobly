import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(process.argv[2] || process.env.JOBLY_SOURCE_ROOT || path.join(process.env.USERPROFILE || "", "Jobly"));
const ARTIFACTS = path.join(ROOT, "artifacts", "e2e");
const SERVER_REPORT = path.join(ARTIFACTS, "parallel-runtime-server.json");
const PID_PATH = path.join(ARTIFACTS, "parallel-runtime-server.pid.json");
const STOP_REPORT = path.join(ARTIFACTS, "parallel-runtime-server-stop.json");
const GLOBAL_JSON = path.join(ARTIFACTS, "global-e2e-report.json");
const GLOBAL_MD = path.join(ARTIFACTS, "global-e2e-report.md");
const STATIC_REPORT = path.join(ARTIFACTS, "bulk", "summary.json");
const RUNTIME_LOTS = [
  ["LOT-02", "Talent", "e2e/runtime-lot02-readonly.mjs", path.join(ARTIFACTS, "lot2-runtime-readonly.json")],
  ["LOT-03", "Recruteur / Recruitment360", "e2e/runtime-lot03-readonly.mjs", path.join(ARTIFACTS, "lot3-runtime-readonly.json")],
  ["LOT-04", "Mission Afrique", "e2e/runtime-lot04-readonly.mjs", path.join(ARTIFACTS, "lot4-runtime-readonly.json")],
];

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

function safeStaticEnv() {
  const env = { ...process.env };
  const blocked = /(SUPABASE|DATABASE_URL|DIRECT_URL|POSTGRES|SERVICE_ROLE|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|RESEND|SMTP|SENDGRID|TWILIO|STRIPE|PAYPAL|MOBILE_MONEY|CLIENT_SECRET|API_KEY)/i;
  for (const key of Object.keys(env)) if (blocked.test(key)) delete env[key];
  env.E2E_BULK_CONCURRENCY = "3";
  return env;
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; }
}

function runNode(id, file, args = [], options = {}) {
  const logPath = path.join(ARTIFACTS, id + ".log");
  const started = performance.now();
  const timeoutMs = options.timeoutMs ?? 300000;
  return new Promise((resolve) => {
    let output = "";
    let spawnError = null;
    let timedOut = false;
    const child = spawn(process.execPath, [file, ...args], {
      cwd: ROOT,
      env: options.env || process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const collect = (chunk) => {
      const value = chunk.toString();
      output += value;
      if (output.length > 200000) output = output.slice(-200000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", (error) => { spawnError = error.message; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    child.once("close", async (code, signal) => {
      clearTimeout(timer);
      const result = {
        id, file, exitCode: typeof code === "number" ? code : 1,
        signal: signal || null, spawnError, timedOut,
        durationMs: Math.round(performance.now() - started),
        outputTail: output.split(/\r?\n/).slice(-12).join("\n").slice(-1800),
        log: path.relative(ROOT, logPath).split(path.sep).join("/"),
      };
      await writeFile(logPath, output, "utf8").catch(() => undefined);
      resolve(result);
    });
  });
}

async function getPublicHome(baseURL) {
  const started = performance.now();
  try {
    const response = await fetch(baseURL + "/", {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const html = await response.text();
    return {
      id: "PUBLIC_HOME_HTML",
      status: response.status === 200 && /text\/html/i.test(response.headers.get("content-type") || "") && html.length > 500
        ? "PASS" : "FAIL",
      httpStatus: response.status,
      contentType: response.headers.get("content-type") || null,
      htmlBytes: Buffer.byteLength(html),
      durationMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      id: "PUBLIC_HOME_HTML", status: "FAIL", httpStatus: null,
      error: error instanceof Error ? error.name : "FETCH_FAILED",
      durationMs: Math.round(performance.now() - started),
    };
  }
}

function markdown(report) {
  const lines = [
    "# Jobly — balayage global rapide",
    "",
    "- Début : " + report.startedAt,
    "- Fin : " + report.completedAt,
    "- Commit : " + (report.commit || "non déterminé"),
    "- Environnement : JOBLY-E2E (ofqqrryamslxoqkklraw)",
    "- Durée totale : " + (report.durationMs / 1000).toFixed(1) + " s",
    "- Verdict : **" + report.status + "**",
    "",
    "## Résultats",
    "",
    "| Périmètre | Statut | Durée / résultat |",
    "|---|---|---|",
    "| Tests statiques transversaux | " + report.static.status + " | " + report.static.passedGroups + "/" + report.static.totalGroups + " groupes ; " + report.static.testFileCount + " fichiers |",
    "| Build et démarrage serveur E2E | " + report.server.status + " | " + (report.server.durationMs / 1000).toFixed(1) + " s |",
    "| Accueil public (HTTP) | " + report.userInterface.status + " | HTTP " + (report.userInterface.httpStatus ?? "—") + " ; " + (report.userInterface.htmlBytes ?? 0) + " octets |",
    "| Arrêt serveur | " + report.serverStop.status + " | " + (report.serverStop.detail || "—") + " |",
    "",
    "### Contrôles runtime par module",
    "",
    "| Module | Statut | PASS | FAIL | BLOCKED |",
    "|---|---|---:|---:|---:|",
  ];
  for (const item of report.runtimeLots) {
    lines.push("| " + item.label + " | **" + item.status + "** | " + item.passed + " | " + item.failed + " | " + item.blocked + " |");
  }
  lines.push(
    "",
    "## Détection et correction",
    "",
    "Les lots indépendants sont exécutés en parallèle. Un échec dans un lot n'interrompt pas les autres. Les journaux et rapports par lot sont conservés pour corriger uniquement les points en échec puis relancer les contrôles impactés.",
    "",
    "## Limites de couverture",
    "",
    "- Les suites transversales couvrent les contrats, règles métier et régressions statiques déjà présents dans le dépôt.",
    "- Les contrôles runtime de cette première passe couvrent l'accueil HTTP, Talent, Recruteur/Recruitment360 et la lecture Afrique.",
    "- La navigation interactive Playwright, les écritures métier, les transactions de paiement sandbox, les workflows Mobility/Event/J'IA et les tests appareil Android ne sont pas déclarés PASS par ce balayage.",
    "- Les scénarios Auth utilisent des comptes synthétiques JOBLY-E2E ; des métadonnées de session/appareil peuvent évoluer. Aucune donnée métier distante n'est écrite.",
    "",
    "## Sources de preuve",
    "",
    "- Tests statiques : artifacts/e2e/bulk/summary.json",
    "- Serveur : artifacts/e2e/parallel-runtime-server.json et *.log",
    "- Lots runtime : artifacts/e2e/lot2-runtime-readonly.json, lot3-runtime-readonly.json, lot4-runtime-readonly.json",
    "- Processus : artifacts/e2e/global-e2e-process.log",
    "",
  );
  return lines.join("\n");
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true });
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const timer = performance.now();

  console.log("[DÉPART] Balayage global Jobly — une seule exécution.");
  console.log("[PARALLÈLE] Tests statiques transversaux + préparation du runtime JOBLY-E2E.");

  const [staticRun, serverRun] = await Promise.all([
    runNode("global-static-sweep", "scripts/e2e-bulk-runner.mjs", [], {
      timeoutMs: 360000,
      env: safeStaticEnv(),
    }),
    runNode("global-server-start", "e2e/start-readonly-runtime-server.mjs", [SOURCE_ROOT], {
      timeoutMs: 900000,
    }),
  ]);

  const staticSummary = await readJson(STATIC_REPORT);
  const serverReport = await readJson(SERVER_REPORT);
  const serverReady = serverRun.exitCode === 0 && serverReport?.status === "PASS" &&
    serverReport.projectRef === "ofqqrryamslxoqkklraw" &&
    serverReport.baseURL === "http://127.0.0.1:3217" &&
    serverReport.anonymousProtectedApiStatus === 401;

  console.log("[STATIC] " + (staticSummary ? staticSummary.passedGroups + "/" + staticSummary.totalGroups + " groupes réussis" : "rapport absent"));
  console.log("[SERVEUR] " + (serverReady ? "PASS" : "BLOCKED/FAIL"));

  let home = { id: "PUBLIC_HOME_HTML", status: "BLOCKED", httpStatus: null, durationMs: 0 };
  let runtimeResults = [];
  let stopResult = { exitCode: 0, durationMs: 0, log: null };
  let stopDetail = "Serveur non démarré ; arrêt non nécessaire.";
  let stopStatus = "NOT_REQUIRED";

  if (serverReady) {
    home = await getPublicHome(serverReport.baseURL);
    console.log("[INTERFACE] Accueil public " + home.status + " (HTTP " + (home.httpStatus ?? "—") + ").");
    console.log("[RUNTIME] Exécution simultanée Talent, Recruteur et Afrique.");
    runtimeResults = await Promise.all(RUNTIME_LOTS.map(([id, label, file]) =>
      runNode("global-" + id.toLowerCase(), file, [SOURCE_ROOT], { timeoutMs: 240000 })
        .then(async (processResult) => ({
          id, label, process: processResult,
          report: await readJson(path.join(ARTIFACTS, id === "LOT-02" ? "lot2-runtime-readonly.json" :
            id === "LOT-03" ? "lot3-runtime-readonly.json" : "lot4-runtime-readonly.json")),
        }))
    ));
  } else {
    runtimeResults = RUNTIME_LOTS.map(([id, label]) => ({
      id, label, process: { exitCode: 2, durationMs: 0, log: null },
      report: { status: "BLOCKED", summary: { passed: 0, failed: 0, blocked: 1 } },
    }));
  }

  // Only stop a server process created by this run; never kill by process name.
  let shouldStop = false;
  const pidMeta = await readJson(PID_PATH);
  if (pidMeta?.environment === "JOBLY-E2E" && pidMeta?.projectRef === "ofqqrryamslxoqkklraw" &&
      pidMeta?.baseURL === "http://127.0.0.1:3217" && Number.isInteger(pidMeta.pid) &&
      Date.parse(pidMeta.startedAt || "") >= startedAtDate.getTime() - 1000) {
    shouldStop = true;
  }
  if (shouldStop) {
    stopResult = await runNode("global-server-stop", "e2e/stop-readonly-runtime-server.mjs", [], { timeoutMs: 30000 });
    const stopReport = await readJson(STOP_REPORT);
    stopStatus = stopResult.exitCode === 0 ? "PASS" : "FAIL";
    stopDetail = stopReport?.stopped === true ? "PID exact du serveur JOBLY-E2E arrêté." :
      stopResult.exitCode === 0 ? "Le processus enregistré était déjà arrêté." : "Arrêt refusé ; voir le journal.";
  }

  const runtimeLots = runtimeResults.map((item) => {
    const summary = item.report?.summary || {};
    const status = item.process.exitCode !== 0 && !item.report ? "BLOCKED" : item.report?.status || "BLOCKED";
    return {
      id: item.id, label: item.label, status,
      passed: Number(summary.passed ?? 0),
      failed: Number(summary.failed ?? 0),
      blocked: Number(summary.blocked ?? 0),
      durationMs: item.process.durationMs,
      report: item.report?.reportPath || null,
      log: item.process.log,
      error: item.process.outputTail || null,
    };
  });

  const staticStatus = !staticSummary ? (staticRun.exitCode === 0 ? "PARTIAL" : "FAIL") :
    staticSummary.failedGroups > 0 ? "FAIL" :
    staticSummary.passedGroups === staticSummary.totalGroups ? "PASS" : "PARTIAL";
  const runtimeFail = runtimeLots.some((item) => item.status === "FAIL");
  const hardFailure = staticStatus === "FAIL" || (!serverReady && serverRun.exitCode !== 0) ||
    home.status === "FAIL" || runtimeFail || stopStatus === "FAIL";
  const report = {
    schemaVersion: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    commit: serverReport?.commit || null,
    environment: "JOBLY-E2E",
    projectRef: "ofqqrryamslxoqkklraw",
    durationMs: Math.round(performance.now() - timer),
    status: hardFailure ? "FAIL" : "PARTIAL",
    static: {
      status: staticStatus,
      totalGroups: Number(staticSummary?.totalGroups ?? 0),
      passedGroups: Number(staticSummary?.passedGroups ?? 0),
      failedGroups: Number(staticSummary?.failedGroups ?? 0),
      testFileCount: Number(staticSummary?.testFileCount ?? 0),
      durationMs: staticRun.durationMs,
      report: "artifacts/e2e/bulk/summary.json",
      log: staticRun.log,
      groups: staticSummary?.results ?? [],
    },
    server: {
      status: serverReady ? "PASS" : serverRun.exitCode !== 0 ? "FAIL" : "PARTIAL",
      durationMs: serverRun.durationMs,
      report: serverReport,
      log: serverRun.log,
      error: serverRun.outputTail || null,
    },
    userInterface: home,
    runtimeLots,
    serverStop: { status: stopStatus, detail: stopDetail, log: stopResult.log },
    coverage: {
      runtime: ["Accueil HTTP", "Talent", "Recruteur / Recruitment360", "Mission Afrique (lecture seule)"],
      staticOnly: ["Authentification et sécurité", "Mobility", "J'IA", "Paiements et Mobile Money", "Event Core", "Community / Bons Plans / Campus", "PWA / Android"],
      notValidated: ["Parcours interactifs navigateur complets", "Écritures métier", "Paiement opérateur réel", "Collecte réelle multi-sources", "Validation Android sur appareil"],
    },
    safety: {
      remoteBusinessDataMayBeModified: false,
      externalActions: false,
      remoteAuthDeviceStateMayBeModified: true,
      productionProjectUsed: false,
      mainBranchChanged: false,
      deploymentPerformed: false,
    },
  };
  await writeFile(GLOBAL_JSON, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  await writeFile(GLOBAL_MD, markdown(report), "utf8");

  console.log("");
  console.log("BALAYAGE GLOBAL : " + report.status);
  console.log("Statique : " + report.static.passedGroups + "/" + report.static.totalGroups + " groupes PASS.");
  console.log("Runtime : " + runtimeLots.map((item) => item.id + "=" + item.status).join(" | "));
  console.log("Durée : " + (report.durationMs / 1000).toFixed(1) + " s.");
  console.log("Rapport unique : artifacts/e2e/global-e2e-report.md");
  if (hardFailure) process.exitCode = 1;
}

main().catch(async (error) => {
  const minimal = {
    createdAt: new Date().toISOString(),
    status: "FAIL",
    environment: "JOBLY-E2E",
    projectRef: "ofqqrryamslxoqkklraw",
    reason: error instanceof Error ? error.message.slice(0, 240) : "GLOBAL_RECIPE_FAILED",
    remoteBusinessDataMayBeModified: false,
    secretsPrinted: false,
  };
  await mkdir(ARTIFACTS, { recursive: true }).catch(() => undefined);
  await writeFile(GLOBAL_JSON, JSON.stringify(minimal, null, 2) + "\n", { encoding: "utf8", mode: 0o600 }).catch(() => undefined);
  console.error("[ÉCHEC ORCHESTRATEUR] " + minimal.reason);
  process.exitCode = 1;
});
