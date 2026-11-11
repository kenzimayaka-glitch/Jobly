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

  // Never import .env.production or .env.production.local from the source checkout:
  // this is a local production-mode build, but its data target must remain JOBLY-E2E.
  const require = createRequire(import.meta.url);
  const nextPackage = require.resolve("next/package.json");
  const nextRequire = createRequire(nextPackage);
  const dotenv = nextRequire("dotenv");
  const values = {};
  const origins = {};
  const files = [];

  for (const filename of [".env.local", ".env.e2e.local"]) {
    const filePath = path.join(sourceRoot, filename);
    try {
      const content = await readFile(filePath, "utf8");
      const parsed = dotenv.parse(content);
      files.push(filename);
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" && value.trim()) {
          values[key] = value.trim();
          origins[key] = filename;
        }
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  let runtimeSecret = "";
  const runtimePath = path.join(sourceRoot, ".e2e-fixture-runtime.json");
  try {
    const runtime = JSON.parse(await readFile(runtimePath, "utf8"));
    if (runtime.environment === "JOBLY-E2E" && runtime.projectRef === PROJECT_REF &&
        typeof runtime.serviceRoleKey === "string" && runtime.serviceRoleKey.length >= 20) {
      runtimeSecret = runtime.serviceRoleKey;
      files.push(".e2e-fixture-runtime.json");
    }
  } catch {}

  const effective = (key) => {
    const fromProcess = process.env[key];
    return typeof fromProcess === "string" && fromProcess.trim()
      ? { value: fromProcess.trim(), source: "CMD_ENV" }
      : { value: values[key] || "", source: origins[key] || "ABSENT" };
  };

  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]) {
    const candidate = effective(key);
    if (candidate.value && candidate.value !== SUPABASE_URL) {
      let actualProject = "INVALID_URL";
      try { actualProject = new URL(candidate.value).hostname.split(".")[0]; } catch {}
      throw new Error(key + "_NON_E2E_REFUSED_SOURCE_" + candidate.source + "_PROJECT_" + actualProject);
    }
  }

  const url = SUPABASE_URL;
  const publishable = effective("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const legacyAnon = effective("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const publishableKey = publishable.value || legacyAnon.value ||
    "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";

  const secretCandidates = [
    runtimeSecret,
    effective("SUPABASE_SECRET_KEY").value,
    effective("SUPABASE_SERVICE_ROLE_KEY").value,
    effective("SUPABASE_SERVICE_KEY").value,
  ];
  const secretKey = secretCandidates.find((value) => typeof value === "string" && value.trim()) || "";

  assert.ok(
    publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ"),
    "PUBLISHABLE_KEY_MISSING",
  );
  assert.ok(
    secretKey.startsWith("sb_secret_") || secretKey.startsWith("eyJ"),
    "E2E_SERVER_KEY_MISSING",
  );

  if (secretKey.startsWith("eyJ")) {
    const claims = JSON.parse(Buffer.from(secretKey.split(".")[1] || "", "base64url").toString("utf8"));
    assert.equal(claims.ref, PROJECT_REF, "SERVER_KEY_PROJECT_MISMATCH");
    assert.equal(claims.role, "service_role", "SERVER_KEY_ROLE_MISMATCH");
  }

  // Inherit only OS/toolchain variables. All service credentials are opt-in from
  // E2E files and are re-injected only after the E2E project checks below.
  const blocked = /(SUPABASE|DATABASE_URL|DIRECT_URL|POSTGRES|SERVICE_ROLE|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|RESEND|SMTP|SENDGRID|TWILIO|STRIPE|PAYPAL|MOBILE_MONEY|CLIENT_SECRET|API_KEY)/i;
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!blocked.test(key)) env[key] = value;
  }
  for (const [key, value] of Object.entries(values)) {
    if (!blocked.test(key) && (key.startsWith("NEXT_PUBLIC_") || key.startsWith("JOBLY_") ||
        key === "NEXT_TELEMETRY_DISABLED" || key === "NODE_OPTIONS")) {
      env[key] = value;
    }
  }
  env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  env.SUPABASE_URL = SUPABASE_URL;
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishableKey;
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = publishableKey;
  env.SUPABASE_PUBLISHABLE_KEY = publishableKey;
  env.SUPABASE_ANON_KEY = publishableKey;
  env.SUPABASE_SECRET_KEY = secretKey;
  env.SUPABASE_SERVICE_ROLE_KEY = secretKey;

  return {
    sourceRoot, env, url, publishableKey, secretKey,
    files: [...new Set(files)],
    urlSources: {
      public: effective("NEXT_PUBLIC_SUPABASE_URL").source,
      server: effective("SUPABASE_URL").source,
      serverKey: runtimeSecret ? ".e2e-fixture-runtime.json" :
        effective("SUPABASE_SECRET_KEY").value ? effective("SUPABASE_SECRET_KEY").source :
        effective("SUPABASE_SERVICE_ROLE_KEY").source,
    },
  };
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
