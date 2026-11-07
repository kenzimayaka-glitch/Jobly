import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = path.join(ROOT, "artifacts", "e2e");
const LOGS = path.join(ARTIFACTS, "local-recipe");
const EXPECTED_REF = "ofqqrryamslxoqkklraw";
const EXPECTED_URL = "https://" + EXPECTED_REF + ".supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
const PLAYWRIGHT_VERSION = "1.65.0";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeIsolatedEnvironment() {
  const env = { ...process.env };

  // Empty sensitive variables so Next.js cannot reload local Production values
  // from .env files when this recipe starts its local test server.
  const sensitive = /(SERVICE_ROLE|SUPABASE_SECRET|DATABASE_URL|DIRECT_URL|POSTGRES|RESEND|SMTP|SENDGRID|TWILIO|STRIPE_SECRET|PAYPAL_SECRET|MOBILE_MONEY_SECRET|ADMIN_PASSWORD|PRIVATE_KEY)/i;
  for (const key of Object.keys(env)) {
    if (sensitive.test(key)) env[key] = "";
  }

  Object.assign(env, {
    E2E_PROJECT_REF: EXPECTED_REF,
    E2E_BASE_URL: "http://127.0.0.1:3000",
    NEXT_PUBLIC_SUPABASE_URL: EXPECTED_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: PUBLISHABLE_KEY,
    SUPABASE_URL: EXPECTED_URL,
    SUPABASE_ANON_KEY: PUBLISHABLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    NEXT_PUBLIC_JOBLY_PUBLIC_URL: "http://127.0.0.1:3000",
    JOBLY_PUBLIC_URL: "http://127.0.0.1:3000",
    JOBLY_API_BASE_URL: "http://127.0.0.1:3000",
    NODE_ENV: "production",
    E2E_BULK_CONCURRENCY: "3",
  });

  // Explicitly prevent local dotenv files from supplying privileged values.
  for (const key of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SECRET_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "RESEND_API_KEY",
    "SENDGRID_API_KEY",
    "STRIPE_SECRET_KEY",
    "TWILIO_AUTH_TOKEN",
  ]) env[key] = "";

  return env;
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function runProcess(id, command, args, options = {}) {
  const started = performance.now();
  const logPath = path.join(LOGS, id + ".log");
  const relativeLog = path.relative(ROOT, logPath).split(path.sep).join("/");
  const stream = createWriteStream(logPath, { encoding: "utf8" });
  const timeoutMs = options.timeoutMs ?? 180000;
  let output = "";
  let timedOut = false;
  let spawnError = null;

  const child = spawn(command, args, {
    cwd: ROOT,
    env: options.env ?? process.env,
    windowsHide: true,
    shell: options.shell ?? false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const collect = (chunk) => {
    const value = chunk.toString();
    output += value;
    stream.write(value);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.on("error", (error) => {
    spawnError = error.message;
    stream.write("\nRUNNER ERROR: " + error.message + "\n");
  });

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    stream.write("\nTIMEOUT after " + timeoutMs + " ms\n");
  }, timeoutMs);

  return await new Promise((resolve) => {
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      stream.end(() => resolve({
        exitCode: typeof code === "number" ? code : 1,
        signal: signal ?? null,
        spawnError,
        timedOut,
        output,
        durationMs: Math.round(performance.now() - started),
        log: relativeLog,
      }));
    });
  });
}

function phase(id, label, status, details = {}) {
  return { id, label, status, ...details };
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function reserveLocalPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function ensurePlaywright(env) {
  const modulePath = path.join(ROOT, ".e2e-tools", "node_modules", "playwright", "index.mjs");
  const cliPath = path.join(ROOT, ".e2e-tools", "node_modules", "playwright", "cli.js");

  if (!(await pathExists(modulePath))) {
    console.log("[SETUP] Installation de Playwright " + PLAYWRIGHT_VERSION);
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const install = await runProcess(
      "playwright-install",
      npm,
      ["install", "--prefix", ".e2e-tools", "--no-save", "--no-package-lock", "playwright@" + PLAYWRIGHT_VERSION],
      { env, timeoutMs: 240000, shell: process.platform === "win32" },
    );
    if (install.exitCode !== 0 || !(await pathExists(modulePath))) {
      return { ok: false, reason: "Installation Playwright impossible.", log: install.log };
    }
  }

  const browserInstall = await runProcess(
    "playwright-chromium-install",
    process.execPath,
    [cliPath, "install", "chromium"],
    { env, timeoutMs: 300000 },
  );
  if (browserInstall.exitCode !== 0) {
    return { ok: false, reason: "Installation Chromium impossible.", log: browserInstall.log };
  }

  env.PLAYWRIGHT_MODULE_PATH = modulePath;
  return { ok: true, modulePath };
}

async function startNextServer(env, port) {
  const nextCli = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  if (!(await pathExists(nextCli))) {
    return { ok: false, reason: "Next.js CLI absent : exécute pnpm install avant la recette." };
  }

  const logPath = path.join(LOGS, "next-server.log");
  const stream = createWriteStream(logPath, { encoding: "utf8" });
  const baseURL = "http://127.0.0.1:" + port;
  const serverEnv = {
    ...env,
    E2E_BASE_URL: baseURL,
    NEXT_PUBLIC_JOBLY_PUBLIC_URL: baseURL,
    JOBLY_PUBLIC_URL: baseURL,
    JOBLY_API_BASE_URL: baseURL,
  };
  const child = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: ROOT,
    env: serverEnv,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => stream.write(chunk));
  child.stderr.on("data", (chunk) => stream.write(chunk));
  let closed = false;
  let exitCode = null;
  child.once("error", (error) => stream.write("\nSERVER ERROR: " + error.message + "\n"));
  child.once("close", (code) => {
    closed = true;
    exitCode = code;
    stream.end();
  });

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (closed) break;
    try {
      const response = await fetch(baseURL + "/", { signal: AbortSignal.timeout(2500), cache: "no-store" });
      if (response.status < 500) {
        ready = true;
        break;
      }
    } catch {
      // The server is still starting.
    }
    await sleep(1000);
  }

  return {
    ok: ready,
    child,
    baseURL,
    log: path.relative(ROOT, logPath).split(path.sep).join("/"),
    reason: ready ? null : "Le serveur Next.js local n'a pas démarré correctement (code " + exitCode + ").",
  };
}

async function stopNextServer(server) {
  if (!server?.child || server.child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      server.child.kill("SIGKILL");
      resolve();
    }, 5000);
    server.child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    server.child.kill("SIGTERM");
  });
}

function reportMarkdown(report) {
  const lines = [
    "# Jobly — recette E2E locale consolidée",
    "",
    "- Début : " + report.startedAt,
    "- Fin : " + report.completedAt,
    "- Commit local : " + report.commit,
    "- Node.js : " + report.node,
    "- Environnement : JOBLY-E2E uniquement (" + EXPECTED_REF + ")",
    "- Orchestration : 6 groupes bulk en parallèle, concurrence limitée à 3 groupes et 2 fichiers par groupe",
    "- Bilan : **" + report.passedLots + "/11 PASS**, " + report.partialLots + " PARTIAL, " + report.blockedLots + " BLOCKED, " + report.failedLots + " FAIL",
    "- Statut global : **" + report.status + "**",
    "",
    "| Lot | Contrôle | Statut | Tests | Détail / preuve |",
    "|---|---|---:|---:|---|",
  ];
  for (const item of report.lots) {
    lines.push(
      "| " + item.id +
      " | " + item.label +
      " | **" + item.status + "**" +
      " | " + (item.tests ?? "—") +
      " | " + (item.log ?? item.detail ?? "—") + " |"
    );
  }
  lines.push(
    "",
    "## Garde-fous",
    "",
    "- La connexion Supabase est forcée sur JOBLY-E2E ; les variables sensibles connues sont neutralisées pour les processus enfants.",
    "- Aucun service_role, mot de passe Admin, compte de production, envoi email/SMS ou paiement réel n'est utilisé.",
    "- Le smoke navigateur ne soumet pas les formulaires et ne crée pas de compte.",
    "- BLOCKED et PARTIAL ne sont jamais comptés comme PASS.",
    "- Les tests unitaires/régressions ne prouvent pas à eux seuls les parcours réels authentifiés Talent/Recruteur ni la persistance de bout en bout.",
    "",
    "## Artefacts",
    "",
    "- Résumé : artifacts/e2e/local-recipe/summary.json et summary.md",
    "- Régressions bulk : artifacts/e2e/bulk/summary.md et *.log",
    "- Browser smoke : artifacts/e2e/lot1-auth-ui-smoke.json et captures PNG",
    "- Logs détaillés : artifacts/e2e/local-recipe/*.log",
    "",
  );
  return lines.join("\n");
}

async function main() {
  await mkdir(LOGS, { recursive: true });
  await mkdir(ARTIFACTS, { recursive: true });
  const env = makeIsolatedEnvironment();
  const lots = [];
  const startedAt = new Date().toISOString();

  console.log("[1/11] Préflight strict JOBLY-E2E");
  const preflight = await runProcess(
    "lot-00-preflight",
    process.execPath,
    ["e2e/lot0-preflight.mjs"],
    { env, timeoutMs: 45000 },
  );
  lots.push(phase(
    "LOT-00",
    "Préflight Supabase JOBLY-E2E",
    preflight.exitCode === 0 ? "PASS" : "FAIL",
    { durationMs: preflight.durationMs, log: preflight.log, detail: preflight.spawnError ?? (preflight.timedOut ? "Timeout" : "Connexion E2E vérifiée en lecture seule") },
  ));

  console.log("[2-7/11] Six groupes de régressions en parallèle (maximum 3)");
  const bulk = await runProcess(
    "lot-02-to-07-bulk",
    process.execPath,
    ["scripts/e2e-bulk-runner.mjs"],
    { env, timeoutMs: 300000 },
  );
  const bulkReport = await readJson(path.join(ARTIFACTS, "bulk", "summary.json"));
  const bulkGroups = Array.isArray(bulkReport?.results) ? bulkReport.results : [];
  for (let index = 0; index < 6; index += 1) {
    const group = bulkGroups[index];
    if (!group) {
      lots.push(phase("BULK-" + (index + 1), "Groupe bulk " + (index + 1), "FAIL", {
        detail: "Rapport du groupe absent ; code orchestrateur " + bulk.exitCode,
        log: bulk.log,
      }));
      continue;
    }
    lots.push(phase(
      "BULK-" + (index + 1),
      group.label,
      group.status === "PASS" ? "PASS" : "FAIL",
      {
        tests: group.tests,
        passed: group.passed,
        failed: group.failed,
        durationMs: group.durationMs,
        log: group.log,
        detail: group.error ?? (group.status === "PASS" ? "Groupe réussi" : "Groupe en échec"),
      },
    ));
  }

  console.log("[8/11] Vérification du cycle Auth isolé");
  if (preflight.exitCode !== 0) {
    lots.push(phase("LOT-08", "Session Auth JOBLY-E2E", "BLOCKED", {
      detail: "Préflight E2E non validé ; aucun appel Auth supplémentaire n'est lancé.",
    }));
  } else {
    const auth = await runProcess(
      "lot-08-auth-session",
      process.execPath,
      ["e2e/auth-session-smoke.mjs"],
      { env, timeoutMs: 60000 },
    );
    const authReport = await readJson(path.join(ARTIFACTS, "auth-session-smoke.json"));
    const authStatus = authReport?.status ?? (auth.exitCode === 0 ? "PARTIAL" : "FAIL");
    lots.push(phase(
      "LOT-08",
      "Session Auth JOBLY-E2E",
      authStatus === "PASS" ? "PASS" : authStatus === "FAIL" || auth.exitCode !== 0 ? "FAIL" : authStatus === "BLOCKED" ? "BLOCKED" : "PARTIAL",
      {
        detail: authReport?.reason ?? authReport?.notes?.join(" ") ?? "Rapport Auth non disponible.",
        log: auth.log,
        evidence: "artifacts/e2e/auth-session-smoke.json",
      },
    ));
  }

  console.log("[9/11] Typecheck complet");
  const typecheck = await runProcess(
    "lot-09-typecheck",
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["typecheck"],
    { env, timeoutMs: 240000, shell: process.platform === "win32" },
  );
  lots.push(phase(
    "LOT-09",
    "TypeScript — pnpm typecheck",
    typecheck.exitCode === 0 ? "PASS" : "FAIL",
    { durationMs: typecheck.durationMs, log: typecheck.log, detail: typecheck.spawnError ?? (typecheck.timedOut ? "Timeout" : "tsc --noEmit") },
  ));

  console.log("[10/11] Build Next.js de production");
  const build = await runProcess(
    "lot-10-build",
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["build"],
    { env, timeoutMs: 420000, shell: process.platform === "win32" },
  );
  lots.push(phase(
    "LOT-10",
    "Build production — pnpm build",
    build.exitCode === 0 ? "PASS" : "FAIL",
    { durationMs: build.durationMs, log: build.log, detail: build.spawnError ?? (build.timedOut ? "Timeout" : "Next.js build") },
  ));

  console.log("[11/11] Smoke test navigateur sur le build local");
  if (preflight.exitCode !== 0 || build.exitCode !== 0) {
    lots.push(phase("LOT-11", "UI/Auth/API protégées et responsive (Playwright)", "BLOCKED", {
      detail: preflight.exitCode !== 0 ? "Préflight JOBLY-E2E non validé." : "Build Next.js en échec ; serveur non démarré.",
    }));
  } else {
    const playwright = await ensurePlaywright(env);
    if (!playwright.ok) {
      lots.push(phase("LOT-11", "UI/Auth/API protégées et responsive (Playwright)", "BLOCKED", {
        detail: playwright.reason,
        log: playwright.log,
      }));
    } else {
      const port = await reserveLocalPort();
      const server = await startNextServer(env, port);
      if (!server.ok) {
        lots.push(phase("LOT-11", "UI/Auth/API protégées et responsive (Playwright)", "FAIL", {
          detail: server.reason,
          log: server.log,
        }));
      } else {
        const browserEnv = {
          ...env,
          E2E_BASE_URL: server.baseURL,
          PLAYWRIGHT_MODULE_PATH: playwright.modulePath,
        };
        let browserResult;
        try {
          browserResult = await runProcess(
            "lot-11-browser-smoke",
            process.execPath,
            ["e2e/browser-smoke.mjs"],
            { env: browserEnv, timeoutMs: 180000 },
          );
        } finally {
          await stopNextServer(server);
        }
        const browserReport = await readJson(path.join(ARTIFACTS, "lot1-auth-ui-smoke.json"));
        const blocked = Array.isArray(browserReport?.blocked) ? browserReport.blocked.length : 0;
        const failures = Number(browserReport?.failed ?? (browserResult.exitCode === 0 ? 0 : 1));
        const status = failures > 0 || browserResult.exitCode !== 0
          ? "FAIL"
          : blocked > 0
            ? "PARTIAL"
            : "PASS";
        lots.push(phase(
          "LOT-11",
          "UI/Auth/API protégées et responsive (Playwright)",
          status,
          {
            tests: browserReport?.executed ?? null,
            passed: browserReport?.passed ?? null,
            blocked,
            detail: blocked > 0 ? blocked + " contrôles Auth bloqués ; aucun compte Admin ou Talent injecté." : "Smoke navigateur exécuté.",
            log: browserResult.log,
            evidence: "artifacts/e2e/lot1-auth-ui-smoke.json + captures PNG",
          },
        ));
      }
    }
  }

  const failedLots = lots.filter((item) => item.status === "FAIL").length;
  const blockedLots = lots.filter((item) => item.status === "BLOCKED").length;
  const partialLots = lots.filter((item) => item.status === "PARTIAL").length;
  const passedLots = lots.filter((item) => item.status === "PASS").length;
  const report = {
    schemaVersion: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? "local",
    node: process.version,
    environment: "JOBLY-E2E",
    projectRef: EXPECTED_REF,
    groupConcurrency: 3,
    fileConcurrency: 2,
    totalLots: lots.length,
    passedLots,
    partialLots,
    blockedLots,
    failedLots,
    status: failedLots > 0 ? "FAIL" : blockedLots > 0 || partialLots > 0 || passedLots !== 11 ? "PARTIAL" : "PASS",
    lots,
  };

  const markdown = reportMarkdown(report);
  await writeFile(path.join(LOGS, "summary.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  await writeFile(path.join(LOGS, "summary.md"), markdown, "utf8");
  await writeFile(path.join(ROOT, "feedback-e2e-recette-complete.txt"), markdown, "utf8");

  console.log("");
  console.log("BILAN E2E : " + report.passedLots + "/11 PASS ; " + report.partialLots + " PARTIAL ; " + report.blockedLots + " BLOCKED ; " + report.failedLots + " FAIL.");
  console.log("STATUT GLOBAL : " + report.status);
  console.log("Rapport à ouvrir : feedback-e2e-recette-complete.txt");
  console.log("Rapport JSON : artifacts/e2e/local-recipe/summary.json");

  if (report.status !== "PASS") process.exitCode = 1;
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("[FATAL] " + message);
  try {
    await mkdir(LOGS, { recursive: true });
    await writeFile(path.join(LOGS, "fatal.txt"), message + "\n", "utf8");
  } catch {
    // Preserve the original failure if local storage is unavailable.
  }
  process.exitCode = 1;
});
