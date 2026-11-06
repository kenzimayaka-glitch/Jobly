import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
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

const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || "";
if (serviceKey.split(".").length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(serviceKey.split(".")[1], "base64url").toString("utf8"));
    if (payload.ref && payload.ref !== expectedProjectRef) {
      throw new Error("Refusing to run: the server-side Supabase key belongs to a different project.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("belongs to a different project")) throw error;
  }
}

const modulePath = process.env.PLAYWRIGHT_MODULE_PATH
  || path.resolve(".e2e-tools/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(path.resolve(modulePath)).href);
const evidenceDir = path.resolve("artifacts/e2e");
await mkdir(evidenceDir, { recursive: true });

const results = [];
const pageErrors = [];
const homeStatsResponses = [];
const browser = await chromium.launch({ headless: true });

try {
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
  const homeResponse = await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert.ok(homeResponse && homeResponse.status() < 500, `Home route returned ${homeResponse?.status() ?? "no response"}`);
  await page.locator('img[alt="JOBLY — Your Career OS"]').waitFor({ state: "visible", timeout: 15000 });
  const pageText = await page.locator("body").innerText();
  assert.ok(pageText.trim().length > 80, "Public home screen is unexpectedly empty.");
  await page.screenshot({ path: path.join(evidenceDir, "auth-home-desktop.png"), fullPage: true });
  results.push({ id: "JOBLY-E2E-AUTH-001", status: "PASS", evidence: "auth-home-desktop.png" });

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

  // JOBLY-E2E-AUTH-004 — signup form navigation and mandatory identity fields.
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await page.locator('input[autocomplete="family-name"]').waitFor({ state: "visible", timeout: 10000 });
  await page.locator('input[autocomplete="given-name"]').waitFor({ state: "visible", timeout: 5000 });
  await page.locator('input[autocomplete="tel"]').waitFor({ state: "visible", timeout: 5000 });
  await page.locator('input[autocomplete="email"]').waitFor({ state: "visible", timeout: 5000 });
  await page.screenshot({ path: path.join(evidenceDir, "auth-signup-desktop.png"), fullPage: true });
  results.push({ id: "JOBLY-E2E-AUTH-004", status: "PASS", evidence: "auth-signup-desktop.png" });

  // JOBLY-E2E-AUTH-005 — mobile welcome screen has no horizontal viewport overflow.
  const mobile = await context.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobile.locator('img[alt="JOBLY — Your Career OS"]').waitFor({ state: "visible", timeout: 15000 });
  const dimensions = await mobile.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, `Mobile horizontal overflow detected: viewport=${dimensions.viewport}, document=${dimensions.document}`);
  await mobile.screenshot({ path: path.join(evidenceDir, "auth-home-mobile.png"), fullPage: true });
  results.push({ id: "JOBLY-E2E-AUTH-005", status: "PASS", evidence: "auth-home-mobile.png" });

  assert.deepEqual(pageErrors, [], "Uncaught browser errors occurred during the auth UI journey.");

  const missingServerKey = !serviceKey;
  const report = {
    createdAt: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID || "local",
    commit: process.env.GITHUB_SHA || "unknown",
    environment: "JOBLY-E2E",
    projectRef: expectedProjectRef,
    baseURL,
    executed: results.length,
    passed: results.length,
    failed: 0,
    blocked: missingServerKey ? [
      { id: "JOBLY-E2E-AUTH-006", status: "BLOCKED", reason: "E2E_SUPABASE_SERVICE_ROLE_KEY is not configured; server-backed identity and data checks were not run." },
      { id: "JOBLY-E2E-AUTH-007", status: "BLOCKED", reason: "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are not configured; actual Auth sign-in, session refresh and sign-out were not run." },
    ] : [],
    results,
    mobileDimensions: dimensions,
    pageErrors,
    homeStatsResponses,
    limitations: [
      "The script does not submit signup, OTP, login, payment, application, email or external-provider requests.",
      "UI PASS does not prove server-side authentication or database persistence.",
      ...(missingServerKey ? ["The home-stats endpoint may be unavailable without the dedicated E2E server key."] : []),
    ],
  };
  await writeFile(path.join(evidenceDir, "lot1-auth-ui-smoke.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  await mobile.close();
  await context.close();
} catch (error) {
  await writeFile(path.join(evidenceDir, "failure.txt"), error instanceof Error ? error.stack || error.message : String(error));
  throw error;
} finally {
  await browser.close();
}
