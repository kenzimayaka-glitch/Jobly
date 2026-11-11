import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const expectedProjectRef = "ofqqrryamslxoqkklraw";
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const runtimeRef = process.env.E2E_PROJECT_REF || "";

if (runtimeRef !== expectedProjectRef) {
  throw new Error(`E2E_PROJECT_REF mismatch: expected ${expectedProjectRef}, received ${runtimeRef || "(empty)"}`);
}
let parsedSupabaseURL;
try {
  parsedSupabaseURL = new URL(supabaseURL);
} catch {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing or invalid.");
}
if (parsedSupabaseURL.hostname !== `${expectedProjectRef}.supabase.co`) {
  throw new Error("Refusing to run: Supabase URL is not the isolated JOBLY-E2E project.");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for the browser smoke.");
}

const modulePath = process.env.PLAYWRIGHT_MODULE_PATH
  || path.resolve(".e2e-tools/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(path.resolve(modulePath)).href);
const evidenceDir = path.resolve("artifacts/e2e");
const authSessionReportPath = process.env.E2E_AUTH_SESSION_REPORT_PATH
  ? path.resolve(process.env.E2E_AUTH_SESSION_REPORT_PATH)
  : path.join(evidenceDir, "auth-session-smoke.json");
await mkdir(evidenceDir, { recursive: true });

const results = [];
const pageErrors = [];
const homeStatsResponses = [];
let browser = null;
let activeCheckId = "JOBLY-E2E-AUTH-001";

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    locale: "fr-FR",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/public/home-stats") {
      homeStatsResponses.push(response.status());
    }
  });

  // JOBLY-E2E-AUTH-001 — public welcome screen renders without a session.
  const homeStatsResponsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/public/home-stats",
    { timeout: 15000 },
  );
  const homeResponse = await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert.ok(homeResponse && homeResponse.status() < 500, `Home route returned ${homeResponse?.status() ?? "no response"}`);
  await page.locator('img[alt="JOBLY — Your Career OS"]').waitFor({ state: "visible", timeout: 15000 });
  activeCheckId = "JOBLY-E2E-HOME-001";
  const homeStatsResponse = await homeStatsResponsePromise;
  assert.equal(homeStatsResponse.status(), 200, `Homepage stats API must return HTTP 200; got ${homeStatsResponse.status()}.`);
  const homeStats = await homeStatsResponse.json();
  assert.ok(Number.isFinite(homeStats.offersCount) && homeStats.offersCount >= 0, "Homepage offers count is invalid.");
  assert.ok(Number.isFinite(homeStats.talentsCount) && homeStats.talentsCount >= 0, "Homepage talent count is invalid.");
  assert.ok(typeof homeStats.updatedAt === "string" && Number.isFinite(Date.parse(homeStats.updatedAt)), "Homepage stats timestamp is invalid.");
  const pageText = await page.locator("body").innerText();
  assert.ok(pageText.trim().length > 80, "Public home screen is unexpectedly empty.");
  await page.screenshot({ path: path.join(evidenceDir, "auth-home-desktop.png"), fullPage: true });
  results.push({ id: "JOBLY-E2E-AUTH-001", status: "PASS", evidence: "auth-home-desktop.png" });
  results.push({ id: "JOBLY-E2E-HOME-001", status: "PASS", evidence: `HTTP 200 · ${homeStats.offersCount} offres · ${homeStats.talentsCount} talents` });
  activeCheckId = "JOBLY-E2E-AUTH-002";

  // JOBLY-E2E-AUTH-002 — the welcome login journey reaches the username/password form.
  const loginCta = page.locator(".jobly-public-home-cta > button").nth(1);
  await loginCta.waitFor({ state: "visible", timeout: 10000 });
  await loginCta.click();
  const username = page.locator('input[autocomplete="username"]');
  await username.waitFor({ state: "visible", timeout: 15000 });
  const password = page.locator('input[autocomplete="current-password"]');
  await password.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await page.getByRole("button", { name: /google/i }).count(), "Google sign-in control is missing.");
  await page.screenshot({ path: path.join(evidenceDir, "auth-login-desktop.png"), fullPage: true });
  results.push({ id: "JOBLY-E2E-AUTH-002", status: "PASS", evidence: "auth-login-desktop.png" });

  // JOBLY-E2E-AUTH-003 — password visibility control is reversible.
  const showPassword = page.getByRole("button", { name: "Afficher le mot de passe" });
  await showPassword.click();
  assert.equal(await password.getAttribute("type"), "text", "Password is not revealed after the visibility control is used.");
  await page.getByRole("button", { name: "Masquer le mot de passe" }).click();
  assert.equal(await password.getAttribute("type"), "password", "Password visibility control did not return to masked state.");
  results.push({ id: "JOBLY-E2E-AUTH-003", status: "PASS", evidence: "auth-login-desktop.png" });
  activeCheckId = "JOBLY-E2E-AUTH-004";

  // JOBLY-E2E-AUTH-004 — signup form navigation and mandatory identity fields.
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await page.locator('input[autocomplete="family-name"]').waitFor({ state: "visible", timeout: 10000 });
  await page.locator('input[autocomplete="given-name"]').waitFor({ state: "visible", timeout: 5000 });
  await page.locator('input[autocomplete="tel"]').waitFor({ state: "visible", timeout: 5000 });
  await page.locator('input[autocomplete="email"]').waitFor({ state: "visible", timeout: 5000 });
  await page.screenshot({ path: path.join(evidenceDir, "auth-signup-desktop.png"), fullPage: true });
  results.push({ id: "JOBLY-E2E-AUTH-004", status: "PASS", evidence: "auth-signup-desktop.png" });
  activeCheckId = "JOBLY-E2E-AUTH-005";

  // JOBLY-E2E-AUTH-005 — mobile welcome screen has no horizontal viewport overflow.
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobile.locator('img[alt="JOBLY — Your Career OS"]').waitFor({ state: "visible", timeout: 15000 });
  const dimensions = await mobile.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, `Mobile horizontal overflow detected: viewport=${dimensions.viewport}, document=${dimensions.document}`);

  // The hero copy and artwork must not overlap at phone widths.
  const copyBox = await mobile.locator(".jobly-public-home-copy").boundingBox();
  const imageBox = await mobile.locator(".jobly-public-home-image").boundingBox();
  assert.ok(copyBox && imageBox, "Mobile hero copy or artwork is missing.");
  const overlapX = Math.min(copyBox.x + copyBox.width, imageBox.x + imageBox.width) - Math.max(copyBox.x, imageBox.x);
  const overlapY = Math.min(copyBox.y + copyBox.height, imageBox.y + imageBox.height) - Math.max(copyBox.y, imageBox.y);
  assert.ok(overlapX <= 0 || overlapY <= 0, `Mobile hero copy overlaps the artwork: copy=${JSON.stringify(copyBox)}, image=${JSON.stringify(imageBox)}`);

  await mobile.screenshot({ path: path.join(evidenceDir, "auth-home-mobile.png"), fullPage: true });
  results.push({ id: "JOBLY-E2E-AUTH-005", status: "PASS", evidence: "auth-home-mobile.png" });

  // JOBLY-E2E-AUTH-008..013 — protected Talent APIs deny anonymous visitors.
  // This checks the authorization boundary only; it never uses a real account token.
  const protectedApiChecks = [
    { id: "JOBLY-E2E-AUTH-008", path: "/api/profile" },
    { id: "JOBLY-E2E-AUTH-009", path: "/api/jobs" },
    { id: "JOBLY-E2E-AUTH-010", path: "/api/applications" },
    { id: "JOBLY-E2E-AUTH-011", path: "/api/talent/ai-bonus" },
    { id: "JOBLY-E2E-AUTH-012", path: "/api/talent/cv/original" },
    { id: "JOBLY-E2E-AUTH-013", path: "/api/career-journey" },
  ];
  for (const endpoint of protectedApiChecks) {
    activeCheckId = endpoint.id;
    const response = await page.evaluate(async (url) => {
      const result = await fetch(url, { method: "GET", credentials: "include", cache: "no-store" });
      return { status: result.status };
    }, endpoint.path);
    assert.equal(
      response.status,
      401,
      `Protected endpoint ${endpoint.path} must reject an anonymous visitor with HTTP 401; got ${response.status}.`,
    );
    results.push({ id: endpoint.id, status: "PASS", evidence: endpoint.path + " → HTTP 401" });
  }

  assert.deepEqual(pageErrors, [], "Uncaught browser errors occurred during the auth UI journey.");

  const homeStatsUnavailable = homeStatsResponses.some((status) => status >= 500);

  activeCheckId = "JOBLY-E2E-AUTH-006";
  // AUTH-006/007 are covered by the separate, real Supabase Auth lifecycle smoke.
  // Reconcile only a recent, complete PASS report from this exact JOBLY-E2E project.
  let authLifecycleEvidence = {
    status: "BLOCKED",
    sourceReport: path.basename(authSessionReportPath),
    reason: "Rapport Auth séparé absent, incomplet ou périmé.",
  };
  try {
    const authReport = JSON.parse(await readFile(authSessionReportPath, "utf8"));
    const ageMs = Date.now() - Date.parse(authReport.createdAt);
    const expectedRoles = ["TALENT", "RECRUITER", "PARTNER"];
    const accountsValid =
      Array.isArray(authReport.accounts) &&
      authReport.accounts.length === expectedRoles.length &&
      expectedRoles.every((role) => authReport.accounts.some((account) => account.role === role && account.status === "PASS"));
    const checksValid =
      Array.isArray(authReport.checks) &&
      authReport.checks.length === 12 &&
      authReport.checks.every((check) => check.status === "PASS");
    const fresh = Number.isFinite(ageMs) && ageMs >= -300000 && ageMs <= 6 * 60 * 60 * 1000;
    const valid =
      authReport.status === "PASS" &&
      authReport.environment === "JOBLY-E2E" &&
      authReport.projectRef === expectedProjectRef &&
      authReport.externalMessagesSent === false &&
      accountsValid &&
      checksValid &&
      fresh;

    authLifecycleEvidence = {
      status: valid ? "PASS" : "BLOCKED",
      sourceReport: "auth-session-smoke.json",
      createdAt: authReport.createdAt ?? null,
      checksPassed: Array.isArray(authReport.checks)
        ? authReport.checks.filter((check) => check.status === "PASS").length
        : 0,
      accounts: accountsValid ? expectedRoles : [],
      ageMinutes: Number.isFinite(ageMs) ? Math.round(ageMs / 60000) : null,
      reason: valid ? null : "Le rapport Auth ne satisfait pas les critères de fraîcheur, de projet ou de complétude (12/12 et 3 rôles).",
    };

    if (valid) {
      results.push({
        id: "JOBLY-E2E-AUTH-006",
        status: "PASS",
        evidence: "auth-session-smoke.json · 3 comptes synthétiques JOBLY-E2E confirmés",
      });
      results.push({
        id: "JOBLY-E2E-AUTH-007",
        status: "PASS",
        evidence: "auth-session-smoke.json · 3 connexions, vérifications de jeton et renouvellements de session",
      });
    }
  } catch {
    authLifecycleEvidence.reason = "Impossible de lire artifacts/e2e/auth-session-smoke.json.";
  }

  const report = {
    createdAt: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID || "local",
    commit: process.env.GITHUB_SHA || "unknown",
    environment: "JOBLY-E2E",
    projectRef: expectedProjectRef,
    baseURL,
    executed: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status === "FAIL").length,
    blocked: authLifecycleEvidence.status === "PASS" ? [] : [
      { id: "JOBLY-E2E-AUTH-006", status: "BLOCKED", reason: authLifecycleEvidence.reason },
      { id: "JOBLY-E2E-AUTH-007", status: "BLOCKED", reason: authLifecycleEvidence.reason },
    ],
    authLifecycleEvidence,
    results,
    mobileDimensions: dimensions,
    pageErrors,
    homeStatsResponses,
    limitations: [
      "The script does not submit signup, OTP, payment, application, email or external-provider requests.",
      "No service_role key, admin password, or Production credential is read or used.",
      "AUTH-006/007 are PASS only when a recent 12/12 authenticated-role session report for JOBLY-E2E is present; otherwise they remain BLOCKED.",
      "Homepage statistics are served by a zero-argument aggregate RPC; public roles cannot read the underlying Job or Profile tables.",
    ],
  };
  await writeFile(path.join(evidenceDir, "lot1-auth-ui-smoke.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  await mobile.close();
  await context.close();
} catch (error) {
  const failureText = error instanceof Error ? error.stack || error.message : String(error);
  await writeFile(path.join(evidenceDir, "failure.txt"), failureText);
  if (!results.some((result) => result.id === activeCheckId && result.status === "FAIL")) {
    results.push({ id: activeCheckId, status: "FAIL", evidence: error instanceof Error ? error.message : String(error) });
  }
  const authLifecycleEvidence = {
    status: "BLOCKED",
    sourceReport: path.basename(authSessionReportPath),
    reason: "Le smoke UI s'est interrompu avant la réconciliation du cycle Auth séparé.",
  };
  const failedReport = {
    createdAt: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID || "local",
    commit: process.env.GITHUB_SHA || "unknown",
    environment: "JOBLY-E2E",
    projectRef: expectedProjectRef,
    baseURL,
    executed: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status === "FAIL").length,
    blocked: [
      { id: "JOBLY-E2E-AUTH-006", status: "BLOCKED", reason: authLifecycleEvidence.reason },
      { id: "JOBLY-E2E-AUTH-007", status: "BLOCKED", reason: authLifecycleEvidence.reason },
    ],
    authLifecycleEvidence,
    results,
    mobileDimensions: null,
    pageErrors,
    homeStatsResponses,
    failure: {
      name: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error),
      stack: failureText,
    },
  };
  await writeFile(
    path.join(evidenceDir, "lot1-auth-ui-smoke.json"),
    JSON.stringify(failedReport, null, 2) + "\n",
    { encoding: "utf8", mode: 0o600 },
  );
  console.error(failureText);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
}
