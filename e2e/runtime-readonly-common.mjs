import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

export const PROJECT_REF = "ofqqrryamslxoqkklraw";
export const SUPABASE_URL = "https://" + PROJECT_REF + ".supabase.co";
export const BASE_URL = "http://127.0.0.1:3217";
export const ROOT = process.cwd();

export function gitValue(args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : "";
}

export async function loadRuntimeConfig(sourceRootArg) {
  const sourceRoot = path.resolve(sourceRootArg || process.env.JOBLY_SOURCE_ROOT || "");
  if (!sourceRoot || sourceRoot === path.parse(sourceRoot).root) {
    throw new Error("SOURCE_ROOT_INVALID");
  }
  const require = createRequire(import.meta.url);
  const nextPackage = require.resolve("next/package.json");
  const nextRequire = createRequire(nextPackage);
  const nextEnvPath = nextRequire.resolve("@next/env");
  const nextEnvRequire = createRequire(nextEnvPath);
  const dotenv = nextEnvRequire("dotenv");
  const { loadEnvConfig } = nextRequire("@next/env");
  const loaded = loadEnvConfig(sourceRoot, false, { info() {}, error() {} }, true);
  const values = {};
  for (const file of loaded.loadedEnvFiles || []) {
    const parsed = file.env && Object.keys(file.env).length ? file.env : dotenv.parse(file.contents || "");
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim() && !Object.prototype.hasOwnProperty.call(values, key)) values[key] = value;
    }
  }
  const overridePath = path.join(sourceRoot, ".env.e2e.local");
  try {
    await access(overridePath);
    const parsed = dotenv.parse(await readFile(overridePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) if (typeof value === "string" && value.trim()) values[key] = value;
  } catch {}
  const env = { ...loaded.combinedEnv, ...values };
  const publicUrl = values.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serverUrl = values.SUPABASE_URL || env.SUPABASE_URL || "";
  if (publicUrl && publicUrl !== SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL_NON_E2E_REFUSED");
  if (serverUrl && serverUrl !== SUPABASE_URL) throw new Error("SUPABASE_URL_NON_E2E_REFUSED");
  const url = publicUrl || serverUrl || "";
  const publishableKey = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || values.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const secretKey = values.SUPABASE_SECRET_KEY || values.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
  assert.equal(url, SUPABASE_URL, "SUPABASE_URL_NON_E2E_REFUSED");
  assert.ok(publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ"), "PUBLISHABLE_KEY_MISSING");
  assert.ok(secretKey.startsWith("sb_secret_") || secretKey.startsWith("eyJ"), "E2E_SERVER_KEY_MISSING");
  if (secretKey.startsWith("eyJ")) {
    const claims = JSON.parse(Buffer.from(secretKey.split(".")[1] || "", "base64url").toString("utf8"));
    assert.equal(claims.ref, PROJECT_REF, "SERVER_KEY_PROJECT_MISMATCH");
    assert.equal(claims.role, "service_role", "SERVER_KEY_ROLE_MISMATCH");
  }
  return { sourceRoot, env, url, publishableKey, secretKey, files: (loaded.loadedEnvFiles || []).map((f) => path.basename(f.path)) };
}

export async function loadFixtures(sourceRoot) {
  const fixturePath = path.join(sourceRoot, ".e2e-fixtures.json");
  const document = JSON.parse(await readFile(fixturePath, "utf8"));
  assert.equal(document.environment, "JOBLY-E2E", "FIXTURE_ENVIRONMENT_MISMATCH");
  assert.equal(document.projectRef, PROJECT_REF, "FIXTURE_PROJECT_MISMATCH");
  assert.ok(Array.isArray(document.accounts), "FIXTURE_ACCOUNTS_MISSING");
  return { fixturePath, document };
}

export async function signInFixture(config, fixtureDoc, key, role) {
  const account = fixtureDoc.accounts.find((item) => item?.key === key && item?.role === role);
  assert.ok(account?.email && account?.password, "FIXTURE_MISSING_" + role);
  const client = createClient(SUPABASE_URL, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error) throw new Error("AUTH_LOGIN_FAILED_" + role + "_" + (error.name || "AuthError"));
  assert.equal(data.user?.app_metadata?.e2e_fixture, true, "FIXTURE_MARKER_INVALID_" + role);
  assert.equal(data.user?.app_metadata?.e2e_role, role, "FIXTURE_ROLE_INVALID_" + role);
  assert.ok(data.session?.access_token, "AUTH_TOKEN_MISSING_" + role);
  return { token: data.session.access_token, userId: data.user.id };
}

export async function localGet(route, token) {
  const url = new URL(route, BASE_URL);
  assert.equal(url.hostname, "127.0.0.1", "NON_LOOPBACK_URL_REFUSED");
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + token, "x-real-ip": "127.0.0.1", "Cache-Control": "no-store" },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  const raw = await response.text();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { invalidJson: true }; }
  return { status: response.status, payload };
}

export function createReport(mode, reportPath) {
  return {
    createdAt: new Date().toISOString(),
    commit: gitValue(["rev-parse", "HEAD"]) || null,
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    baseURL: BASE_URL,
    mode,
    status: "RUNNING",
    checks: [],
    metrics: {},
    credentialsPrinted: false,
    tokensPrinted: false,
    externalActions: false,
    remoteBusinessDataMayBeModified: false,
    remoteAuthDeviceStateMayBeModified: true,
    reportPath,
    limitations: [
      "Lecture seule : aucune création, mise à jour ou suppression d'objet métier n'est effectuée par ce runner.",
      "Les sessions Auth synthétiques peuvent actualiser des métadonnées d'appareil ; remoteAuthDeviceStateMayBeModified reste true.",
      "Aucun e-mail, SMS, paiement, OAuth fournisseur, ingestion, réindexation ou appel d'envoi de candidature n'est exécuté.",
    ],
  };
}

export function addCheck(report, id, status, httpStatus = null, detail = "") {
  report.checks.push({ id, status, httpStatus, detail: String(detail).slice(0, 200) });
}

export async function saveReport(report, reportPath) {
  report.completedAt = new Date().toISOString();
  const failed = report.checks.filter((item) => item.status === "FAIL").length;
  const blocked = report.checks.filter((item) => item.status === "BLOCKED").length;
  report.status = failed ? "FAIL" : blocked ? "PARTIAL" : "PASS";
  report.summary = {
    executed: report.checks.length,
    passed: report.checks.filter((item) => item.status === "PASS").length,
    failed,
    blocked,
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  return report.status;
}

export function countsBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const name = String(row?.[key] ?? "NON_RENSEIGNE");
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}
