import { spawn } from "node:child_process";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
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
const configuredConcurrency = Number.parseInt(process.env.E2E_LOT_CONCURRENCY ?? "", 10);
const GROUP_CONCURRENCY = Number.isFinite(configuredConcurrency)
  ? Math.max(1, Math.min(6, configuredConcurrency))
  : 5;
const FILE_CONCURRENCY = 2;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const catalog = [
  {
    id: "LOT-01",
    stage: 0, severity: "P0", dependsOn: ["LOT-00"],
    label: "Auth, rôles, navigation et sécurité",
    files: [
      "scripts/authentication-flow-regression.test.mjs",
      "scripts/jobly-security-core.test.mjs",
      "scripts/security-entitlements.test.mjs",
      "scripts/p2-pwned-passwords.test.mjs",
      "scripts/e2e-authenticated-runtime-regression.test.mjs",
    ],
    gap: "Les connexions réelles et renouvellements de session Talent/Recruteur/Partenaire sont validés ; les parcours OTP, Google, réinitialisation du mot de passe et révocation multi-appareils restent à démontrer.",
  },
  {
    id: "LOT-02",
    stage: 1, severity: "P0", dependsOn: ["LOT-01"],
    label: "Talent, offres, recherche et candidatures",
    files: [
      "scripts/external-application-assistant.test.mjs",
      "scripts/talent-cv-application-regression.test.mjs",
    ],
    gap: "Les contrats de régression CV (import PDF, session, sauvegarde privée, export, preuves Career Journey) et les états de candidature sont vérifiés statiquement ; le parcours runtime authentifié complet CV, recherche/détail d’offre et candidature de bout en bout reste à démontrer.",
  },
  {
    id: "LOT-03",
    stage: 1, severity: "P0", dependsOn: ["LOT-01"],
    label: "Recruteur et Recruitment 360",
    files: ["scripts/recruiter-role-regression.test.mjs"],
    gap: "Le profil Recruteur, le CRUD brouillon, la publication locale E2E, la réception d'une candidature, l'entretien et la décision finale sont exercés ; tests, shortlist Recruitment 360, exports et diffusion avec plans/marchés restent à démontrer.",
  },
  {
    id: "LOT-04",
    stage: 1, severity: "P1", dependsOn: ["LOT-00"],
    label: "Mission Afrique et qualité des offres",
    files: [
      "scripts/africa-p0.test.mjs",
      "scripts/lib/supabase-batch-query.test.mjs",
      "scripts/p2-jobly-offer-watermark.test.mjs",
    ],
    gap: "Les régressions de règles sont exécutées ; la collecte réelle multi-sources, la reprise d'ingestion et la persistance de bout en bout ne sont pas exercées par ces tests.",
  },
  {
    id: "LOT-05",
    stage: 1, severity: "P1", dependsOn: ["LOT-01"],
    label: "J'IA 360",
    files: [
      "scripts/jia-access.test.mjs",
      "scripts/jia-conversation-write-guard.test.mjs",
      "scripts/jia-experience-engine.test.mjs",
      "scripts/jia-extension-onboarding.test.mjs",
      "scripts/jia-internet-brain.test.mjs",
      "scripts/jia-session-isolation-integration.test.mjs",
      "scripts/jia-variation-inventory.test.mjs",
      "scripts/jia-workspace.test.mjs",
    ],
    gap: "Les tests couvrent le moteur et les garde-fous ; une session Talent réelle, les outils connectés et le parcours Internet Brain de bout en bout restent à démontrer.",
  },
  {
    id: "LOT-06",
    stage: 2, severity: "P1", dependsOn: ["LOT-02","LOT-03"],
    label: "Mobility et partenaires",
    files: ["scripts/mobility-p1.test.mjs"],
    gap: "Les API authentifiées du partenaire (profil, commissions et onboarding) sont exercées ; la demande Mobility côté Talent, l'éligibilité, les justificatifs, le financement et les actions partenaire de bout en bout restent à démontrer.",
  },
  {
    id: "LOT-07",
    stage: 2, severity: "P0", dependsOn: ["LOT-02","LOT-03"],
    label: "Paiements, abonnements et Mobile Money",
    files: [
      "scripts/billing-lifecycle.test.mjs",
      "scripts/payment-sms-ai.test.mjs",
      "scripts/payment-sms-android.test.mjs",
      "scripts/payment-sms-config.test.mjs",
      "scripts/payment-sms-customer-share.test.mjs",
      "scripts/payment-sms-devices.test.mjs",
      "scripts/payment-sms-matching.test.mjs",
      "scripts/payment-sms-parser.test.mjs",
    ],
    gap: "Le parsing, la configuration et le rapprochement sont testés hors transaction réelle ; aucun paiement opérateur ou SMS externe n'est envoyé.",
  },
  {
    id: "LOT-08",
    stage: 1, severity: "P2", dependsOn: ["LOT-01"],
    label: "Events, Community, Bons Plans et Campus",
    files: [
      "scripts/event-core-p1.test.mjs",
      "scripts/p2-community-bons-plans-campus.test.mjs",
      "scripts/company-logo-fallback.test.mjs",
    ],
    gap: "Les régressions automatisées sont couvertes ; publication réelle, inscriptions, interactions et modération avec comptes métier ne sont pas validées.",
  },
  {
    id: "LOT-09",
    stage: 2, severity: "P1", dependsOn: ["LOT-01","LOT-02"],
    label: "Career Journey, Admin 360 et BI",
    files: [],
    gates: ["scripts/career-os-gate.mjs"],
    gap: "Le gate statique Career OS est exécuté ; aucun scénario runtime authentifié Admin 360/BI, export ou persistance Career Journey n'est disponible dans la recette actuelle.",
  },
  {
    id: "LOT-10",
    stage: 3, severity: "P1", dependsOn: ["LOT-01","LOT-02","LOT-03","LOT-04","LOT-05","LOT-06","LOT-07","LOT-08","LOT-09"],
    label: "PWA, Android et régression transverse",
    files: [
      "scripts/android-jia-bridge.test.mjs",
      "scripts/offline-first.test.mjs",
      "scripts/jia-responsive-layout.test.mjs",
    ],
    gates: ["scripts/check-pwa.mjs"],
    gap: "Les contrôles statiques PWA et les tests mobile/offline sont exécutés ; installation PWA, synchronisation réelle et validation sur appareil Android physique restent à faire.",
  },
];

function isolatedEnvironment() {
  const env = { ...process.env };
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
    E2E_LOT_CONCURRENCY: String(GROUP_CONCURRENCY),
  });
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

async function exists(target) {
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
    stdio: [options.stdin ?? "ignore", "pipe", "pipe"],
  });
  const collect = (chunk) => {
    const value = chunk.toString();
    output += value;
    stream.write(value);
    if (options.forwardOutput) process.stdout.write(value);
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

function parseCount(output, label) {
  const match = output.match(new RegExp("ℹ\\s+" + label + "\\s+(\\d+)|#\\s+" + label + "\\s+(\\d+)", "g"));
  if (!match) return null;
  let total = 0;
  for (const line of match) {
    const values = line.match(/(\d+)/g);
    if (values?.length) total += Number(values[values.length - 1]);
  }
  return total;
}

async function executeLot(group, env) {
  console.log("[START] " + group.id + " — " + group.label);
  const started = performance.now();
  const missing = [];
  for (const file of [...group.files, ...(group.gates ?? [])]) {
    if (!(await exists(path.join(ROOT, file)))) missing.push(file);
  }
  if (missing.length) {
    return {
      id: group.id,
      label: group.label,
      status: "FAIL",
      testFiles: group.files,
      error: "Fichiers manquants : " + missing.join(", "),
      durationMs: Math.round(performance.now() - started),
    };
  }

  if (group.files.length === 0 && (!group.gates || group.gates.length === 0)) {
    return {
      id: group.id,
      label: group.label,
      status: "BLOCKED",
      testFiles: [],
      passed: 0,
      failed: 0,
      detail: group.gap,
      durationMs: 0,
    };
  }

  const logs = [];
  let testCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  if (group.files.length) {
    const testRun = await runProcess(
      group.id.toLowerCase() + "-tests",
      process.execPath,
      ["--experimental-strip-types", "--test", "--test-concurrency=" + FILE_CONCURRENCY, ...group.files],
      { env, timeoutMs: 300000 },
    );
    logs.push(testRun.log);
    testCount = parseCount(testRun.output, "tests") ?? 0;
    passedCount = parseCount(testRun.output, "pass") ?? 0;
    failedCount = parseCount(testRun.output, "fail") ?? (testRun.exitCode === 0 ? 0 : 1);
    if (testRun.exitCode !== 0) {
      return {
        id: group.id,
        label: group.label,
        status: "FAIL",
        testFiles: group.files,
        tests: testCount,
        passed: passedCount,
        failed: failedCount,
        log: logs.join(", "),
        error: testRun.spawnError ?? (testRun.timedOut ? "Timeout" : "Tests en échec"),
        failureEvidence: testRun.output.split(/\r?\n/).filter((line) => /not ok |✖|AssertionError|TypeError|ReferenceError|Error:|ERR_/i.test(line)).slice(0, 25).map((line) => line.trim().slice(0, 300)),
        durationMs: Math.round(performance.now() - started),
      };
    }
  }

  for (let index = 0; index < (group.gates ?? []).length; index += 1) {
    const gate = group.gates[index];
    const gateRun = await runProcess(
      group.id.toLowerCase() + "-gate-" + (index + 1),
      process.execPath,
      [gate],
      { env, timeoutMs: 90000 },
    );
    logs.push(gateRun.log);
    if (gateRun.exitCode !== 0) {
      return {
        id: group.id,
        label: group.label,
        status: "FAIL",
        testFiles: group.files,
        tests: testCount,
        passed: passedCount,
        failed: 1,
        log: logs.join(", "),
        error: gateRun.spawnError ?? (gateRun.timedOut ? "Gate timeout" : "Gate en échec : " + gate),
        durationMs: Math.round(performance.now() - started),
      };
    }
  }

  // A unit/static PASS cannot prove the authenticated business journey described by the catalogue.
  return {
    id: group.id,
    label: group.label,
    status: "PARTIAL",
    testFiles: group.files,
    tests: testCount,
    passed: passedCount,
    failed: 0,
    log: logs.join(", ") || null,
    detail: group.gap,
    durationMs: Math.round(performance.now() - started),
  };
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
  if (!(await exists(modulePath))) {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const install = await runProcess(
      "playwright-install",
      npm,
      ["install", "--prefix", ".e2e-tools", "--no-save", "--no-package-lock", "playwright@" + PLAYWRIGHT_VERSION],
      { env, timeoutMs: 240000, shell: process.platform === "win32" },
    );
    if (install.exitCode !== 0 || !(await exists(modulePath))) {
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

async function startNextServer(env, port, serviceRoleKey = "") {
  const nextCli = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  if (!(await exists(nextCli))) {
    return { ok: false, reason: "Next.js CLI absent ; les dépendances locales ne sont pas installées." };
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
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
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
      // Wait for Next.js to listen.
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
    "# Jobly — recette E2E par lots métier",
    "",
    "- Début : " + report.startedAt,
    "- Fin : " + report.completedAt,
    "- Commit : " + report.commit,
    "- Node.js : " + report.node,
    "- Environnement : JOBLY-E2E uniquement (" + EXPECTED_REF + ")",
    "- Parallélisme : " + GROUP_CONCURRENCY + " lots ; maximum " + FILE_CONCURRENCY + " fichiers par lot",
    "- Statut global : **" + report.status + "**",
    "- Lots : " + report.passedLots + " PASS ; " + report.partialLots + " PARTIAL ; " + report.blockedLots + " BLOCKED ; " + report.failedLots + " FAIL",
    "- Tests automatisés exécutés : " + report.totalTests,
    "",
    "| Lot | Gravité | Phase | Dépendances | Périmètre du cahier | Statut | Tests exécutés | Preuve / limite |",
    "|---|---|---:|---|---|---:|---:|---|",
  ];
  for (const item of report.lots) {
    const evidence = item.log ? "Journaux : " + item.log : null;
    const limitation = item.detail ?? item.error ?? null;
    const proof = [
      evidence,
      limitation ? "Limite : " + limitation : null,
    ].filter(Boolean).join(" — ") || "—";
    lines.push(
      "| " + item.id +
      " | " + (item.severity ?? "P0") +
      " | " + (item.stage === undefined ? "—" : item.stage) +
      " | " + (item.dependsOn?.join(", ") ?? "—") +
      " | " + item.label +
      " | **" + item.status + "**" +
      " | " + (item.tests ?? 0) +
      " | " + proof + " |"
    );
  }
  lines.push("", "## Anomalies regroupées par signature", "");
  if (report.anomalyGroups.length === 0) {
    lines.push("Aucune anomalie FAIL détectée dans les suites de lots exécutées.");
  } else {
    lines.push("| Gravité | Signature | Lots concernés | Journaux |", "|---|---|---|---|");
    for (const item of report.anomalyGroups) {
      lines.push("| " + item.severity + " | " + item.fingerprint + " | " + item.lots.join(", ") + " | " + item.logs.join(", ") + " |");
    }
  }
  lines.push("", "## Contrôles techniques transverses", "", "| Contrôle | Statut | Log |", "|---|---:|---|");
  for (const check of report.technicalChecks) {
    lines.push("| " + check.label + " | **" + check.status + "** | " + (check.log ?? check.detail ?? "—") + " |");
  }
  lines.push(
    "",
    "## Sécurité et limites",
    "",
    "- Toutes les connexions sont forcées vers JOBLY-E2E ; les variables sensibles connues sont neutralisées pour les processus enfants.",
    "- Aucun secret ni compte de JOBLY-PROD n'est utilisé. La clé privée JOBLY-E2E est saisie localement sans écho (ou lue depuis un fichier .env strictement E2E), conservée dans un fichier local ignoré par Git et utilisée uniquement en mémoire par le serveur Next local et le script de recette pour préparer/nettoyer des fixtures synthétiques JOBLY-E2E ; elle n'est jamais journalisée ni injectée dans le navigateur.",
    "- Les comptes Talent/Recruteur/Partenaire sont des fixtures synthétiques confirmées automatiquement dans JOBLY-E2E ; aucun e-mail, SMS ou paiement réel n'est envoyé.",
    "- Les PASS de tests unitaires ou statiques ne sont pas assimilés à une validation E2E authentifiée.",
    "- Le Lot 3 ne peut passer au vert qu'après les contrôles authentifiés du Recruteur, la preuve de persistance et la validation du nettoyage de l'offre brouillon.",
    "- Les statuts BLOCKED/PARTIAL restent visibles et empêchent le vert global.",
    "",
    "## Artefacts",
    "",
    "- Résumé : artifacts/e2e/local-recipe/summary.json et summary.md",
    "- Rapports de lot : artifacts/e2e/local-recipe/*.log",
    "- Auth session : artifacts/e2e/auth-session-smoke.json",
    "- Browser smoke : artifacts/e2e/lot1-auth-ui-smoke.json et captures PNG",
    "- Feedback unique : feedback-e2e-recette-complete.txt",
    "",
  );
  return lines.join("\n");
}

async function main() {
  await mkdir(LOGS, { recursive: true });
  await mkdir(ARTIFACTS, { recursive: true });
  const env = isolatedEnvironment();
  const startedAt = new Date().toISOString();
  const technicalChecks = [];
  const lots = [];

  console.log("[LOT 0] Préflight JOBLY-E2E en lecture seule");
  const preflight = await runProcess(
    "lot-00-preflight",
    process.execPath,
    ["e2e/lot0-preflight.mjs"],
    { env, timeoutMs: 45000 },
  );
  lots.push({
    id: "LOT-00",
    label: "Environnement et jeux de données",
    severity: "P0",
    stage: -1,
    dependsOn: [],
    status: preflight.exitCode === 0 ? "PARTIAL" : "FAIL",
    tests: 1,
    passed: preflight.exitCode === 0 ? 1 : 0,
    failed: preflight.exitCode === 0 ? 0 : 1,
    log: preflight.log,
    detail: preflight.exitCode === 0
      ? "Préflight Auth JOBLY-E2E PASS ; le contrôle courant RLS/grants, Storage et provisionnement des comptes métier reste incomplet. Baseline historique : e2e/README.md."
      : preflight.spawnError ?? "Préflight E2E en échec.",
  });

  let fixtureProvisionStatus = "BLOCKED";
  if (preflight.exitCode === 0 && !process.env.CI && !process.env.GITHUB_ACTIONS) {
    const existingFixtures = await readFileJson(path.join(ROOT, ".e2e-fixtures.json"));
    const existingRuntime = await readFileJson(path.join(ROOT, ".e2e-fixture-runtime.json"));
    const requiredFixtureRoles = [
      { key: "talent", role: "TALENT" },
      { key: "recruiter", role: "RECRUITER" },
      { key: "partner", role: "PARTNER" },
    ];
    const reusableFixtureAccounts =
      existingFixtures?.environment === "JOBLY-E2E" &&
      existingFixtures?.projectRef === EXPECTED_REF &&
      Array.isArray(existingFixtures.accounts) &&
      requiredFixtureRoles.every(({ key, role }) =>
        existingFixtures.accounts.some((account) =>
          account.key === key &&
          account.role === role &&
          typeof account.email === "string" &&
          account.email.length > 0 &&
          typeof account.password === "string" &&
          account.password.length > 0 &&
          typeof account.authUserId === "string" &&
          typeof account.userId === "string"
        )
      );
    const reusableRuntime =
      existingRuntime?.environment === "JOBLY-E2E" &&
      existingRuntime?.projectRef === EXPECTED_REF &&
      typeof existingRuntime?.serviceRoleKey === "string" &&
      existingRuntime.serviceRoleKey.length >= 20;

    if (reusableFixtureAccounts && reusableRuntime) {
      fixtureProvisionStatus = "PASS";
      technicalChecks.push({
        label: "Provisionnement des comptes Talent/Recruteur/Partenaire",
        status: "PASS",
        detail: "Réutilisation des trois fixtures JOBLY-E2E déjà provisionnées ; mots de passe inchangés, aucune rotation ni recréation.",
      });
    } else if (reusableFixtureAccounts) {
      console.log("[LOT 0] Restauration du runtime privé JOBLY-E2E sans recréer les comptes");
      const restore = await runProcess(
        "lot-00-fixture-runtime-restore",
        process.execPath,
        ["e2e/provision-fixtures.mjs", "--runtime-only"],
        { env, timeoutMs: 120000, stdin: "inherit", forwardOutput: true },
      );
      fixtureProvisionStatus = restore.exitCode === 0 ? "PASS" :
        /E2E_SERVICE_ROLE_KEY_REQUIRED|saisie masquée|Saisie interrompue/.test(restore.output)
          ? "BLOCKED"
          : "FAIL";
      technicalChecks.push({
        label: "Provisionnement des comptes Talent/Recruteur/Partenaire",
        status: fixtureProvisionStatus,
        log: restore.log,
        detail: fixtureProvisionStatus === "PASS"
          ? "Les trois comptes existants ont été revalidés ; runtime JOBLY-E2E restauré sans rotation, recréation ni modification de profil."
          : "Runtime privé non restauré. Les comptes existants n'ont pas été modifiés ; voir le journal.",
      });
    } else {
      console.log("[LOT 0] Provisionnement local sécurisé des comptes métier JOBLY-E2E");
      const provision = await runProcess(
        "lot-00-fixture-provision",
        process.execPath,
        ["e2e/provision-fixtures.mjs"],
        { env, timeoutMs: 180000, stdin: "inherit", forwardOutput: true },
      );
      fixtureProvisionStatus = provision.exitCode === 0 ? "PASS" :
        /E2E_SERVICE_ROLE_KEY_REQUIRED|E2E_EXISTING_FIXTURE_PRESERVED|saisie masquée|Saisie interrompue/.test(provision.output)
          ? "BLOCKED"
          : "FAIL";
      technicalChecks.push({
        label: "Provisionnement des comptes Talent/Recruteur/Partenaire",
        status: fixtureProvisionStatus,
        log: provision.log,
        detail: fixtureProvisionStatus === "PASS"
          ? "Comptes Auth confirmés et profils synthétiques créés sur JOBLY-E2E ; aucun message externe n'a été envoyé."
          : /E2E_EXISTING_FIXTURE_PRESERVED/.test(provision.output)
            ? "Comptes fixtures déjà présents : provisionnement complet arrêté sans modifier les mots de passe ni les profils. Restaurer les identifiants locaux ou autoriser une récupération ciblée."
            : "Provisionnement non terminé. Le détail est dans le journal ; aucun compte Production n'est utilisé.",
      });
    }
  } else {
    technicalChecks.push({
      label: "Provisionnement des comptes Talent/Recruteur/Partenaire",
      status: "BLOCKED",
      detail: preflight.exitCode !== 0
        ? "Préflight JOBLY-E2E non validé."
        : "Le provisionnement Auth Admin est exécuté localement uniquement ; aucun secret privé n'est injecté dans GitHub Actions.",
    });
  }

  console.log("[LOT 1] Contrôle de session Auth isolée");
  let authSession = null;
  if (preflight.exitCode === 0) {
    const auth = await runProcess(
      "lot-01-auth-session",
      process.execPath,
      ["e2e/auth-session-smoke.mjs"],
      { env, timeoutMs: 120000 },
    );
    authSession = await readFile(path.join(ARTIFACTS, "auth-session-smoke.json"), "utf8").then(JSON.parse).catch(() => null);
    technicalChecks.push({
      label: "Session Auth (complément du Lot 1)",
      status: authSession?.status ?? (auth.exitCode === 0 ? "PARTIAL" : "FAIL"),
      log: auth.log,
      detail: authSession?.reason ?? auth.spawnError ?? "Rapport Auth indisponible.",
    });
  } else {
    technicalChecks.push({ label: "Session Auth (complément du Lot 1)", status: "BLOCKED", detail: "Préflight E2E non validé." });
  }

  const lotResults = [];
  async function runStage(stage, label) {
    const queue = catalog.filter((group) => group.stage === stage);
    if (!queue.length) return;
    console.log("[PHASE " + stage + "] " + label + " — " + queue.length + " lot(s), maximum " + GROUP_CONCURRENCY + " en parallèle");
    const workers = Array.from({ length: Math.min(GROUP_CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const group = queue.shift();
        const result = await executeLot(group, env);
        lotResults.push({ ...result, stage: group.stage, severity: group.severity, dependsOn: group.dependsOn });
        console.log("[" + result.status + "] " + result.id + " — " + result.label +
          " ; " + (result.tests ?? 0) + " tests ; " + ((result.durationMs ?? 0) / 1000).toFixed(1) + " s");
      }
    });
    await Promise.all(workers);
  }

  // Dependency order: Auth first, core modules next, dependent modules after,
  // and transversal PWA/mobile regression last.
  await runStage(0, "Socle Auth et sécurité");
  await runStage(1, "Parcours cœur indépendants");
  await runStage(2, "Parcours dépendants Talent/Recruteur");
  await runStage(3, "Régression transversale finale");
  lotResults.sort((a, b) => catalog.findIndex((item) => item.id === a.id) - catalog.findIndex((item) => item.id === b.id));
  lots.push(...lotResults);

  console.log("[TECH] Typecheck");
  const typecheck = await runProcess(
    "technical-typecheck",
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["typecheck"],
    { env, timeoutMs: 240000, shell: process.platform === "win32" },
  );
  technicalChecks.push({
    label: "TypeScript — pnpm typecheck",
    status: typecheck.exitCode === 0 ? "PASS" : "FAIL",
    durationMs: typecheck.durationMs,
    log: typecheck.log,
    detail: typecheck.spawnError ?? (typecheck.timedOut ? "Timeout" : "tsc --noEmit"),
  });

  console.log("[TECH] Build Next.js");
  const build = await runProcess(
    "technical-build",
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["build"],
    { env, timeoutMs: 900000, shell: process.platform === "win32" },
  );
  technicalChecks.push({
    label: "Build production — pnpm build",
    status: build.exitCode === 0 ? "PASS" : "FAIL",
    durationMs: build.durationMs,
    log: build.log,
    detail: build.spawnError ?? (build.timedOut ? "Timeout" : "Next.js build"),
  });

  console.log("[TECH] Smoke navigateur, preuves UI et responsive");
  let browserReport = null;
  if (preflight.exitCode !== 0 || build.exitCode !== 0) {
    technicalChecks.push({
      label: "Playwright — navigateur/UI mobile/APIs",
      status: "BLOCKED",
      detail: preflight.exitCode !== 0 ? "Préflight E2E non validé." : "Build Next.js en échec.",
    });
  } else {
    const playwright = await ensurePlaywright(env);
    if (!playwright.ok) {
      technicalChecks.push({
        label: "Playwright — navigateur/UI mobile/APIs",
        status: "BLOCKED",
        detail: playwright.reason,
        log: playwright.log,
      });
    }

    // Authenticated API journeys do not depend on Playwright being installable.
    const port = await reserveLocalPort();
    const fixtureRuntime = await readFileJson(path.join(ROOT, ".e2e-fixture-runtime.json"));
    const runtimeKey = fixtureRuntime?.environment === "JOBLY-E2E" && fixtureRuntime?.projectRef === EXPECTED_REF
      ? fixtureRuntime.serviceRoleKey
      : "";
    const server = await startNextServer(env, port, runtimeKey);
    if (!server.ok) {
      if (playwright.ok) {
        technicalChecks.push({
          label: "Playwright — navigateur/UI mobile/APIs",
          status: "FAIL",
          detail: server.reason,
          log: server.log,
        });
      }
      technicalChecks.push({
        label: "Parcours API authentifiés Talent/Recruteur/Partenaire",
        status: "FAIL",
        detail: server.reason,
        log: server.log,
      });
    } else {
      try {
        if (playwright.ok) {
          const browser = await runProcess(
            "technical-browser-smoke",
            process.execPath,
            ["e2e/browser-smoke.mjs"],
            {
              env: {
                ...env,
                E2E_BASE_URL: server.baseURL,
                PLAYWRIGHT_MODULE_PATH: playwright.modulePath,
              },
              timeoutMs: 180000,
            },
          );
          browserReport = await readFile(path.join(ARTIFACTS, "lot1-auth-ui-smoke.json"), "utf8").then(JSON.parse).catch(() => null);
          const blocked = Array.isArray(browserReport?.blocked) ? browserReport.blocked.length : 0;
          const failed = Number(browserReport?.failed ?? (browser.exitCode === 0 ? 0 : 1));
          technicalChecks.push({
            label: "Playwright — navigateur/UI mobile/APIs",
            status: failed > 0 || browser.exitCode !== 0 ? "FAIL" : blocked > 0 ? "PARTIAL" : "PASS",
            tests: browserReport?.executed ?? null,
            passed: browserReport?.passed ?? null,
            blocked,
            log: browser.log,
            detail: blocked > 0 ? blocked + " contrôles Auth restent BLOCKED ; voir le rapport navigateur." : "Smoke navigateur exécuté.",
          });
        }

        const authenticated = await runProcess(
          "technical-authenticated-role-smoke",
          process.execPath,
          ["e2e/authenticated-role-smoke.mjs"],
          {
            env: { ...env, E2E_BASE_URL: server.baseURL },
            timeoutMs: 240000,
          },
        );
        const authenticatedReport = await readFileJson(path.join(ARTIFACTS, "authenticated-role-smoke.json"));
        technicalChecks.push({
          label: "Parcours API authentifiés Talent/Recruteur/Partenaire",
          status: authenticatedReport?.status ?? (authenticated.exitCode === 0 ? "PARTIAL" : "FAIL"),
          tests: authenticatedReport?.checks?.length ?? 0,
          passed: authenticatedReport?.checks?.filter((item) => item.status === "PASS").length ?? 0,
          log: authenticated.log,
          detail: authenticatedReport?.summary ?? authenticated.spawnError ?? "Rapport des parcours authentifiés indisponible.",
        });

        for (const [role, lotId] of [["TALENT", "LOT-02"], ["RECRUITER", "LOT-03"], ["PARTNER", "LOT-06"]]) {
          const lot = lots.find((item) => item.id === lotId);
          const checks = authenticatedReport?.checks?.filter((item) => item.role === role) ?? [];
          if (!lot) continue;
          if (checks.length) {
            lot.tests = Number(lot.tests ?? 0) + checks.length;
            lot.passed = Number(lot.passed ?? 0) + checks.filter((item) => item.status === "PASS").length;
            lot.failed = Number(lot.failed ?? 0) + checks.filter((item) => item.status === "FAIL").length;
            lot.status = checks.some((item) => item.status === "FAIL") ? "FAIL" : "PARTIAL";
            lot.log = [lot.log, authenticated.log].filter(Boolean).join(", ");
            lot.detail = "Parcours API authentifié " + role + " : " +
              checks.filter((item) => item.status === "PASS").length + "/" + checks.length +
              " contrôles PASS. " + (lot.detail ?? "");
          }
        }

        const lot03 = lots.find((item) => item.id === "LOT-03");
        if (lot03 && !authenticatedReport?.checks?.some((item) => item.role === "RECRUITER")) {
          lot03.status = fixtureProvisionStatus === "PASS" ? "FAIL" : "BLOCKED";
          lot03.detail = "Parcours Recruteur authentifié non exécuté : provisionnement des fixtures indisponible.";
        }
      } finally {
        await stopNextServer(server);
      }
    }
  }
  const lot1 = lots.find((item) => item.id === "LOT-01");
  if (lot1) {
    const authStatus = technicalChecks.find((item) => item.label.startsWith("Session Auth"))?.status ?? "BLOCKED";
    const browserStatus = technicalChecks.find((item) => item.label.startsWith("Playwright"))?.status ?? "BLOCKED";
    lot1.detail += " Session Auth : " + authStatus + ". Smoke UI : " + browserStatus + ".";
    if (browserStatus === "FAIL") lot1.status = "FAIL";
  }
  const lot10 = lots.find((item) => item.id === "LOT-10");
  if (lot10) {
    const browserStatus = technicalChecks.find((item) => item.label.startsWith("Playwright"))?.status ?? "BLOCKED";
    lot10.detail += " Contrôle responsive navigateur : " + browserStatus + ".";
    if (browserStatus === "FAIL") lot10.status = "FAIL";
  }

  const passedLots = lots.filter((item) => item.status === "PASS").length;
  const partialLots = lots.filter((item) => item.status === "PARTIAL").length;
  const blockedLots = lots.filter((item) => item.status === "BLOCKED").length;
  const failedLots = lots.filter((item) => item.status === "FAIL").length;
  const failedTechnical = technicalChecks.filter((item) => item.status === "FAIL").length;
  const blockedTechnical = technicalChecks.filter((item) => item.status === "BLOCKED").length;
  const partialTechnical = technicalChecks.filter((item) => item.status === "PARTIAL").length;
  const anomalyIndex = new Map();
  for (const item of lots.filter((lot) => lot.status === "FAIL")) {
    const evidence = item.failureEvidence?.length ? item.failureEvidence : [item.error ?? "Échec sans signature extraite"];
    for (const raw of evidence) {
      const fingerprint = raw
        .replace(/(?:[A-F0-9]{7,40})/gi, "<sha>")
        .replace(/\b\d+\b/g, "<n>")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 240);
      const key = fingerprint.toLowerCase();
      const current = anomalyIndex.get(key) ?? { fingerprint, severity: item.severity ?? "P0", lots: [], logs: [] };
      if (!current.lots.includes(item.id)) current.lots.push(item.id);
      if (item.log && !current.logs.includes(item.log)) current.logs.push(item.log);
      anomalyIndex.set(key, current);
    }
  }
  const anomalyGroups = [...anomalyIndex.values()];
  const report = {
    schemaVersion: 2,
    startedAt,
    completedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? "local",
    node: process.version,
    environment: "JOBLY-E2E",
    projectRef: EXPECTED_REF,
    groupConcurrency: GROUP_CONCURRENCY,
    fileConcurrency: FILE_CONCURRENCY,
    totalLots: lots.length,
    totalTests: lots.reduce((sum, item) => sum + Number(item.tests ?? 0), 0),
    passedLots,
    partialLots,
    blockedLots,
    failedLots,
    technicalChecks,
    anomalyGroups,
    status: failedLots > 0 || failedTechnical > 0
      ? "FAIL"
      : blockedLots > 0 || partialLots > 0 || blockedTechnical > 0 || partialTechnical > 0 || passedLots !== 11
        ? "PARTIAL"
        : "PASS",
    lots,
  };

  const markdown = reportMarkdown(report);
  await writeFile(path.join(LOGS, "summary.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  await writeFile(path.join(LOGS, "summary.md"), markdown, "utf8");
  await writeFile(path.join(ROOT, "feedback-e2e-recette-complete.txt"), markdown, "utf8");

  console.log("");
  console.log("BILAN DES 11 LOTS : " + passedLots + " PASS ; " + partialLots + " PARTIAL ; " + blockedLots + " BLOCKED ; " + failedLots + " FAIL ; " + report.totalTests + " tests automatisés.");
  console.log("CONTRÔLES TECHNIQUES : " + technicalChecks.map((item) => item.label + "=" + item.status).join(" | "));
  console.log("STATUT GLOBAL : " + report.status);
  console.log("Rapport unique : feedback-e2e-recette-complete.txt");

  if (report.status !== "PASS") process.exitCode = 1;
}

async function readFileJson(file) {
  return await readFile(file, "utf8").then(JSON.parse).catch(() => null);
}

async function mainSafe() {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error("[FATAL] " + message);
    try {
      await mkdir(LOGS, { recursive: true });
      await writeFile(path.join(LOGS, "fatal.txt"), message + "\n", "utf8");
    } catch {
      // Preserve the original failure if local storage is unavailable.
    }
    process.exitCode = 1;
  } finally {
    await unlink(path.join(ROOT, ".e2e-fixture-runtime.json")).catch(() => undefined);
  }
}

mainSafe();
