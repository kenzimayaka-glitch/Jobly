import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { openSync, closeSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, BASE_URL, PROJECT_REF, SUPABASE_URL, loadFixtures, loadRuntimeConfig, gitValue } from "./runtime-readonly-common.mjs";

const PORT = "3217";
const NEXT_CLI = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const SOURCE_ROOT_ARG = process.argv[2];
const ARTIFACTS = path.join(ROOT, "artifacts", "e2e");
const REPORT_PATH = path.join(ARTIFACTS, "parallel-runtime-server.json");
const LOG_PATH = path.join(ARTIFACTS, "parallel-runtime-server.log");
const PID_PATH = path.join(ARTIFACTS, "parallel-runtime-server.pid.json");

function runBuild(env) {
  return new Promise((resolve, reject) => {
    // package.json defines "build": "next build". Invoke the pinned Next CLI
    // through this same Node process; this avoids pnpm.cmd + shell=true on Windows.
    const child = spawn(process.execPath, [NEXT_CLI, "build"], {
      cwd: ROOT,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", (error) => {
      reject(new Error("NEXT_BUILD_SPAWN_FAILED: " + error.message));
    });
    child.once("close", (code, signal) => {
      if (signal) {
        reject(new Error("NEXT_BUILD_TERMINATED_" + signal));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

async function assertPortFree() {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(Number(PORT), "127.0.0.1", () => probe.close((error) => error ? reject(error) : resolve()));
  }).catch((error) => {
    if (error?.code === "EADDRINUSE") throw new Error("PORT_3217_ALREADY_IN_USE_STOP_OTHER_JOBLY_SERVER_FIRST");
    throw error;
  });
}

async function waitForServer(child) {
  let last = "NO_RESPONSE";
  for (let attempt = 0; attempt < 75; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("NEXT_SERVER_EXITED_" + String(child.exitCode ?? child.signalCode));
    }
    try {
      const response = await fetch(BASE_URL + "/api/profile", { cache: "no-store", signal: AbortSignal.timeout(2500) });
      await response.body?.cancel().catch(() => undefined);
      last = "HTTP_" + response.status;
      if (response.status === 401) return response.status;
      if (![502, 503, 504].includes(response.status)) throw new Error("SERVER_HEALTH_UNEXPECTED_" + response.status);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("SERVER_HEALTH_UNEXPECTED_")) throw error;
      last = error instanceof Error ? error.name : "NETWORK_ERROR";
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("NEXT_SERVER_NOT_READY_" + last);
}

async function verifyRuntimeScripts() {
  const files = [
    "e2e/runtime-readonly-common.mjs",
    "e2e/runtime-lot02-readonly.mjs",
    "e2e/runtime-lot03-readonly.mjs",
    "e2e/runtime-lot04-readonly.mjs",
    "e2e/start-readonly-runtime-server.mjs",
    "e2e/stop-readonly-runtime-server.mjs",
    "e2e/run-global-readonly-recipe.mjs",
  ];
  for (const file of files) {
    const checked = spawnSync(process.execPath, ["--check", file], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    if (checked.status !== 0) throw new Error("NODE_SYNTAX_CHECK_FAILED_" + file);
  }
  const regression = spawnSync(process.execPath, ["--test", "scripts/runtime-readonly-lots.test.mjs"], {
    cwd: ROOT, encoding: "utf8", stdio: "inherit", windowsHide: true,
  });
  if (regression.status !== 0) throw new Error("READ_ONLY_GUARDRAIL_TESTS_FAILED");
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true });
  const snapshotMode = process.argv.includes("--snapshot");
  const head = snapshotMode ? process.env.E2E_RECIPE_SHA || "" : gitValue(["rev-parse", "HEAD"]);
  if (snapshotMode) {
    assert.match(head, /^[0-9a-f]{40}$/, "SNAPSHOT_COMMIT_SHA_REQUIRED");
  } else {
    const upstream = gitValue(["rev-parse", "origin/e2e/recette"]);
    assert.ok(head && head === upstream, "WORKTREE_SHA_NOT_EQUAL_TO_ORIGIN_E2E_RECETTE");
    assert.equal(gitValue(["status", "--porcelain"]), "", "WORKTREE_NOT_CLEAN");
  }
  await assertPortFree();
  await verifyRuntimeScripts();

  const config = await loadRuntimeConfig(SOURCE_ROOT_ARG);
  const { document, fixturePath } = await loadFixtures(config.sourceRoot);
  const requiredFixtures = snapshotMode
    ? [["talent", "TALENT"]]
    : [["talent", "TALENT"], ["recruiter", "RECRUITER"]];
  for (const [key, role] of requiredFixtures) {
    assert.ok(document.accounts.some((item) => item?.key === key && item?.role === role && item.email && item.password),
      "FIXTURE_MISSING_" + role);
  }

  const probe = await fetch(SUPABASE_URL + "/rest/v1/", {
    method: "GET",
    headers: { apikey: config.secretKey, Accept: "application/openapi+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  await probe.body?.cancel().catch(() => undefined);
  assert.equal(probe.status, 200, "JOBLY_E2E_SERVER_KEY_READ_ONLY_PROBE_HTTP_" + probe.status);

  const env = {
    ...config.env,
    NODE_ENV: "production",
    E2E_PROJECT_REF: PROJECT_REF,
    E2E_BASE_URL: BASE_URL,
    E2E_FIXTURE_PATH: fixturePath,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: config.publishableKey,
    SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
    SUPABASE_ANON_KEY: config.publishableKey,
    NEXT_PUBLIC_JOBLY_PUBLIC_URL: BASE_URL,
    JOBLY_PUBLIC_URL: BASE_URL,
    JOBLY_API_BASE_URL: BASE_URL,
    SUPABASE_SECRET_KEY: config.secretKey,
  };
  env.SUPABASE_SERVICE_ROLE_KEY = config.secretKey;

  assert.ok(await (async () => {
    try { await readFile(NEXT_CLI); return true; } catch { return false; }
  })(), "NEXT_CLI_MISSING_RUN_PNPM_INSTALL_FIRST");

  console.log("Préflight JOBLY-E2E : PASS (projet, fixtures, clé serveur vérifiée en lecture seule).");
  console.log("Build unique du commit " + head + "…");
  const buildCode = await runBuild(env);
  if (buildCode !== 0) throw new Error("NEXT_BUILD_FAILED_" + buildCode);

  const logFd = openSync(LOG_PATH, "w");
  const child = spawn(process.execPath, [NEXT_CLI, "start", "--hostname", "127.0.0.1", "--port", PORT], {
    cwd: ROOT,
    env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  closeSync(logFd);
  if (!child.pid) throw new Error("NEXT_SERVER_PID_MISSING");
  child.unref();

  await writeFile(PID_PATH, JSON.stringify({
    pid: child.pid,
    port: Number(PORT),
    baseURL: BASE_URL,
    commit: head,
    startedAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
  }, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });

  const healthStatus = await waitForServer(child);
  const report = {
    createdAt: new Date().toISOString(),
    status: "PASS",
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    commit: head,
    baseURL: BASE_URL,
    port: Number(PORT),
    pid: child.pid,
    build: "PASS",
    localServer: "PASS",
    anonymousProtectedApiStatus: healthStatus,
    sourceEnvFiles: config.files,
    supabaseUrlSources: config.urlSources,
    credentialsPrinted: false,
    secretsPrinted: false,
    remoteBusinessDataMayBeModified: false,
    externalActions: false,
    report: REPORT_PATH,
    log: LOG_PATH,
  };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  console.log("Serveur JOBLY-E2E prêt pour le balayage global orchestré.");
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : "STARTUP_FAILED";
  const report = {
    createdAt: new Date().toISOString(),
    status: "FAIL",
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    reason: message.slice(0, 180),
    secretsPrinted: false,
    remoteBusinessDataMayBeModified: false,
  };
  await mkdir(ARTIFACTS, { recursive: true }).catch(() => undefined);
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 }).catch(() => undefined);
  console.error("DÉMARRAGE BLOQUÉ : " + message);
  process.exitCode = 1;
});
