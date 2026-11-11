import { spawn, execFileSync } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = path.join(ROOT, "artifacts", "e2e", "bulk");
const DEFAULT_GROUP_CONCURRENCY = 3;
const FILE_CONCURRENCY = 2;

const allGroups = [
  {
    id: "identity-talent-recruiter",
    label: "Auth, Talent, CV, Recruteur 360 et candidature externe",
    files: [
      "scripts/authentication-flow-regression.test.mjs",
      "scripts/external-application-assistant.test.mjs",
      "scripts/talent-cv-application-regression.test.mjs",
      "scripts/recruiter-role-regression.test.mjs",
    ],
  },
  {
    id: "africa-mobility",
    label: "Afrique, fraîcheur des offres et Mobility",
    files: [
      "scripts/africa-p0.test.mjs",
      "scripts/mobility-p1.test.mjs",
      "scripts/lib/supabase-batch-query.test.mjs",
    ],
  },
  {
    id: "jia-360-android",
    label: "J’IA 360, sessions, interface et pont Android",
    files: [
      "scripts/jia-access.test.mjs",
      "scripts/jia-conversation-write-guard.test.mjs",
      "scripts/jia-experience-engine.test.mjs",
      "scripts/jia-extension-onboarding.test.mjs",
      "scripts/jia-internet-brain.test.mjs",
      "scripts/jia-responsive-layout.test.mjs",
      "scripts/jia-session-isolation-integration.test.mjs",
      "scripts/jia-variation-inventory.test.mjs",
      "scripts/jia-workspace.test.mjs",
      "scripts/android-jia-bridge.test.mjs",
    ],
  },
  {
    id: "events-billing-ecosystem",
    label: "Événements, paiements, communauté et écosystème",
    files: [
      "scripts/event-core-p1.test.mjs",
      "scripts/billing-lifecycle.test.mjs",
      "scripts/p2-community-bons-plans-campus.test.mjs",
      "scripts/company-logo-fallback.test.mjs",
      "scripts/p2-jobly-offer-watermark.test.mjs",
    ],
  },
  {
    id: "mobile-money",
    label: "Mobile Money, analyse SMS et rapprochement",
    files: [
      "scripts/payment-sms-ai.test.mjs",
      "scripts/payment-sms-android.test.mjs",
      "scripts/payment-sms-config.test.mjs",
      "scripts/payment-sms-customer-share.test.mjs",
      "scripts/payment-sms-devices.test.mjs",
      "scripts/payment-sms-matching.test.mjs",
      "scripts/payment-sms-parser.test.mjs",
    ],
  },
  {
    id: "authenticated-runtime-contracts",
    label: "Contrats runtime authentifiés Talent, CV et Recruitment 360",
    files: ["scripts/e2e-authenticated-runtime-regression.test.mjs"],
  },
  {
    id: "security-offline",
    label: "Sécurité, droits, mots de passe et mode hors ligne",
    files: [
      "scripts/jobly-security-core.test.mjs",
      "scripts/security-entitlements.test.mjs",
      "scripts/p2-pwned-passwords.test.mjs",
      "scripts/offline-first.test.mjs",
    ],
  },
];

function selectGroups() {
  const index = process.argv.indexOf("--groups");
  if (index < 0) return allGroups;
  const raw = String(process.argv[index + 1] || "");
  const requested = new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
  const known = new Set(allGroups.map((group) => group.id));
  const unknown = [...requested].filter((id) => !known.has(id));
  if (unknown.length) throw new Error("Groupes bulk inconnus : " + unknown.join(", "));
  const selected = allGroups.filter((group) => requested.has(group.id));
  if (!selected.length) {
    throw new Error("Aucun groupe sélectionné. Utilise --groups <id1,id2> ou omets l'option pour tout exécuter.");
  }
  return selected;
}

const groups = selectGroups();

function readConcurrency() {
  const parsed = Number.parseInt(process.env.E2E_BULK_CONCURRENCY ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GROUP_CONCURRENCY;
  return Math.max(1, Math.min(6, parsed));
}

function readLocalCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || null;
  } catch {
    return null;
  }
}

function parseCount(log, label) {
  const patterns = [
    new RegExp("ℹ\\s+" + label + "\\s+(\\d+)", "g"),
    new RegExp("#\\s+" + label + "\\s+(\\d+)", "g"),
  ];
  let total = 0;
  let found = false;
  for (const pattern of patterns) {
    for (const match of log.matchAll(pattern)) {
      total += Number(match[1]);
      found = true;
    }
    if (found) break;
  }
  return found ? total : null;
}

async function runGroup(group) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const logPath = path.join(ARTIFACTS, group.id + ".log");
  const relativeLogPath = path.relative(ROOT, logPath).split(path.sep).join("/");
  const missing = [];

  for (const file of group.files) {
    try {
      await access(path.join(ROOT, file));
    } catch {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    const message = "Fichiers de test introuvables :\n" + missing.join("\n") + "\n";
    await writeFile(logPath, message, "utf8");
    return {
      id: group.id,
      label: group.label,
      status: "ERROR",
      exitCode: null,
      durationMs: Math.round(performance.now() - started),
      startedAt,
      files: group.files,
      log: relativeLogPath,
      tests: null,
      passed: null,
      failed: null,
      error: "MISSING_TEST_FILES",
    };
  }

  return await new Promise((resolve) => {
    const log = createWriteStream(logPath, { encoding: "utf8" });
    const args = [
      "--experimental-strip-types",
      "--test",
      "--test-concurrency=" + FILE_CONCURRENCY,
      ...group.files,
    ];
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    let spawnError = null;

    const collect = (chunk) => {
      const value = chunk.toString();
      output += value;
      log.write(value);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    child.on("error", (error) => {
      spawnError = error.message;
      log.write("\nRUNNER ERROR: " + error.message + "\n");
    });

    child.on("close", (code, signal) => {
      log.end(() => {
        const exitCode = typeof code === "number" ? code : 1;
        resolve({
          id: group.id,
          label: group.label,
          status: spawnError ? "ERROR" : exitCode === 0 ? "PASS" : "FAIL",
          exitCode,
          signal: signal ?? null,
          durationMs: Math.round(performance.now() - started),
          startedAt,
          files: group.files,
          log: relativeLogPath,
          tests: parseCount(output, "tests"),
          passed: parseCount(output, "pass"),
          failed: parseCount(output, "fail"),
          error: spawnError,
        });
      });
    });
  });
}

function markdownReport(report) {
  const lines = [
    "# Jobly — rapport des tests automatisés en bulk",
    "",
    "- Date UTC : " + report.startedAt,
    "- Commit : " + (report.commit ?? "non communiqué"),
    "- Node.js : " + report.node,
    "- Groupes exécutés en parallèle : " + report.groupConcurrency,
    "- Groupes sélectionnés : " + (report.selectedGroups || []).join(", "),
    "- Fichiers de test : " + report.testFileCount,
    "- Résultat : **" + report.passedGroups + "/" + report.totalGroups + " groupes réussis**",
    "",
    "| Groupe | Statut | Tests | Réussis | Échoués | Durée | Journal |",
    "|---|---:|---:|---:|---:|---:|---|",
  ];
  for (const result of report.results) {
    lines.push(
      "| " + result.label +
      " | **" + result.status + "**" +
      " | " + (result.tests ?? "—") +
      " | " + (result.passed ?? "—") +
      " | " + (result.failed ?? "—") +
      " | " + (result.durationMs / 1000).toFixed(1) + " s" +
      " | " + result.log + " |"
    );
  }
  lines.push(
    "",
    "> Ce rapport couvre les suites automatisées déjà présentes dans le dépôt. Il ne vaut pas validation des parcours UI authentifiés Talent/Recruteur, des opérations réelles de paiement, ni des écritures de production.",
    ""
  );
  return lines.join("\n");
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true });
  const concurrency = readConcurrency();
  const queue = [...groups];
  const results = [];
  const workers = Array.from(
    { length: Math.min(concurrency, groups.length) },
    async () => {
      while (queue.length > 0) {
        const group = queue.shift();
        console.log("[START] " + group.label);
        const result = await runGroup(group);
        results.push(result);
        console.log(
          "[" + result.status + "] " + result.label +
          " — " + (result.tests ?? "nombre de tests non extrait") +
          " tests, " + (result.durationMs / 1000).toFixed(1) + " s"
        );
      }
    }
  );

  const startedAt = new Date().toISOString();
  await Promise.all(workers);
  results.sort((a, b) => groups.findIndex((g) => g.id === a.id) - groups.findIndex((g) => g.id === b.id));

  const report = {
    schemaVersion: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? readLocalCommit(),
    node: process.version,
    groupConcurrency: concurrency,
    fileConcurrency: FILE_CONCURRENCY,
    totalGroups: groups.length,
    passedGroups: results.filter((result) => result.status === "PASS").length,
    failedGroups: results.filter((result) => result.status !== "PASS").length,
    selectedGroups: groups.map((group) => group.id),
    testFileCount: groups.reduce((sum, group) => sum + group.files.length, 0),
    results,
  };

  await writeFile(
    path.join(ARTIFACTS, "summary.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8"
  );
  await writeFile(path.join(ARTIFACTS, "summary.md"), markdownReport(report), "utf8");

  console.log("");
  console.log(
    "BILAN : " + report.passedGroups + "/" + report.totalGroups +
    " groupes réussis ; " + report.failedGroups + " groupe(s) en échec."
  );
  console.log("Rapports : artifacts/e2e/bulk/summary.md et summary.json");
  console.log("Journaux détaillés : artifacts/e2e/bulk/*.log");

  if (report.failedGroups > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[FATAL] " + (error instanceof Error ? error.stack : String(error)));
  process.exitCode = 1;
});
