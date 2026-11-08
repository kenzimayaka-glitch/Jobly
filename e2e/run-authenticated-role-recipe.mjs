import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const SOURCE_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : "";
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
    const child = spawn(command, args, { cwd: ROOT, env, stdio: "inherit", shell: process.platform === "win32" && command === "pnpm", windowsHide: true });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
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
  environment: "JOBLY-E2E",
  projectRef: PROJECT_REF,
  status: "BLOCKED",
  build: "NOT_RUN",
  localServer: "NOT_RUN",
  authenticatedRoleSmoke: "NOT_RUN",
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

  const { env: mergedConfig, files: configFilesLoaded } = await loadSourceEnvironment(SOURCE_ROOT);
  const configuredUrl = mergedConfig.NEXT_PUBLIC_SUPABASE_URL || mergedConfig.SUPABASE_URL || "";
  const publishableKey = mergedConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
  const privateKey = mergedConfig.SUPABASE_SECRET_KEY || mergedConfig.SUPABASE_SERVICE_ROLE_KEY || "";
  let configuredProjectRef = "missing-or-invalid";
  try {
    const host = new URL(configuredUrl).hostname;
    configuredProjectRef = host.endsWith(".supabase.co") ? host.slice(0, -".supabase.co".length) : "non-supabase";
  } catch {}
  summary.configDiagnostics = {
    sourceFiles: configFilesLoaded,
    supabaseUrlPresent: Boolean(configuredUrl),
    supabaseUrlMatchesE2E: configuredUrl === SUPABASE_URL,
    configuredProjectRef,
    publishableKeyPresent: publishableKey.startsWith("sb_publishable_"),
    serverKeyType: privateKey.startsWith("sb_secret_") ? "sb_secret" : privateKey.startsWith("eyJ") ? "legacy_jwt" : "missing",
  };
  if (configuredUrl !== SUPABASE_URL) {
    throw new Error("Configuration JOBLY-E2E non reconnue après chargement officiel Next.js ; voir configDiagnostics (aucune URL ni clé n'est imprimée).");
  }
  assert.ok(publishableKey.startsWith("sb_publishable_"), "Clé publishable JOBLY-E2E absente.");
  assert.ok(privateKey.startsWith("sb_secret_") || privateKey.startsWith("eyJ"), "Clé serveur JOBLY-E2E absente.");
  if (privateKey.startsWith("eyJ")) {
    const claims = JSON.parse(Buffer.from(privateKey.split(".")[1] || "", "base64url").toString("utf8"));
    assert.equal(claims.ref, PROJECT_REF, "La clé JWT ne correspond pas à JOBLY-E2E.");
    assert.equal(claims.role, "service_role", "La clé JWT n'a pas le rôle service_role.");
  }

  const fixturePath = path.join(SOURCE_ROOT, ".e2e-fixtures.json");
  const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
  assert.equal(fixtures.environment, "JOBLY-E2E");
  assert.equal(fixtures.projectRef, PROJECT_REF);
  const expected = [["talent", "TALENT"], ["recruiter", "RECRUITER"], ["partner", "PARTNER"]];
  assert.ok(Array.isArray(fixtures.accounts) && expected.every(([key, role]) => {
    const account = fixtures.accounts.find((item) => item?.key === key && item?.role === role);
    return account && typeof account.email === "string" && typeof account.password === "string" && account.password.length >= 8;
  }), "Les trois fixtures E2E ne sont pas complètes.");

  const env = {
    ...mergedConfig,
    E2E_PROJECT_REF: PROJECT_REF,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    E2E_BASE_URL: BASE_URL,
    E2E_FIXTURE_PATH: fixturePath,
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
console.log("Rapport API : artifacts/e2e/authenticated-role-smoke.json");
if (summary.status !== "PASS") process.exitCode = summary.status === "FAIL" ? 1 : 2;
