import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const SUPABASE_URL = "https://" + PROJECT_REF + ".supabase.co";
const GOOGLE_E2E_REDIRECT = "https://accounts.google.com/o/oauth2/v2/auth?client_id=jobly-e2e.invalid&redirect_uri=https%3A%2F%2Fjobly-e2e.invalid%2Fcallback&response_type=code";
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3217";
const FIXTURE_PATH = path.resolve(process.env.E2E_FIXTURE_PATH || ".e2e-fixtures.json");
const REPORT_PATH = path.resolve("artifacts/e2e/lot1-auth-advanced-smoke.json");
const REPORT = {
  createdAt: new Date().toISOString(),
  completedAt: null,
  commit: process.env.GITHUB_SHA || null,
  environment: "JOBLY-E2E",
  projectRef: PROJECT_REF,
  baseURL: BASE_URL,
  mode: "auth-advanced-browser",
  status: "BLOCKED",
  scenarios: {
    OTP_EMAIL_SIMULATION: { status: "NOT_RUN", checks: [], intercepted: { otp: 0, verify: 0 } },
    GOOGLE_OAUTH_SIMULATION: { status: "NOT_RUN", checks: [], intercepted: { authorize: 0 }, query: null },
    PASSWORD_RECOVERY_SIMULATION: { status: "NOT_RUN", checks: [], intercepted: { recover: 0, verify: 0 } },
    MULTI_DEVICE_REVOCATION: { status: "NOT_RUN", checks: [], baselineActiveDevices: null, cleanup: "NOT_RUN" },
  },
  pageErrors: [],
  blockedExternalRequests: [],
  unexpectedSupabaseRequests: [],
  credentialsPrinted: false,
  tokensPrinted: false,
  externalActions: false,
  remoteBusinessDataMayBeModified: false,
  remoteAuthDeviceStateMayBeModified: false,
  preexistingDeviceRowsUnchanged: null,
  limitations: [
    "OTP, Google OAuth and password recovery use strict browser-side interception; no real provider request is sent.",
    "Multi-device revocation uses two sessions from an existing synthetic JOBLY-E2E fixture and changes only rows created by this run.",
    "No account creation, password mutation, business-data mutation, email, SMS, payment or real Google authorization is performed."
  ]
};

class BlockedError extends Error {
  constructor(message) { super(message); this.name = "BlockedError"; }
}

function check(scenario, id, passed, detail, httpStatus = null) {
  scenario.checks.push({ id, status: passed ? "PASS" : "FAIL", httpStatus, detail: String(detail || "").slice(0, 180) });
  if (!passed) throw new Error("Assertion failed: " + id);
}

function responsePath(response) {
  try { return new URL(response.url()).pathname; } catch { return ""; }
}

async function readFixtures() {
  const document = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  assert.equal(document.environment, "JOBLY-E2E", "Fixtures non JOBLY-E2E refusées.");
  assert.equal(document.projectRef, PROJECT_REF, "ProjectRef des fixtures incorrect.");
  const account = document.accounts?.find((item) => item?.key === "talent" && item?.role === "TALENT");
  assert.ok(account, "Fixture Talent E2E absente.");
  assert.ok(account.username && account.password && account.authUserId, "Fixture Talent incomplète.");
  return account;
}

async function installNetworkGuard(context, authHandler = null, allowBrowserAuth = false) {
  const observations = { blockedExternalOrigins: [], blockedExternalRequests: [], unexpectedSupabaseRequests: [] };
  await context.route("**/*", async (route) => {
    const request = route.request();
    let url;
    try { url = new URL(request.url()); } catch { await route.abort(); return; }
    if (url.origin === BASE_URL) { await route.continue(); return; }
    if (url.origin === SUPABASE_URL) {
      if (authHandler) {
        const handled = await authHandler(route, url);
        if (handled) return;
      }
      if (allowBrowserAuth && /^\/auth\/v1\/(user|token|logout)$/.test(url.pathname)) {
        await route.continue();
        return;
      }
      observations.unexpectedSupabaseRequests.push(url.pathname + " " + request.method());
      await route.abort();
      return;
    }
    observations.blockedExternalOrigins.push(url.origin);
    const blockedRequest = {
      origin: url.origin,
      pathname: url.pathname,
      method: request.method(),
      resourceType: request.resourceType(),
      isNavigationRequest: request.isNavigationRequest(),
    };
    observations.blockedExternalRequests.push(blockedRequest);
    REPORT.blockedExternalRequests.push(blockedRequest);
    await route.abort();
  });
  return observations;
}

async function openHome(browser, authHandler) {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, locale: "fr-FR", reducedMotion: "reduce", serviceWorkers: "block" });
  const observations = await installNetworkGuard(context, authHandler, false);
  const page = await context.newPage();
  page.on("pageerror", (error) => REPORT.pageErrors.push(error?.name || "PageError"));
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  return { context, page, observations };
}

async function clickSignup(page) {
  const signup = page.getByRole("button", { name: "Créer mon compte", exact: true });
  await signup.waitFor({ state: "visible", timeout: 20000 });
  await signup.click();
  await page.locator('input[autocomplete="family-name"]').waitFor({ state: "visible", timeout: 25000 });
}

async function clickLogin(page) {
  const loginCta = page.locator(".jobly-public-home-cta > button").nth(1);
  await loginCta.waitFor({ state: "visible", timeout: 20000 });
  await loginCta.click();
  await page.locator('input[autocomplete="username"]').waitFor({ state: "visible", timeout: 20000 });
}

async function scenarioOtp(browser) {
  const result = REPORT.scenarios.OTP_EMAIL_SIMULATION;
  const calls = { otp: 0, verify: 0, email: null };
  const handler = async (route, url) => {
    const method = route.request().method();
    if (url.pathname === "/auth/v1/otp" && method === "POST") {
      calls.otp += 1;
      try { calls.email = route.request().postDataJSON()?.email || null; } catch {}
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "E2E OTP intercepted" }) });
      return true;
    }
    if (url.pathname === "/auth/v1/verify" && method === "POST") {
      calls.verify += 1;
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "otp_expired", message: "Token has expired or is invalid", status: 403 }) });
      return true;
    }
    return false;
  };
  let context;
  try {
    const opened = await openHome(browser, handler);
    context = opened.context;
    await clickSignup(opened.page);
    const email = "lot1-otp-" + randomUUID().slice(0, 8) + "@example.invalid";
    await opened.page.locator('input[autocomplete="family-name"]').fill("AUTH");
    await opened.page.locator('input[autocomplete="given-name"]').fill("E2E");
    await opened.page.locator('input[autocomplete="tel"]').fill("612345678");
    await opened.page.locator('input[type="email"]').fill(email);
    await opened.page.locator('form:has(input[type="email"]) button[type="submit"]').click();
    await opened.page.locator('input[autocomplete="one-time-code"]').waitFor({ state: "visible", timeout: 20000 });
    check(result, "OTP_REQUEST_ACCEPTED_BY_SIMULATOR", calls.otp === 1 && calls.email === email, "La demande OTP a été interceptée et l'écran de saisie du code est affiché.");
    await opened.page.locator('input[autocomplete="one-time-code"]').fill("000000");
    await opened.page.getByRole("button", { name: /Vérifier le code/i }).click();
    await opened.page.getByRole("status").last().waitFor({ state: "visible", timeout: 15000 });
    check(result, "OTP_INVALID_CODE_ERROR_VISIBLE", calls.verify === 1, "Le code invalide est intercepté et le parcours OTP affiche une erreur.");
    await opened.page.getByRole("button", { name: "Renvoyer le code", exact: true }).click();
    await opened.page.getByText("Un nouveau code vient d'être envoyé.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
    check(result, "OTP_RESEND_INTERCEPTED", calls.otp === 2, "Le renvoi déclenche un deuxième appel OTP simulé.");
    check(result, "OTP_NO_EXTERNAL_PROVIDER", opened.observations.unexpectedSupabaseRequests.length === 0, "Les appels OTP/verify sont simulés ; aucun endpoint Supabase non prévu n'est autorisé et toute origine externe est bloquée.");
    result.intercepted = { otp: calls.otp, verify: calls.verify };
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.error = error instanceof Error ? error.name : "RuntimeError";
    result.intercepted = { otp: calls.otp, verify: calls.verify };
  } finally {
    await context?.close().catch(() => undefined);
  }
}

function hasBlockedGoogleNavigation(requests) {
  return requests.some((request) => {
    try {
      return new URL(request.origin).hostname === "accounts.google.com" && request.isNavigationRequest;
    } catch { return false; }
  });
}

async function waitForBlockedGoogleNavigation(observations, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (!hasBlockedGoogleNavigation(observations.blockedExternalRequests) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return hasBlockedGoogleNavigation(observations.blockedExternalRequests);
}

async function scenarioGoogle(browser) {
  const result = REPORT.scenarios.GOOGLE_OAUTH_SIMULATION;
  const calls = { authorize: 0, provider: null, prompt: null, method: null, simulatedResponseStatus: null, redirectMechanism: null };
  const handler = async (route, url) => {
    if (url.pathname === "/auth/v1/authorize") {
      calls.authorize += 1;
      calls.provider = url.searchParams.get("provider");
      calls.prompt = url.searchParams.get("prompt");
      calls.method = route.request().method();
      // Do not synthesize a 3xx with route.fulfill(): Playwright follows redirects
      // outside the route chain, so the external hop cannot be intercepted there.
      // Serve local HTML that attempts navigation; the context-wide route records
      // and aborts accounts.google.com before any external network access.
      calls.simulatedResponseStatus = 200;
      calls.redirectMechanism = "local-html-location-replace";
      const redirectScript = "window.location.replace(" + JSON.stringify(GOOGLE_E2E_REDIRECT) + ");";
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><head><meta charset=\"utf-8\"></head><body><script>" + redirectScript + "</script></body></html>"
      });
      return true;
    }
    return false;
  };
  let context;
  try {
    const opened = await openHome(browser, handler);
    context = opened.context;
    await clickLogin(opened.page);
    // Le flux OAuth peut ouvrir un nouvel onglet : la garde est au niveau du contexte.
    // On vérifie sa trace d'interception, sans dépendre de requestfailed sur la page principale.
    await opened.page.getByRole("button", { name: /Continuer avec Google/i }).click({ noWaitAfter: true });
    const blockedProviderNavigation = await waitForBlockedGoogleNavigation(opened.observations);
    check(result, "GOOGLE_AUTHORIZE_INTERCEPTED", calls.authorize === 1 && calls.provider === "google" && calls.method === "GET" && calls.simulatedResponseStatus === 200 && calls.redirectMechanism === "local-html-location-replace", "L'action UI a émis une navigation authorize Google simulée par HTTP 302.");
    check(result, "GOOGLE_SELECT_ACCOUNT_PARAMETER", calls.prompt === "select_account", "Le paramètre prompt=select_account est présent.");
    check(result, "GOOGLE_PROVIDER_REDIRECT_BLOCKED", blockedProviderNavigation, "La requête de navigation vers le fournisseur Google a été interceptée et bloquée avant tout accès réseau.");
    check(result, "GOOGLE_NO_UNEXPECTED_SUPABASE", opened.observations.unexpectedSupabaseRequests.length === 0, "Aucun endpoint Supabase non prévu n'a été autorisé.");
    result.intercepted = { authorize: calls.authorize, simulatedResponseStatus: calls.simulatedResponseStatus, redirectMechanism: calls.redirectMechanism };
    result.query = { provider: calls.provider, prompt: calls.prompt, method: calls.method };
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.error = error instanceof Error ? error.name : "RuntimeError";
    result.intercepted = { authorize: calls.authorize, simulatedResponseStatus: calls.simulatedResponseStatus, redirectMechanism: calls.redirectMechanism };
    result.query = { provider: calls.provider, prompt: calls.prompt, method: calls.method };
  } finally {
    await context?.close().catch(() => undefined);
  }
}

async function scenarioRecovery(browser) {
  const result = REPORT.scenarios.PASSWORD_RECOVERY_SIMULATION;
  const calls = { recover: 0, verify: 0 };
  const handler = async (route, url) => {
    const method = route.request().method();
    if (url.pathname === "/auth/v1/recover" && method === "POST") {
      calls.recover += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      return true;
    }
    if (url.pathname === "/auth/v1/verify" && method === "POST") {
      calls.verify += 1;
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "otp_expired", message: "Token has expired or is invalid", status: 403 }) });
      return true;
    }
    return false;
  };
  let context;
  try {
    const opened = await openHome(browser, handler);
    context = opened.context;
    await clickLogin(opened.page);
    await opened.page.getByRole("button", { name: "Mot de passe oublié ?", exact: true }).click();
    const email = "lot1-recovery-" + randomUUID().slice(0, 8) + "@example.invalid";
    await opened.page.locator('input[type="email"]').fill(email);
    await opened.page.locator('form:has(input[type="email"]) button[type="submit"]').click();
    await opened.page.getByRole("heading", { name: "E-mail envoyé", exact: true }).waitFor({ state: "visible", timeout: 15000 });
    check(result, "RECOVERY_REQUEST_INTERCEPTED", calls.recover === 1, "La récupération est simulée et l'écran de confirmation s'affiche.");
    await opened.page.goto(BASE_URL + "/auth/reset-password?token_hash=invalid-e2e-token&type=recovery", { waitUntil: "domcontentloaded" });
    await opened.page.getByText(/Le lien de récupération est invalide ou a expiré/i).waitFor({ state: "visible", timeout: 15000 });
    check(result, "RECOVERY_INVALID_CALLBACK_HANDLED", calls.verify === 1, "Le callback refuse le jeton invalide ou expiré avec un message visible.");
    check(result, "RECOVERY_NO_EXTERNAL_PROVIDER", opened.observations.unexpectedSupabaseRequests.length === 0, "La requête de récupération et le callback sont simulés ; aucun endpoint Supabase non prévu n'est autorisé et toute origine externe est bloquée.");
    result.intercepted = calls;
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.error = error instanceof Error ? error.name : "RuntimeError";
    result.intercepted = calls;
  } finally {
    await context?.close().catch(() => undefined);
  }
}

function serviceHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key.startsWith("sb_secret_") && !key.startsWith("eyJ")) throw new BlockedError("Clé serveur JOBLY-E2E absente pour le préflight en lecture seule.");
  if (key.startsWith("eyJ")) {
    const claims = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString("utf8"));
    if (claims.ref !== PROJECT_REF || claims.role !== "service_role") throw new BlockedError("Clé JWT hors JOBLY-E2E refusée.");
  }
  return { apikey: key, Authorization: "Bearer " + key, Accept: "application/json" };
}

async function restRequest(table, query, method = "GET", body = undefined) {
  const url = new URL("/rest/v1/" + table, SUPABASE_URL);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method,
    headers: { ...serviceHeaders(), ...(body ? { "Content-Type": "application/json", Prefer: "return=representation" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new BlockedError("Préflight Supabase E2E impossible (HTTP " + response.status + ") sur " + table + ".");
  return payload;
}

async function readDeviceRows(userId) {
  const rows = await restRequest("UserDeviceSession", {
    select: "id,userId,deviceId,authSessionId,revokedAt,createdAt,lastSeenAt",
    userId: "eq." + userId,
    order: "createdAt.desc"
  });
  if (!Array.isArray(rows)) throw new BlockedError("Réponse inattendue pendant la lecture des appareils E2E.");
  return rows;
}

function stableBaseline(rows) {
  return rows.map((row) => ({
    id: row.id, deviceId: row.deviceId, authSessionId: row.authSessionId,
    revokedAt: row.revokedAt, createdAt: row.createdAt, lastSeenAt: row.lastSeenAt
  })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

async function browserToken(page) {
  return await page.evaluate(() => {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index) || "";
        if (!key.startsWith("sb-") || !key.includes("auth-token")) continue;
        const raw = storage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed.access_token === "string") return parsed.access_token;
        } catch {}
      }
    }
    return "";
  });
}

async function loginDeviceContext(browser, account, deviceId, deviceLabel) {
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    locale: "fr-FR",
    reducedMotion: "reduce",
    extraHTTPHeaders: { "x-jobly-device-id": deviceId, "x-jobly-device-name": deviceLabel }
  });
  const observations = await installNetworkGuard(context, null, true);
  const page = await context.newPage();
  page.on("pageerror", (error) => REPORT.pageErrors.push(error?.name || "PageError"));
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await clickLogin(page);
  await page.locator('input[autocomplete="username"]').fill(account.username);
  await page.locator('input[autocomplete="current-password"]').fill(account.password);
  const loginResponsePromise = page.waitForResponse((response) =>
    responsePath(response) === "/api/auth/username/login" && response.request().method() === "POST",
    { timeout: 25000 }
  );
  await page.getByRole("button", { name: /Se connecter/i }).click();
  const loginResponse = await loginResponsePromise;
  if (loginResponse.status() !== 200) throw new Error("La connexion de la fixture Talent a échoué (HTTP " + loginResponse.status() + ").");
  await page.waitForFunction(() => {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index) || "";
        if (!key.startsWith("sb-") || !key.includes("auth-token")) continue;
        try { if (JSON.parse(storage.getItem(key) || "{}").access_token) return true; } catch {}
      }
    }
    return false;
  }, { timeout: 15000 });
  const token = await browserToken(page);
  if (!token) throw new Error("Session navigateur absente après connexion fixture.");
  const deviceResponsePromise = page.waitForResponse((response) =>
    responsePath(response) === "/api/device-sessions" && response.request().method() === "GET",
    { timeout: 25000 }
  );
  await page.goto(BASE_URL + "/settings", { waitUntil: "domcontentloaded", timeout: 30000 });
  const deviceResponse = await deviceResponsePromise;
  const devicePayload = await deviceResponse.json().catch(() => ({}));
  if (deviceResponse.status() !== 200 || !Array.isArray(devicePayload.devices)) {
    throw new Error("Liste des appareils non accessible (HTTP " + deviceResponse.status() + ").");
  }
  return { context, page, token, devicePayload, observations };
}

async function authorizedStatus(route, token, deviceId, deviceLabel) {
  const response = await fetch(new URL(route, BASE_URL), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      "x-jobly-device-id": deviceId,
      "x-jobly-device-name": deviceLabel,
      "x-real-ip": "127.0.0.1",
      "Cache-Control": "no-store"
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store"
  });
  await response.body?.cancel().catch(() => undefined);
  return response.status;
}

async function scenarioMultiDevice(browser, account) {
  const result = REPORT.scenarios.MULTI_DEVICE_REVOCATION;
  const runId = randomUUID().replace(/-/g, "").slice(0, 12);
  const deviceA = "e2e-lot1-auth-" + runId + "-a";
  const deviceB = "e2e-lot1-auth-" + runId + "-b";
  const labelA = "Jobly E2E LOT-01 A " + runId;
  const labelB = "Jobly E2E LOT-01 B " + runId;
  let sessionA = null;
  let sessionB = null;
  let contextA = null;
  let contextB = null;
  let userId = null;
  let createdRows = [];
  let baseline = [];
  let failure = null;
  try {
    const users = await restRequest("User", { select: "id", authUserId: "eq." + account.authUserId });
    if (!Array.isArray(users) || users.length !== 1 || !users[0]?.id) throw new BlockedError("Identité interne Talent ambiguë ou absente dans JOBLY-E2E.");
    userId = users[0].id;
    const beforeRows = await readDeviceRows(userId);
    baseline = stableBaseline(beforeRows);
    const activeBefore = beforeRows.filter((row) => !row.revokedAt);
    result.baselineActiveDevices = activeBefore.length;
    if (activeBefore.length > 1) throw new BlockedError("Deux places libres non garanties : plus d'un appareil actif préexistant. Aucune session de test créée.");
    check(result, "DEVICE_PREFLIGHT_TWO_FREE_SLOTS", activeBefore.length <= 1, "Le compte dispose de deux places avant la création des sessions.");

    REPORT.remoteAuthDeviceStateMayBeModified = true;
    sessionA = await loginDeviceContext(browser, account, deviceA, labelA);
    contextA = sessionA.context;
    const rowsAfterA = await readDeviceRows(userId);
    createdRows = rowsAfterA.filter((row) => row.deviceId === deviceA);
    const baselineAfterA = stableBaseline(rowsAfterA.filter((row) => baseline.some((old) => old.id === row.id)));
    if (JSON.stringify(baselineAfterA) !== JSON.stringify(baseline)) throw new BlockedError("Une session préexistante a changé pendant l'enregistrement de A ; B ne sera pas créée.");
    if (rowsAfterA.filter((row) => !row.revokedAt).length > 2) throw new BlockedError("La création de A n'a pas préservé une place pour B ; arrêt avant création de B.");
    const aInList = sessionA.devicePayload.devices.find((row) => row.deviceId === deviceA && row.current && row.active);
    if (!aInList || createdRows.length !== 1) throw new BlockedError("La session A créée par ce run n'est pas identifiable sans ambiguïté.");

    sessionB = await loginDeviceContext(browser, account, deviceB, labelB);
    contextB = sessionB.context;
    const rowsAfterB = await readDeviceRows(userId);
    createdRows = rowsAfterB.filter((row) => row.deviceId === deviceA || row.deviceId === deviceB);
    const bInList = sessionB.devicePayload.devices.find((row) => row.deviceId === deviceB && row.current && row.active);
    if (!bInList || createdRows.length !== 2 || new Set(createdRows.map((row) => row.authSessionId)).size !== 2) {
      throw new BlockedError("Les deux sessions de test ne sont pas identifiables de façon unique ; aucune révocation lancée.");
    }
    if (rowsAfterB.filter((row) => !row.revokedAt).length > 3) throw new BlockedError("La limite de trois appareils actifs est dépassée ; révocation de test interrompue.");

    const refreshDevices = sessionA.page.waitForResponse((response) =>
      responsePath(response) === "/api/device-sessions" && response.request().method() === "GET",
      { timeout: 25000 }
    );
    await sessionA.page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    const refreshedResponse = await refreshDevices;
    const refreshed = await refreshedResponse.json().catch(() => ({}));
    if (refreshedResponse.status() !== 200 || !Array.isArray(refreshed.devices)) throw new Error("Relecture des appareils depuis A impossible.");
    const activeB = refreshed.devices.filter((row) => row.deviceId === deviceB && row.active && !row.current);
    const activeA = refreshed.devices.filter((row) => row.deviceId === deviceA && row.active && row.current);
    check(result, "DEVICE_A_AND_B_VISIBLE", activeA.length === 1 && activeB.length === 1, "A et B sont visibles séparément depuis l'interface A.");

    const section = sessionA.page.locator("section").filter({
      has: sessionA.page.getByRole("heading", { name: "Mes appareils connectés", exact: true })
    });
    const rowB = section.locator("div.rounded-2xl.border.border-slate-100").filter({ hasText: labelB });
    if (await rowB.count() !== 1) throw new BlockedError("La ligne UI du seul appareil B créé par ce run n'est pas unique.");
    const revokeButton = rowB.getByRole("button", { name: "Déconnecter", exact: true });
    if (await revokeButton.count() !== 1 || !(await revokeButton.isVisible())) throw new BlockedError("Le bouton de révocation de B n'est pas disponible dans la ligne ciblée.");
    const deletePromise = sessionA.page.waitForResponse((response) =>
      responsePath(response).startsWith("/api/device-sessions/") && response.request().method() === "DELETE",
      { timeout: 25000 }
    );
    await revokeButton.click();
    const deleteResponse = await deletePromise;
    const deletePayload = await deleteResponse.json().catch(() => ({}));
    check(result, "DEVICE_B_REVOKED_FROM_VISIBLE_UI", deleteResponse.status() === 200 && deletePayload.revokedDeviceId === deviceB, "A révoque B par le bouton visible et l'API confirme exactement B.", deleteResponse.status());

    const statusB = await authorizedStatus("/api/profile", sessionB.token, deviceB, labelB);
    const statusA = await authorizedStatus("/api/profile", sessionA.token, deviceA, labelA);
    check(result, "DEVICE_B_API_DENIED", statusB === 401, "La session B révoquée obtient HTTP 401.", statusB);
    check(result, "DEVICE_A_REMAINS_ACTIVE", statusA === 200, "La session A initiatrice conserve HTTP 200.", statusA);

    const afterRevoke = await readDeviceRows(userId);
    const rowA = afterRevoke.find((row) => row.deviceId === deviceA && row.authSessionId === createdRows.find((row) => row.deviceId === deviceA)?.authSessionId);
    const rowBState = afterRevoke.find((row) => row.deviceId === deviceB && row.authSessionId === createdRows.find((row) => row.deviceId === deviceB)?.authSessionId);
    if (!rowA || !rowBState || rowA.revokedAt || !rowBState.revokedAt) throw new Error("État serveur après révocation incohérent pour A/B.");
    check(result, "DEVICE_SERVER_STATE_CONFIRMED", true, "B est révoqué et A reste actif après les vérifications API.");
  } catch (error) {
    failure = error;
    result.status = error instanceof BlockedError ? "BLOCKED" : "FAIL";
    result.error = error instanceof Error ? error.name : "RuntimeError";
    result.detail = error instanceof Error ? error.message.slice(0, 220) : "Erreur non détaillée.";
  } finally {
    // Clean up only active device rows created by this run, never pre-existing rows.
    if (userId) {
      try {
        const currentRows = await readDeviceRows(userId);
        const currentOwned = currentRows.filter((row) => row.deviceId === deviceA || row.deviceId === deviceB);
        if (currentOwned.length > 2) throw new Error("Plus de deux lignes portent les identifiants uniques du run ; nettoyage refusé.");
        for (const owned of currentOwned) {
          if (baseline.some((old) => old.id === owned.id)) throw new Error("Collision avec une session préexistante : nettoyage refusé.");
          if (owned.revokedAt) continue;
          const updated = await restRequest("UserDeviceSession", {
            userId: "eq." + userId,
            deviceId: "eq." + owned.deviceId,
            authSessionId: "eq." + owned.authSessionId,
            revokedAt: "is.null"
          }, "PATCH", { revokedAt: new Date().toISOString() });
          if (!Array.isArray(updated) || updated.length !== 1) throw new Error("Une session créée par ce run n'a pas été nettoyée de façon unique.");
        }
        result.cleanup = currentOwned.length > 0 ? "PASS" : "NOT_REQUIRED";
      } catch {
        result.cleanup = "FAIL";
        if (result.status === "PASS") result.status = "FAIL";
      }
    } else {
      result.cleanup = "NOT_REQUIRED";
    }
    if (userId) {
      try {
        const finalRows = await readDeviceRows(userId);
        const finalBaseline = stableBaseline(finalRows.filter((row) => baseline.some((old) => old.id === row.id)));
        REPORT.preexistingDeviceRowsUnchanged = JSON.stringify(finalBaseline) === JSON.stringify(baseline);
        if (!REPORT.preexistingDeviceRowsUnchanged && result.status === "PASS") result.status = "FAIL";
      } catch {
        REPORT.preexistingDeviceRowsUnchanged = false;
        if (result.status === "PASS") result.status = "FAIL";
      }
    }
    await contextB?.close().catch(() => undefined);
    await contextA?.close().catch(() => undefined);
  }
  if (!failure && result.status === "NOT_RUN") result.status = "PASS";
  if (result.status === "PASS" && result.cleanup !== "PASS") result.status = "FAIL";
  if (REPORT.preexistingDeviceRowsUnchanged === false && result.status === "PASS") result.status = "FAIL";
}

async function main() {
  assert.equal(process.env.E2E_PROJECT_REF, PROJECT_REF, "Projet E2E inattendu.");
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, "URL Supabase non-E2E refusée.");
  assert.equal(new URL(BASE_URL).hostname, "127.0.0.1", "La recette doit rester sur le serveur local loopback.");
  const account = await readFixtures();
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || path.resolve(".e2e-tools/node_modules/playwright/index.mjs");
  const { chromium } = await import(pathToFileURL(path.resolve(modulePath)).href);
  const browser = await chromium.launch({ headless: true });
  try {
    await scenarioOtp(browser);
    await scenarioGoogle(browser);
    await scenarioRecovery(browser);
    await scenarioMultiDevice(browser, account);
  } finally {
    await browser.close().catch(() => undefined);
  }
  const statuses = Object.values(REPORT.scenarios).map((scenario) => scenario.status);
  REPORT.status = statuses.every((status) => status === "PASS") && REPORT.pageErrors.length === 0 && REPORT.preexistingDeviceRowsUnchanged === true
    ? "PASS"
    : statuses.some((status) => status === "FAIL") || REPORT.pageErrors.length > 0
      ? "FAIL"
      : "PARTIAL";
  REPORT.completedAt = new Date().toISOString();
}

try {
  await main();
} catch (error) {
  REPORT.status = "BLOCKED";
  REPORT.reason = error instanceof Error ? error.name : "PreflightError";
  REPORT.detail = error instanceof Error ? error.message.slice(0, 240) : "Préflight ou exécution interrompu.";
  REPORT.completedAt = new Date().toISOString();
}

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, JSON.stringify(REPORT, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({
  status: REPORT.status,
  environment: REPORT.environment,
  projectRef: REPORT.projectRef,
  scenarios: Object.fromEntries(Object.entries(REPORT.scenarios).map(([key, value]) => [key, value.status])),
  pageErrors: REPORT.pageErrors.length,
  blockedExternalRequests: REPORT.blockedExternalRequests.length,
  credentialsPrinted: REPORT.credentialsPrinted,
  tokensPrinted: REPORT.tokensPrinted,
  externalActions: REPORT.externalActions,
  remoteBusinessDataMayBeModified: REPORT.remoteBusinessDataMayBeModified,
  remoteAuthDeviceStateMayBeModified: REPORT.remoteAuthDeviceStateMayBeModified,
  preexistingDeviceRowsUnchanged: REPORT.preexistingDeviceRowsUnchanged
}, null, 2));
console.log("Rapport Auth avancée : artifacts/e2e/lot1-auth-advanced-smoke.json");
if (REPORT.status !== "PASS") process.exitCode = REPORT.status === "FAIL" ? 1 : 2;
