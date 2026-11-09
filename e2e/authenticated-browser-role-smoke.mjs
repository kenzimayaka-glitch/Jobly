import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const SUPABASE_URL = "https://" + PROJECT_REF + ".supabase.co";
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3217";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const FIXTURE_PATH = path.resolve(process.env.E2E_FIXTURE_PATH || ".e2e-fixtures.json");
const REPORT_PATH = path.resolve("artifacts/e2e/lot1-auth-role-ui-smoke.json");
const EXPECTED = [
  {
    key: "talent",
    role: "TALENT",
    landingPath: "/talent/profile",
    ownPageApi: "/api/auth/talent-showcase",
    ownApi: "/api/profile",
    cross: [
      { id: "TALENT-DENY-RECRUITER", path: "/api/recruiter/jobs", status: 403 },
      { id: "TALENT-DENY-PARTNER-PROFILE", path: "/api/partner/profile", status: 403 },
      { id: "TALENT-DENY-PARTNER-ONBOARDING", path: "/api/partner/ba-onboarding", status: 403 },
    ],
  },
  {
    key: "recruiter",
    role: "RECRUITER",
    landingPath: "/recruiter/jobs",
    ownPageApi: "/api/recruiter/jobs",
    ownApi: "/api/recruiter/jobs",
    cross: [
      { id: "RECRUITER-DENY-TALENT", path: "/api/talent/ai-bonus", status: 403 },
      { id: "RECRUITER-DENY-PARTNER-PROFILE", path: "/api/partner/profile", status: 403 },
      { id: "RECRUITER-DENY-PARTNER-ONBOARDING", path: "/api/partner/ba-onboarding", status: 403 },
    ],
  },
  {
    key: "partner",
    role: "PARTNER",
    landingPath: "/partner/payment",
    ownPageApi: "/api/partner/commissions",
    ownApi: "/api/partner/ba-onboarding",
    cross: [
      { id: "PARTNER-DENY-RECRUITER", path: "/api/recruiter/jobs", status: 403 },
      { id: "PARTNER-DENY-TALENT", path: "/api/talent/ai-bonus", status: 403 },
    ],
  },
];

const report = {
  createdAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || null,
  environment: "JOBLY-E2E",
  projectRef: PROJECT_REF,
  baseURL: BASE_URL,
  mode: "authenticated-role-browser",
  status: "BLOCKED",
  executed: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  roles: {},
  results: [],
  pageErrors: [],
  credentialsPrinted: false,
  tokensPrinted: false,
  externalActions: false,
  remoteBusinessDataMayBeModified: false,
  remoteAuthDeviceStateMayBeModified: true,
  logoutMethod: "isolated browser auth-storage teardown; no business profile data changed",
  limitations: [
    "The real username/password form is submitted for the three existing synthetic JOBLY-E2E fixtures.",
    "Authenticated route checks are GET-only. No offer, application, CV, payment, preference, profile or KYC mutation is performed.",
    "Authenticated API requests may refresh/register the current synthetic device-session metadata as part of normal Jobly authentication.",
    "Session teardown is validated by clearing only the isolated browser context auth storage and confirming anonymous API denial; visible logout-button clicks are not covered by this smoke.",
    "No OTP, Google OAuth, password-reset, payment, email or SMS provider flow is submitted.",
  ],
};

function record(role, id, status, httpStatus, detail) {
  report.results.push({
    role,
    id,
    status,
    httpStatus: httpStatus ?? null,
    detail: String(detail || "").slice(0, 180),
  });
  report.executed += 1;
  if (status === "PASS") report.passed += 1;
  else if (status === "FAIL") report.failed += 1;
  else report.blocked += 1;
}

function responsePath(response) {
  try { return new URL(response.url()).pathname; } catch { return ""; }
}

async function readAuthFixtures() {
  const document = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  assert.equal(document.environment, "JOBLY-E2E", "Fichier de fixtures non JOBLY-E2E refusé.");
  assert.equal(document.projectRef, PROJECT_REF, "Référence Supabase des fixtures inattendue.");
  assert.ok(Array.isArray(document.accounts), "Liste des fixtures absente.");

  const accounts = new Map();
  for (const spec of EXPECTED) {
    const account = document.accounts.find((item) => item?.key === spec.key && item?.role === spec.role);
    assert.ok(account, "Fixture manquante pour " + spec.role + ".");
    assert.ok(typeof account.username === "string" && account.username.trim(), "Username fixture manquant pour " + spec.role + ".");
    assert.ok(typeof account.email === "string" && account.email.includes("@"), "Email fixture manquant pour " + spec.role + ".");
    assert.ok(typeof account.password === "string" && account.password.length >= 8, "Secret fixture manquant pour " + spec.role + ".");
    assert.ok(typeof account.authUserId === "string" && account.authUserId.length > 0, "UID Auth fixture manquant pour " + spec.role + ".");
    accounts.set(spec.role, account);
  }
  return accounts;
}

async function authorizedGet(route, token) {
  const response = await fetch(new URL(route, BASE_URL), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      "x-real-ip": "127.0.0.1",
      "Cache-Control": "no-store",
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  await response.body?.cancel().catch(() => undefined);
  return response.status;
}

async function verifySignedRole(account, role, token) {
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    method: "GET",
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: "Bearer " + token,
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const user = await response.json().catch(() => ({}));
  return {
    status: response.status,
    valid: response.status === 200 &&
      String(user.email || "").toLowerCase() === String(account.email).toLowerCase() &&
      user.app_metadata?.e2e_fixture === true &&
      user.app_metadata?.e2e_role === role,
  };
}

async function runRole(browser, spec, account, chromium) {
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    reducedMotion: "reduce",
    locale: "fr-FR",
  });
  const page = await context.newPage();
  let accessToken = "";
  page.on("request", (request) => {
    if (accessToken) return;
    const authorization = request.headers()["authorization"] || "";
    if (authorization.startsWith("Bearer ")) accessToken = authorization.slice(7);
  });
  page.on("pageerror", (error) => report.pageErrors.push(spec.role + ":" + (error?.name || "PageError")));

  try {
    await page.addInitScript(({ landingPath }) => {
      try {
        if (sessionStorage.getItem("jobly:e2e-role-login-initialized") !== "1") {
          sessionStorage.setItem("jobly:after-login", landingPath);
          sessionStorage.setItem("jobly:e2e-role-login-initialized", "1");
        }
        localStorage.setItem("jobly-remember-me", "0");
        localStorage.removeItem("jobly-remember-until");
      } catch {}
    }, { landingPath: spec.landingPath });

    const loginResponsePromise = page.waitForResponse(
      (response) => responsePath(response) === "/api/auth/username/login" && response.request().method() === "POST",
      { timeout: 25000 },
    );
    const ownPageResponsePromise = page.waitForResponse(
      (response) => responsePath(response) === spec.ownPageApi && response.request().method() === "GET",
      { timeout: 30000 },
    );

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const loginCta = page.locator(".jobly-public-home-cta > button").nth(1);
    await loginCta.waitFor({ state: "visible", timeout: 15000 });
    await loginCta.click();

    const username = page.locator('input[autocomplete="username"]');
    const password = page.locator('input[autocomplete="current-password"]');
    await username.waitFor({ state: "visible", timeout: 15000 });
    await password.waitFor({ state: "visible", timeout: 10000 });
    await username.fill(account.username);
    await password.fill(account.password);

    const remember = page.locator('input[type="checkbox"]').first();
    if (await remember.count()) {
      if (await remember.isChecked()) await remember.uncheck();
    }
    await page.getByRole("button", { name: /Se connecter/i }).click();

    const loginResponse = await loginResponsePromise;
    record(
      spec.role,
      spec.role + "-LOGIN-FORM",
      loginResponse.status() === 200 ? "PASS" : "FAIL",
      loginResponse.status(),
      loginResponse.status() === 200 ? "Formulaire réel : connexion acceptée." : "Le formulaire de connexion a refusé la fixture.",
    );
    assert.equal(loginResponse.status(), 200, "Connexion formulaire échouée pour " + spec.role + ".");

    await page.waitForURL((url) => url.pathname === spec.landingPath, { timeout: 30000 });
    const ownPageResponse = await ownPageResponsePromise;
    record(
      spec.role,
      spec.role + "-ROLE-PAGE",
      ownPageResponse.status() === 200 ? "PASS" : "FAIL",
      ownPageResponse.status(),
      ownPageResponse.status() === 200 ? "Destination de l'espace chargée." : "Lecture de la page de rôle refusée.",
    );
    assert.equal(ownPageResponse.status(), 200, "Route propre au rôle indisponible pour " + spec.role + ".");
    await page.locator("body").waitFor({ state: "visible", timeout: 10000 });

    if (!accessToken) {
      try {
        accessToken = await page.evaluate(() => {
          for (const storage of [window.sessionStorage, window.localStorage]) {
            for (let index = 0; index < storage.length; index += 1) {
              const key = storage.key(index) || "";
              if (!key.startsWith("sb-") || !key.includes("auth-token")) continue;
              const raw = storage.getItem(key);
              if (!raw) continue;
              const parsed = JSON.parse(raw);
              if (typeof parsed.access_token === "string") return parsed.access_token;
            }
          }
          return "";
        });
      } catch {}
    }
    assert.ok(accessToken, "Jeton de session navigateur absent pour " + spec.role + ".");

    const signedRole = await verifySignedRole(account, spec.role, accessToken);
    record(
      spec.role,
      spec.role + "-SIGNED-ROLE",
      signedRole.valid ? "PASS" : "FAIL",
      signedRole.status,
      signedRole.valid ? "Supabase Auth confirme le compte synthétique et son rôle signé." : "Identité ou rôle signé différent de la fixture attendue.",
    );
    assert.equal(signedRole.valid, true, "Identité/role Auth non confirmé pour " + spec.role + ".");

    const ownStatus = await authorizedGet(spec.ownApi, accessToken);
    record(
      spec.role,
      spec.role + "-OWN-API",
      ownStatus === 200 ? "PASS" : "FAIL",
      ownStatus,
      ownStatus === 200 ? "API métier propre au rôle accessible en lecture." : "API propre au rôle non accessible.",
    );

    for (const check of spec.cross) {
      const status = await authorizedGet(check.path, accessToken);
      record(
        spec.role,
        check.id,
        status === check.status ? "PASS" : "FAIL",
        status,
        status === check.status ? "Réponse de refus/absence conforme au contrat observé." : "La frontière inter-rôles ne renvoie pas le statut attendu.",
      );
    }

    // Supabase's browser session is local to this isolated context. Remove only
    // this context's auth storage, reload the same route and confirm it is
    // treated as anonymous. No account/profile/application rows are changed.
    const storage = await page.evaluate(() => {
      let removed = 0;
      for (const target of [window.localStorage, window.sessionStorage]) {
        const keys = [];
        for (let index = 0; index < target.length; index += 1) {
          const key = target.key(index) || "";
          if (key.startsWith("sb-") && key.includes("auth-token")) keys.push(key);
        }
        for (const key of keys) {
          target.removeItem(key);
          removed += 1;
        }
      }
      localStorage.setItem("jobly-remember-me", "0");
      localStorage.removeItem("jobly-remember-until");
      return removed;
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    const anonymousStatus = await page.evaluate(async () => {
      const response = await fetch("/api/profile", { method: "GET", cache: "no-store", credentials: "include" });
      return response.status;
    });
    const teardownPassed = storage > 0 && anonymousStatus === 401;
    record(
      spec.role,
      spec.role + "-SESSION-TEARDOWN",
      teardownPassed ? "PASS" : "FAIL",
      anonymousStatus,
      teardownPassed ? "Stockage Auth isolé supprimé ; la route protégée redevient anonyme." : "La session du contexte isolé n'a pas été neutralisée comme attendu.",
    );
    report.roles[spec.role] = report.results.filter((item) => item.role === spec.role).every((item) => item.status === "PASS")
      ? "PASS"
      : "FAIL";
  } catch (error) {
    report.roles[spec.role] = "FAIL";
    record(
      spec.role,
      spec.role + "-RUNTIME",
      "FAIL",
      null,
      error instanceof Error ? error.name : "Erreur d'exécution non détaillée.",
    );
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function main() {
  assert.equal(process.env.E2E_PROJECT_REF, PROJECT_REF, "Projet E2E inattendu.");
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, "URL Supabase non-E2E refusée.");
  assert.ok(PUBLIC_KEY.startsWith("sb_publishable_") || PUBLIC_KEY.startsWith("eyJ"), "Clé publishable JOBLY-E2E absente.");
  assert.equal(new URL(BASE_URL).hostname, "127.0.0.1", "Le smoke authentifié doit rester sur le serveur local loopback.");

  const accounts = await readAuthFixtures();
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH
    || path.resolve(".e2e-tools/node_modules/playwright/index.mjs");
  const { chromium } = await import(pathToFileURL(path.resolve(modulePath)).href);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const spec of EXPECTED) {
      await runRole(browser, spec, accounts.get(spec.role), chromium);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const allRolesPass = EXPECTED.every((spec) => report.roles[spec.role] === "PASS");
  report.status = allRolesPass && report.failed === 0 && report.blocked === 0 && report.pageErrors.length === 0
    ? "PASS"
    : report.failed > 0
      ? "FAIL"
      : "PARTIAL";
  report.completedAt = new Date().toISOString();
}

try {
  await main();
} catch (error) {
  report.status = "BLOCKED";
  report.reason = error instanceof Error ? error.name : "Préflight ou exécution interrompu.";
  report.completedAt = new Date().toISOString();
}

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", {
  encoding: "utf8",
  mode: 0o600,
});
console.log(JSON.stringify({
  status: report.status,
  environment: report.environment,
  projectRef: report.projectRef,
  executed: report.executed,
  passed: report.passed,
  failed: report.failed,
  blocked: report.blocked,
  roles: report.roles,
  credentialsPrinted: report.credentialsPrinted,
  tokensPrinted: report.tokensPrinted,
  remoteBusinessDataMayBeModified: report.remoteBusinessDataMayBeModified,
  remoteAuthDeviceStateMayBeModified: report.remoteAuthDeviceStateMayBeModified,
}, null, 2));
console.log("Rapport navigateur rôles : artifacts/e2e/lot1-auth-role-ui-smoke.json");
if (report.status !== "PASS") process.exitCode = report.status === "FAIL" ? 1 : 2;
