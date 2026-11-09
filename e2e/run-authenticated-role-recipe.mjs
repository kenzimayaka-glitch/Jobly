import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const SOURCE_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : "";
const RUN_MODE = process.argv[3] || "api";
const PLAYWRIGHT_VERSION = "1.65.0";
if (!["api", "--browser-only"].includes(RUN_MODE)) {
  throw new Error("Mode invalide. Utiliser api (défaut) ou --browser-only.");
}
const PROJECT_REF = "ofqqrryamslxoqkklraw";
const SUPABASE_URL = "https://" + PROJECT_REF + ".supabase.co";
const PORT = "3217";
const BASE_URL = "http://127.0.0.1:" + PORT;
const NEXT_CLI = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const REPORT_PATH = path.join(ROOT, "artifacts", "e2e", "authenticated-role-runner-summary.json");

async function exists(file) { try { await access(file); return true; } catch { return false; } }

async function loadSourceEnvironment(sourceRoot) {
  // Do not let inherited Windows/IDE values (including blank values) shadow
  // the project's own E2E environment. Values are reloaded from source files.
  const managedKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const key of managedKeys) delete process.env[key];
  process.env.NODE_ENV = "production";

  // Resolve @next/env from Next.js itself so no extra dependency or lockfile
  // change is needed. This is the same dotenv loader used by the Next runtime.
  const nextPackagePath = require.resolve("next/package.json");
  const nextRequire = createRequire(nextPackagePath);
  const nextEnvPath = nextRequire.resolve("@next/env");
  const nextEnvRequire = createRequire(nextEnvPath);
  const { loadEnvConfig } = nextRequire("@next/env");
  const dotenv = nextEnvRequire("dotenv");
  const loaded = loadEnvConfig(sourceRoot, false, { info() {}, error() {} }, true);

  // Prefer the first non-empty value in Next's documented file precedence.
  // An empty key in a higher-priority file must not hide a valid .env.local value.
  const fileValues = {};
  const sourceFiles = [];
  for (const file of loaded.loadedEnvFiles || []) {
    sourceFiles.push(path.basename(file.path));
    const parsed = file.env && Object.keys(file.env).length
      ? file.env
      : dotenv.parse(file.contents || "");
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim() !== "" && !Object.prototype.hasOwnProperty.call(fileValues, key)) {
        fileValues[key] = value;
      }
    }
  }

  // Preserve the existing optional E2E override file, parsed by the same
  // dotenv implementation rather than a hand-written regular expression.
  const e2eEnvPath = path.join(sourceRoot, ".env.e2e.local");
  if (await exists(e2eEnvPath)) {
    const parsed = dotenv.parse(await readFile(e2eEnvPath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim() !== "") fileValues[key] = value;
    }
    sourceFiles.push(".env.e2e.local");
  }

  const env = { ...loaded.combinedEnv, ...fileValues };
  for (const key of managedKeys) {
    if (Object.prototype.hasOwnProperty.call(fileValues, key)) process.env[key] = fileValues[key];
  }
  return { env, files: [...new Set(sourceFiles)] };
}
function runGit(args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : "";
}
function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: "inherit", shell: process.platform === "win32" && (command === "pnpm" || command === "npm.cmd"), windowsHide: true });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

async function runCommandCaptured(command, args, env, logPath) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32" && (command === "pnpm" || command === "npm.cmd"),
      windowsHide: true,
    });
    const chunks = [];
    let spawnError = null;
    const capture = (chunk) => chunks.push(Buffer.from(chunk));
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.once("error", (error) => { spawnError = error; });
    child.once("close", async (code) => {
      const output = Buffer.concat(chunks).toString("utf8");
      await mkdir(path.dirname(logPath), { recursive: true });
      await writeFile(logPath, output, { encoding: "utf8", mode: 0o600 });
      if (spawnError && code === null) {
        resolve({ exitCode: 1, spawnError: spawnError.code || spawnError.name, logPath, output });
        return;
      }
      resolve({ exitCode: code ?? 1, spawnError: spawnError ? (spawnError.code || spawnError.name) : null, logPath, output });
    });
  });
}

async function ensurePlaywright(env) {
  const modulePath = path.join(ROOT, ".e2e-tools", "node_modules", "playwright", "index.mjs");
  const cliPath = path.join(ROOT, ".e2e-tools", "node_modules", "playwright", "cli.js");
  if (!(await exists(modulePath))) {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const installCode = await runCommand(npm, [
      "install", "--prefix", ".e2e-tools", "--no-save", "--no-package-lock",
      "playwright@" + PLAYWRIGHT_VERSION,
    ], env);
    if (installCode !== 0 || !(await exists(modulePath))) {
      throw new Error("Installation isolée de Playwright impossible ; aucun smoke navigateur lancé.");
    }
  }
  if (!(await exists(cliPath))) {
    throw new Error("CLI Playwright absent après installation ; smoke navigateur non lancé.");
  }
  const browserCode = await runCommand(process.execPath, [cliPath, "install", "chromium"], env);
  if (browserCode !== 0) {
    throw new Error("Installation/vérification de Chromium Playwright impossible.");
  }
  return modulePath;
}
function stopServer(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}
async function waitForServer(child) {
  let lastHttpStatus = null;
  let lastNetworkError = null;
  let processErrorCode = null;
  child.once("error", (error) => { processErrorCode = error?.code || "SPAWN_ERROR"; });
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    if (processErrorCode || child.exitCode !== null || child.signalCode !== null) {
      return {
        ready: false, attempts: attempt, lastHttpStatus, lastNetworkError,
        processExitCode: child.exitCode, processSignal: child.signalCode, processErrorCode,
      };
    }
    try {
      const response = await fetch(BASE_URL + "/api/profile", { signal: AbortSignal.timeout(2500), cache: "no-store" });
      lastHttpStatus = response.status;
      if (response.status === 401) {
        await response.body?.cancel().catch(() => undefined);
        return {
          ready: true, attempts: attempt, lastHttpStatus, lastNetworkError: null,
          processExitCode: child.exitCode, processSignal: child.signalCode, processErrorCode,
        };
      }
      await response.body?.cancel().catch(() => undefined);
      if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
        return {
          ready: false, attempts: attempt, lastHttpStatus, lastNetworkError: null,
          processExitCode: child.exitCode, processSignal: child.signalCode, processErrorCode,
        };
      }
    } catch (error) {
      lastNetworkError = error instanceof Error ? error.name : "NETWORK_ERROR";
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return {
    ready: false, attempts: 45, lastHttpStatus, lastNetworkError,
    processExitCode: child.exitCode, processSignal: child.signalCode, processErrorCode,
  };
}

const summary = {
  createdAt: new Date().toISOString(),
  mode: RUN_MODE === "--browser-only" ? "browser-only" : "api",
  environment: "JOBLY-E2E",
  projectRef: PROJECT_REF,
  status: "BLOCKED",
  build: "NOT_RUN",
  localServer: "NOT_RUN",
  authenticatedRoleSmoke: "NOT_RUN",
  browserSmoke: "NOT_RUN",
  browserChecks: null,
  browserAuthEvidence: null,
  browserExecution: null,
  browserFailure: null,
  secretsPrinted: false,
  remoteDataMayBeModified: false,
  localServerProbe: null,
  configDiagnostics: null,
};
let server = null;
try {
  assert.ok(SOURCE_ROOT, "Indiquer le chemin du dépôt source qui contient .env.local et .e2e-fixtures.json.");
  assert.notEqual(path.resolve(SOURCE_ROOT), ROOT, "Exécuter depuis le worktree isolé, pas depuis le dépôt local modifié.");
  assert.equal(runGit(["rev-parse", "HEAD"]), runGit(["rev-parse", "origin/e2e/recette"]), "Le worktree ne correspond pas exactement à origin/e2e/recette. Faites git fetch origin puis recréez un worktree propre.");
  assert.equal(runGit(["status", "--porcelain"]), "", "Le worktree doit être propre avant la recette.");
  assert.ok(await exists(path.join(ROOT, "node_modules", "next", "package.json")), "Dépendances manquantes : exécutez pnpm install --frozen-lockfile --ignore-scripts dans le worktree.");
  assert.ok(await exists(NEXT_CLI), "Binaire Next.js absent du worktree ; réinstallez les dépendances avec le lockfile.");

  // The fixture manifest is the project's local identity anchor. It contains
  // no API key; accept it only when both environment and projectRef match this
  // runner's fixed JOBLY-E2E target.
  const fixturePath = path.join(SOURCE_ROOT, ".e2e-fixtures.json");
  const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
  assert.equal(fixtures.environment, "JOBLY-E2E", "Manifeste de fixtures non JOBLY-E2E refusé.");
  assert.equal(fixtures.projectRef, PROJECT_REF, "Le projectRef des fixtures ne correspond pas à JOBLY-E2E.");

  const { env: mergedConfig, files: configFilesLoaded } = await loadSourceEnvironment(SOURCE_ROOT);
  const configuredUrl = mergedConfig.NEXT_PUBLIC_SUPABASE_URL || mergedConfig.SUPABASE_URL || "";
  const urlWasDerivedFromFixture = configuredUrl === "";
  // A missing URL can be reconstructed deterministically from the verified
  // fixture projectRef. A conflicting explicit URL must never be overridden.
  const effectiveUrl = urlWasDerivedFromFixture
    ? "https://" + fixtures.projectRef + ".supabase.co"
    : configuredUrl;
  const publishableKey = mergedConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || mergedConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
  const privateKey = mergedConfig.SUPABASE_SECRET_KEY || mergedConfig.SUPABASE_SERVICE_ROLE_KEY || "";
  let configuredProjectRef = "missing-or-invalid";
  try {
    const host = new URL(effectiveUrl).hostname;
    configuredProjectRef = host.endsWith(".supabase.co") ? host.slice(0, -".supabase.co".length) : "non-supabase";
  } catch {}
  summary.configDiagnostics = {
    sourceFiles: configFilesLoaded,
    supabaseUrlConfiguredInEnv: Boolean(configuredUrl),
    supabaseUrlDerivedFromFixture: urlWasDerivedFromFixture,
    supabaseUrlMatchesE2E: effectiveUrl === SUPABASE_URL,
    fixtureProjectRefMatchesE2E: fixtures.projectRef === PROJECT_REF,
    configuredProjectRef,
    publishableKeyPresent: publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ"),
    serverKeyType: privateKey.startsWith("sb_secret_") ? "sb_secret" : privateKey.startsWith("eyJ") ? "legacy_jwt" : "missing",
    serverKeyVerifiedForE2E: false,
    serverKeyProbeStatus: null,
  };
  if (effectiveUrl !== SUPABASE_URL) {
    throw new Error("Une URL Supabase explicite contredit le projet JOBLY-E2E ; arrêt sécurisé avant build.");
  }
  assert.ok(publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ"), "Clé publishable JOBLY-E2E absente.");
  assert.ok(privateKey.startsWith("sb_secret_") || privateKey.startsWith("eyJ"), "Clé serveur JOBLY-E2E absente.");
  if (privateKey.startsWith("eyJ")) {
    const claims = JSON.parse(Buffer.from(privateKey.split(".")[1] || "", "base64url").toString("utf8"));
    assert.equal(claims.ref, PROJECT_REF, "La clé JWT ne correspond pas à JOBLY-E2E.");
    assert.equal(claims.role, "service_role", "La clé JWT n'a pas le rôle service_role.");
  }

  // Read-only PostgREST OpenAPI root probe. Supabase accepts modern sb_secret
  // keys and legacy service_role keys in the apikey header. No table is read,
  // and the response body is discarded immediately.
  const keyProbe = await fetch(SUPABASE_URL + "/rest/v1/", {
    method: "GET",
    headers: { apikey: privateKey, Accept: "application/openapi+json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  summary.configDiagnostics.serverKeyProbeStatus = keyProbe.status;
  await keyProbe.body?.cancel().catch(() => undefined);
  if (!keyProbe.ok) {
    throw new Error("La clé serveur locale n'est pas valide pour JOBLY-E2E (probe API lecture seule, HTTP " + keyProbe.status + ").");
  }
  summary.configDiagnostics.serverKeyVerifiedForE2E = true;

  // Expose only the verified project URL to the child build/server process.
  mergedConfig.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  mergedConfig.SUPABASE_URL = SUPABASE_URL;
  const expected = [["talent", "TALENT"], ["recruiter", "RECRUITER"], ["partner", "PARTNER"]];
  assert.ok(Array.isArray(fixtures.accounts) && expected.every(([key, role]) => {
    const account = fixtures.accounts.find((item) => item?.key === key && item?.role === role);
    return account && typeof account.email === "string" && typeof account.password === "string" && account.password.length >= 8;
  }), "Les trois fixtures E2E ne sont pas complètes.");

  const env = {
    ...mergedConfig,
    E2E_PROJECT_REF: PROJECT_REF,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
    GITHUB_SHA: runGit(["rev-parse", "HEAD"]),
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
    SUPABASE_ANON_KEY: publishableKey,
    E2E_BASE_URL: BASE_URL,
    E2E_FIXTURE_PATH: fixturePath,
    NEXT_PUBLIC_JOBLY_PUBLIC_URL: BASE_URL,
    JOBLY_PUBLIC_URL: BASE_URL,
    JOBLY_API_BASE_URL: BASE_URL,
    NODE_ENV: "production",
  };
  if (privateKey.startsWith("sb_secret_")) env.SUPABASE_SECRET_KEY = privateKey;
  else env.SUPABASE_SERVICE_ROLE_KEY = privateKey;

  const alreadyListening = await fetch(BASE_URL + "/api/profile", { signal: AbortSignal.timeout(1500) }).then(() => true).catch(() => false);
  assert.equal(alreadyListening, false, "Le port 3217 est déjà occupé ; aucun serveur existant ne sera réutilisé.");

  console.log("Préflight local JOBLY-E2E : PASS (secrets masqués, fixtures existantes, worktree exact).");
  console.log("Build du code exact e2e/recette…");
  const buildCode = await runCommand("pnpm", ["build"], env);
  summary.build = buildCode === 0 ? "PASS" : "FAIL";
  if (buildCode !== 0) throw new Error("Le build Next.js a échoué ; serveur et recette non lancés.");

  console.log("Démarrage du serveur local isolé sur " + BASE_URL + "…");
  server = spawn(process.execPath, [NEXT_CLI, "start", "--hostname", "127.0.0.1", "--port", PORT], { cwd: ROOT, env, stdio: "ignore", windowsHide: true });
  const probe = await waitForServer(server);
  summary.localServerProbe = { expectedHttpStatus: 401, ...probe };
  if (!probe.ready) {
    summary.localServer = "BLOCKED";
    const detail = probe.lastHttpStatus !== null
      ? "HTTP " + probe.lastHttpStatus + " reçu au lieu de 401"
      : probe.processExitCode !== null
        ? "processus Next arrêté avec le code " + probe.processExitCode
        : probe.processErrorCode
          ? "démarrage Next impossible (" + probe.processErrorCode + ")"
          : "aucune réponse HTTP reçue après 45 tentatives";
    throw new Error("Serveur Next local indisponible : " + detail + " ; test API non lancé.");
  }
  summary.localServer = "PASS";

  if (RUN_MODE === "--browser-only") {
    console.log("Mode browser-only : aucun parcours API authentifié ni aucune écriture métier ne seront exécutés.");
    const playwrightModulePath = await ensurePlaywright(env);
    const authReportCandidates = [
      path.join(ROOT, "artifacts", "e2e", "auth-session-smoke.json"),
      path.join(SOURCE_ROOT, "artifacts", "e2e", "auth-session-smoke.json"),
    ];
    const authReportPath = (await Promise.all(authReportCandidates.map(async (candidate) => ({
      candidate, present: await exists(candidate),
    })))).find((item) => item.present)?.candidate;
    const browserEnv = {
      ...env,
      E2E_BASE_URL: BASE_URL,
      PLAYWRIGHT_MODULE_PATH: playwrightModulePath,
      ...(authReportPath ? { E2E_AUTH_SESSION_REPORT_PATH: authReportPath } : {}),
    };
    const browserStartedAt = new Date();
    const browserLogPath = path.join(ROOT, "artifacts", "e2e", "browser-smoke-process.log");
    const browserRun = await runCommandCaptured(
      process.execPath,
      ["e2e/browser-smoke.mjs"],
      browserEnv,
      browserLogPath,
    );
    const browserCode = browserRun.exitCode;
    const browserReportPath = path.join(ROOT, "artifacts", "e2e", "lot1-auth-ui-smoke.json");
    let browserReport = null;
    let browserReportProblem = null;
    if (await exists(browserReportPath)) {
      try {
        const candidate = JSON.parse(await readFile(browserReportPath, "utf8"));
        const reportTime = Date.parse(candidate.createdAt || "");
        const fresh = Number.isFinite(reportTime) && reportTime >= browserStartedAt.getTime() - 1000;
        const correctTarget =
          candidate.environment === "JOBLY-E2E" &&
          candidate.projectRef === PROJECT_REF &&
          candidate.baseURL === BASE_URL &&
          candidate.commit === runGit(["rev-parse", "HEAD"]);
        if (fresh && correctTarget) {
          browserReport = candidate;
        } else {
          browserReportProblem = fresh
            ? "Rapport navigateur présent mais son environnement, son projet, son URL locale ou son SHA ne correspond pas à cette exécution."
            : "Un ancien rapport navigateur existe, mais il n'a pas été régénéré pendant cette exécution.";
        }
      } catch (error) {
        browserReportProblem = error instanceof Error ? "Rapport navigateur JSON illisible : " + error.message : "Rapport navigateur JSON illisible.";
      }
    } else {
      browserReportProblem = "Le smoke navigateur n'a pas généré son rapport JSON.";
    }
    summary.browserExecution = {
      startedAt: browserStartedAt.toISOString(),
      exitCode: browserCode,
      spawnError: browserRun.spawnError,
      processLog: path.relative(ROOT, browserLogPath).split(path.sep).join("/"),
      reportPresent: await exists(browserReportPath),
      reportGeneratedForThisRun: Boolean(browserReport),
      reportProblem: browserReportProblem,
    };
    if (!browserReport) {
      summary.browserSmoke = "BLOCKED";
      summary.browserFailure = {
        reason: browserReportProblem,
        processExitCode: browserCode,
        spawnError: browserRun.spawnError,
        processLog: "artifacts/e2e/browser-smoke-process.log",
      };
      summary.remoteDataMayBeModified = false;
      summary.status = "BLOCKED";
      summary.reason = browserReportProblem + " Consulter browser-smoke-process.log.";
    } else {
      const failed = Number(browserReport.failed || 0);
      const blocked = Array.isArray(browserReport.blocked) ? browserReport.blocked.length : 0;
      const passed = Number(browserReport.passed || 0);
      summary.browserChecks = {
        executed: Number(browserReport.executed || 0),
        passed,
        failed,
        blocked,
      };
      summary.browserAuthEvidence = browserReport.authLifecycleEvidence || null;
      summary.browserSmoke = failed > 0 || browserCode !== 0
        ? "FAIL"
        : blocked > 0 || passed !== 14
          ? "PARTIAL"
          : "PASS";
      summary.remoteDataMayBeModified = false;
      summary.status = summary.browserSmoke === "PASS"
        ? "PASS"
        : summary.browserSmoke === "FAIL"
          ? "FAIL"
          : "PARTIAL";
    }
    await writeFile(
      path.join(ROOT, "artifacts", "e2e", "browser-smoke-diagnostic.json"),
      JSON.stringify({
        createdAt: new Date().toISOString(),
        processExitCode: browserCode,
        spawnError: browserRun.spawnError,
        reportGenerated: await exists(browserReportPath),
        failureArtifact: await exists(path.join(ROOT, "artifacts", "e2e", "failure.txt")) ? "artifacts/e2e/failure.txt" : null,
        processLog: "artifacts/e2e/browser-smoke-process.log",
        authReportCandidateSelected: authReportPath ? path.basename(authReportPath) : null,
        authReportCandidatePresent: Boolean(authReportPath),
      }, null, 2) + "\n",
      { encoding: "utf8", mode: 0o600 },
    );
  } else {
    console.log("Exécution des parcours API authentifiés Talent / Recruteur / Partenaire…");
    summary.remoteDataMayBeModified = true;
    const testCode = await runCommand(process.execPath, ["e2e/authenticated-role-smoke.mjs"], env);
    const reportPath = path.join(ROOT, "artifacts", "e2e", "authenticated-role-smoke.json");
    if (await exists(reportPath)) {
      const report = JSON.parse(await readFile(reportPath, "utf8"));
      summary.authenticatedRoleSmoke = report.status || "UNKNOWN";
      summary.checks = {
        total: report.checks?.length || 0,
        passed: report.checks?.filter((x) => x.status === "PASS").length || 0,
        blocked: report.checks?.filter((x) => x.status === "BLOCKED").length || 0,
        failed: report.checks?.filter((x) => x.status === "FAIL").length || 0,
      };
      summary.roles = report.roles || {};
      summary.externalActions = report.externalActions;
      const cleanupChecks = (report.checks || []).filter((x) => /CLEANUP/.test(x.id || ""));
      summary.cleanup = { checks: cleanupChecks.map((x) => ({ id: x.id, status: x.status })), allPass: cleanupChecks.length > 0 && cleanupChecks.every((x) => x.status === "PASS") };
      summary.summary = report.summary || null;
    } else {
      throw new Error("Le rapport du smoke API n’a pas été généré.");
    }
    summary.status = summary.authenticatedRoleSmoke === "PASS" && testCode === 0
      ? "PASS"
      : summary.authenticatedRoleSmoke === "FAIL" || testCode !== 0
        ? "FAIL"
        : "PARTIAL";
  }
} catch (error) {
  summary.status = "BLOCKED";
  summary.reason = error instanceof Error ? error.message : "Erreur locale non détaillée.";
} finally {
  stopServer(server);
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(summary, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}
console.log(JSON.stringify(summary, null, 2));
console.log("Rapport de synthèse : artifacts/e2e/authenticated-role-runner-summary.json");
if (RUN_MODE === "--browser-only") console.log("Rapport navigateur : artifacts/e2e/lot1-auth-ui-smoke.json");
else console.log("Rapport API : artifacts/e2e/authenticated-role-smoke.json");
if (summary.status !== "PASS") process.exitCode = summary.status === "FAIL" ? 1 : 2;
