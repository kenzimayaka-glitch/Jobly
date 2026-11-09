import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("app/page.tsx");
const accountSettingsPage = read("app/settings/page.tsx");
const auth = read("lib/auth.ts");
const loginRoute = read("app/api/auth/username/login/route.ts");
const completeSignup = read("app/api/auth/complete-signup/route.ts");
const googleCallback = read("app/auth/callback/page.tsx");
const identityStatus = read("app/api/auth/identity-status/route.ts");
const recruiterProfile = read("app/api/recruiter/profile/route.ts");
const talentShowcaseRoute = read("app/api/auth/talent-showcase/route.ts");
const videoPitchRoute = read("app/api/auth/video-pitch/route.ts");
const talentShowcaseImageRoute = read("app/api/auth/talent-showcase/image/route.ts");
const talentAdRoute = read("app/api/auth/talent-ad/route.ts");
const profilePhotoRoute = read("app/api/auth/profile-photo/route.ts");
const originalCvRoute = read("app/api/talent/cv/original/route.ts");
const cvImportRoute = read("app/api/talent/cv/import/route.ts");
const talentCvPage = read("app/talent/cvs/page.tsx");
const cvStudioPage = read("app/cv/page.tsx");
const recruiterJobs = read("app/api/recruiter/jobs/route.ts");
const mobilityAgreement = read("app/api/mobility/recruiter/agreement/route.ts");
const mobilityServer = read("lib/mobilityServer.ts");
const serverAuth = read("lib/server-auth.ts");
const onboarding = read("app/onboarding/page.tsx");
const authAdvancedSmoke = read("e2e/auth-advanced-browser-smoke.mjs");
const authRecipeRunner = read("e2e/run-authenticated-role-recipe.mjs");
const multiDeviceFixtureProvisioner = read("e2e/provision-multidevice-talent-fixture.mjs");

test("existing username/password authentication is not blocked by new-password strength rules", () => {
  const loginImplementation = auth.slice(auth.indexOf("export async function loginWithUsernamePassword"), auth.indexOf("export async function completeSignupProfile"));
  assert.doesNotMatch(loginImplementation, /validatePassword/);
  assert.match(home, /if \(!password\) return setMessage/);
});

test("username login errors are visible on the login screen exactly once", () => {
  const loginScreen = home.slice(home.indexOf('{screen === "login" && ('), home.indexOf('{screen === "signup" && ('));
  assert.match(loginScreen, /role="alert"/);
  assert.match(loginScreen, /aria-live="assertive"/);
  assert.equal((loginScreen.match(/aria-live="assertive"/g) || []).length, 1);
});

test("Google OAuth asks the user to choose an account", () => {
  assert.match(auth, /queryParams:\s*\{\s*prompt:\s*"select_account"\s*\}/);
});

test("multi-device E2E uses a separate Talent fixture and never mutates shared device rows", () => {
  assert.match(authAdvancedSmoke, /item\?\.key === "talent-multidevice"/);
  assert.match(authAdvancedSmoke, /item\?\.purpose === "MULTI_DEVICE_REVOCATION"/);
  assert.match(authAdvancedSmoke, /result\.fixtureKey = account\.key/);
  assert.match(multiDeviceFixtureProvisioner, /const PROJECT_REF = "ofqqrryamslxoqkklraw"/);
  assert.match(multiDeviceFixtureProvisioner, /auth\.admin\.createUser/);
  assert.match(multiDeviceFixtureProvisioner, /e2e_purpose: PURPOSE/);
  assert.match(multiDeviceFixtureProvisioner, /activeBefore > 1/);
  assert.match(multiDeviceFixtureProvisioner, /NO_PASSWORD_OR_SESSION_CHANGE/);
  assert.match(multiDeviceFixtureProvisioner, /existingDeviceRowsModified: false/);
  assert.match(multiDeviceFixtureProvisioner, /credentialsPrinted: false/);
  assert.doesNotMatch(multiDeviceFixtureProvisioner, /from\(["']UserDeviceSession["']\)\.(?:insert|update|delete)/);
  assert.doesNotMatch(multiDeviceFixtureProvisioner, /insert\s+into\s+auth\.users/i);
});

test("Google callback gates incomplete internal identities through onboarding", () => {
  assert.match(googleCallback, /\/api\/auth\/identity-status/);
  assert.match(googleCallback, /\/onboarding\?source=google/);
  assert.match(identityStatus, /needsSetup:\s*!hasUsername/);
  assert.match(onboarding, /googleSetup/);
  assert.match(onboarding, /Finaliser mon compte/);
});

test("legacy account linking and display-name recovery happen only after password verification", () => {
  const signInIndex = loginRoute.indexOf("signInWithPassword");
  const linkIndex = loginRoute.indexOf("const updates:");
  assert.ok(signInIndex >= 0 && linkIndex > signInIndex);
  assert.match(loginRoute, /\.is\("authUserId", null\)/);
  assert.match(loginRoute, /\.ilike\("displayName", username\)/);
  assert.match(loginRoute, /account_link_conflict/);
});

test("signup does not reject the account's own existing username row", () => {
  assert.ok(completeSignup.indexOf("const { data: existing") < completeSignup.indexOf("const { data: conflict"));
  assert.match(completeSignup, /conflict\.id !== existing\?\.id/);
});

test("Google profile details are requested when Google metadata is incomplete", () => {
  assert.match(onboarding, /Téléphone/);
  assert.match(onboarding, /Pays \(code ISO\)/);
  assert.match(onboarding, /Choisis un username de 1 à 40 caractères/);
  assert.match(onboarding, /draft\.firstName/);
  assert.match(onboarding, /draft\.lastName/);
});

test("authentication screens share the responsive Jobly experience shell", () => {
  const shell = read("components/AuthExperienceShell.tsx");
  for (const screen of ["login", "signup", "signup-otp", "signup-password", "forgot", "reset-sent"]) {
    assert.match(home, new RegExp('screen === "' + screen + '"'));
  }
  assert.equal((home.match(/<AuthExperienceShell/g) || []).length, 6);
  assert.match(shell, /min-h-\[100dvh\]/);
  assert.match(shell, /lg:grid-cols-/);
  assert.match(shell, /overflow-hidden/);
  assert.match(home, /autoComplete="one-time-code"/);
  assert.match(home, /aria-live="assertive"/);
});

test("Google identity completion uses the same responsive, stepped authentication shell", () => {
  assert.match(onboarding, /AuthExperienceShell/);
  assert.match(onboarding, /step=\{3\}/);
  assert.match(onboarding, /Finalise ton identité/);
});

test("legacy email-only User rows are linked before an insert can violate User_email_key", () => {
  const serverAuth = read("lib/server-auth.ts");
  const implementation = serverAuth.slice(
    serverAuth.indexOf("export async function ensureUser("),
    serverAuth.indexOf("export function cleanStrings"),
  );
  assert.match(implementation, /\.eq\("authUserId", authUser\.id\)/);
  assert.match(implementation, /const legacy = await findByEmail\(\)/);
  assert.match(implementation, /\.is\("authUserId", null\)/);
  assert.match(implementation, /\.update\(updates\)/);
  assert.match(implementation, /error\.code === "23505"/);
  assert.doesNotMatch(implementation, /\.insert\([\s\S]*?\)\s*\.select[\s\S]*?before/i);
});

test("email linking preserves an already linked account and rejects a different Auth owner", () => {
  const serverAuth = read("lib/server-auth.ts");
  const implementation = serverAuth.slice(
    serverAuth.indexOf("export async function ensureUser("),
    serverAuth.indexOf("export function cleanStrings"),
  );
  assert.match(implementation, /if \(existing\) return existing/);
  assert.match(implementation, /legacy\.authUserId === authUser\.id/);
  assert.match(implementation, /AUTH_USER_EMAIL_ALREADY_LINKED/);
});

test("recruiter subscription resolves RecruiterProfile by verified Supabase Auth UID", () => {
  const serverAuth = read("lib/server-auth.ts");
  const subscription = read("app/api/subscription/route.ts");
  assert.match(serverAuth, /authUserId: string/);
  assert.match(serverAuth, /\.eq\("userId", authUserId\)/);
  assert.match(subscription, /resolveBillingProductType\(supabase, user, auth\.id/);
});


test("RecruiterProfile ownership is resolved by Auth UID and its own legacy User.id row is conditionally relinked", () => {
  const resolver = serverAuth.slice(
    serverAuth.indexOf("export async function getRecruiterProfileForAuthUser"),
    serverAuth.indexOf("export async function ensureRecruiterProfileForAuthUser"),
  );
  assert.match(resolver, /\.eq\("userId", authUserId\)/);
  assert.match(resolver, /\.eq\("userId", internalUserId\)/);
  assert.match(resolver, /\.update\(\{ userId: authUserId, updatedAt:/);
  assert.match(resolver, /\.eq\("id", legacy\.id\)\s*\.eq\("userId", internalUserId\)/);
  assert.match(serverAuth, /getRecruiterProfileForAuthUser\(supabase, authUserId, internalUser\.id\)/);
  assert.match(serverAuth, /export async function ensureRecruiterProfileForAuthUser/);
});

test("recruiter profile, offer creation and Mobility convention share Auth UID profile ownership", () => {
  assert.equal((recruiterProfile.match(/ensureRecruiterProfileForAuthUser\(supabase, authUser\.id, user\.id\)/g) || []).length, 2);
  assert.match(recruiterProfile, /\.eq\("userId", authUser\.id\)/);
  assert.match(recruiterProfile, /from\("User"\)\.update\([\s\S]*?\.eq\("id", user\.id\)/);
  assert.match(recruiterJobs, /getRecruiterProfileForAuthUser\(supabase, authUserId, user\.id\)/);
  assert.match(recruiterJobs, /getRecruiterProfileForAuthUser\(supabase, authUser\.id, user\.id\)/);
  assert.match(recruiterJobs, /recruiterUserId: user\.id/);
  assert.match(mobilityAgreement, /getRecruiterProfileForAuthUser\(db, auth\.id, user\.id\)/);
  assert.match(mobilityAgreement, /recruiterUserId: user\.id/);
  assert.match(mobilityServer, /return ensureCanonicalUser\(sb, au\)/);
});


test("Talent showcase, Pitch, image and advertising APIs use canonical Auth identity resolution", () => {
  for (const route of [talentShowcaseRoute, videoPitchRoute, talentShowcaseImageRoute, talentAdRoute]) {
    assert.match(route, /getAuthUser\(/);
    assert.match(route, /ensureUser\(/);
    assert.match(route, /adminClient\(/);
    assert.doesNotMatch(route, /function admin\(|async function auth\(|async function user\(/);
    assert.doesNotMatch(route, /\.from\(["']User["']\)\.insert\(/);
  }
});

test("signup completion and profile-photo upload reconcile legacy email-only accounts", () => {
  const completeSignup = read("app/api/auth/complete-signup/route.ts");
  assert.match(completeSignup, /import \{ adminClient, ensureUser, getAuthUser \}/);
  assert.match(completeSignup, /\.ilike\("email", email\)/);
  assert.match(completeSignup, /legacyUser\.authUserId/);
  assert.match(completeSignup, /ensureUser\(supabase, authUser\)/);
  assert.ok(
    completeSignup.indexOf("ensureUser(supabase, authUser)") < completeSignup.indexOf('.insert({ id: crypto.randomUUID(), ...payload'),
    "Legacy identity reconciliation must happen before the new User insert.",
  );
  assert.match(profilePhotoRoute, /ensureUser\(supabase, authUser\)/);
  assert.doesNotMatch(profilePhotoRoute, /\.eq\("authUserId", authUser\.id\)/);
});

test("device-session limits are enforced after legacy email-only identity reconciliation", () => {
  const authHelper = read("lib/server-auth.ts");
  const handlerStart = authHelper.indexOf("export async function getAuthUser(");
  const handlerEnd = authHelper.indexOf("export async function ensureUser(", handlerStart);
  const handler = authHelper.slice(handlerStart, handlerEnd);
  const reconcileIndex = handler.indexOf("ensureUser(service, data.user)");
  const registerIndex = handler.indexOf('service.rpc("register_jobly_device_session"');
  assert.ok(reconcileIndex >= 0 && registerIndex > reconcileIndex);
  assert.match(handler, /if \(registrationError\) throw new Error\("Contrôle des appareils connectés indisponible\."/);
  assert.match(handler, /allowed\?: boolean/);
});

test("original CV storage and CV import reconcile legacy Auth accounts before lookup or upload", () => {
  for (const route of [originalCvRoute, cvImportRoute]) {
    assert.match(route, /getAuthUser\(/);
    assert.match(route, /ensureUser\(/);
    assert.match(route, /adminClient\(/);
    assert.doesNotMatch(route, /createClient\(/);
    assert.doesNotMatch(route, /\.eq\(["']authUserId["']/);
  }
  assert.match(originalCvRoute, /canonicalCvFileName\(user\)/);
  assert.match(cvImportRoute, /canonicalCvFileName\(user\)/);
});

test("CV Studio loads current plan and download prices with an authenticated, refreshed session", () => {
  const effectStart = cvStudioPage.indexOf('authenticatedFetch("/api/entitlements"');
  assert.ok(effectStart >= 0, "CV Studio must load the current entitlement snapshot.");
  const effect = cvStudioPage.slice(Math.max(0, effectStart - 700), effectStart + 900);
  assert.match(effect, /const response = await authenticatedFetch\("\/api\/entitlements"/);
  assert.match(cvStudioPage, /const headers = new Headers\(init\.headers\)/);
  assert.match(cvStudioPage, /headers\.set\("Authorization", "Bearer " \+ accessToken\)/);
  assert.match(cvStudioPage, /if \(result\?\.subscription\?\.plan\) setPlan\(String\(result\.subscription\.plan\)\)/);
  assert.match(cvStudioPage, /setCvAtsDownloadPriceXaf\(Number\.isFinite\(Number\(entitlements\.cvAtsDownloadPriceXaf\)\)/);
  assert.match(cvStudioPage, /setCvOptimizedDownloadPriceXaf\(Number\.isFinite\(Number\(entitlements\.cvOptimizedDownloadPriceXaf\)\)/);
  assert.match(read("app/api/entitlements/route.ts"), /productType/);
});

test("CV Studio persists and reloads free-text experience and education without fabricating structured records", () => {
  const profileApi = read("app/api/profile/route.ts");
  const applicationApi = read("app/api/applications/route.ts");
  const applicationCv = read("lib/applicationCv.ts");
  const schema = read("packages/database/prisma/schema.prisma");
  const migration = read("supabase/migrations/20261107010000_talent_cv_text_sections.sql");

  assert.ok(schema.includes("experienceSummary"));
  assert.ok(schema.includes("educationSummary"));
  assert.match(migration, /add column if not exists "experienceSummary" text/);
  assert.match(migration, /add column if not exists "educationSummary" text/);
  assert.match(profileApi, /section === "cv-text"/);
  assert.match(profileApi, /cvTextPayload\.experienceSummary = body\.experienceSummary\.trim\(\)\.slice\(0, 20000\)/);
  assert.match(profileApi, /cvTextPayload\.educationSummary = body\.educationSummary\.trim\(\)\.slice\(0, 12000\)/);
  assert.ok(talentCvPage.includes('section: "cv-text"'));
  assert.match(talentCvPage, /profile\.experienceSummary \|\| structuredExperiences/);
  assert.match(talentCvPage, /profile\.educationSummary \|\| structuredEducation/);
  assert.match(applicationApi, /experienceSummary,educationSummary/);
  assert.match(applicationApi, /profileRes\.data\?\.experienceSummary\?\.trim\(\)/);
  assert.match(applicationApi, /profileRes\.data\?\.educationSummary\?\.trim\(\)/);
  assert.match(applicationCv, /experienceSummary\?\.trim\(\)/);
  assert.match(applicationCv, /educationSummary\?\.trim\(\)/);
  assert.ok(applicationCv.includes("Expérience déclarée/importée (texte CV non structuré)"));
  assert.ok(applicationCv.includes("Formation déclarée/importée (texte CV non structuré)"));
});

test("Talent Showcase plan and image quotas are enforced by the server with Promo-aware entitlements", () => {
  const entitlement = read("lib/talentShowcaseEntitlements.ts");
  const showcase = read("app/api/auth/talent-showcase/route.ts");
  const pitch = read("app/api/auth/video-pitch/route.ts");
  const images = read("app/api/auth/talent-showcase/image/route.ts");
  const advertising = read("app/api/auth/talent-ad/route.ts");
  assert.match(entitlement, /getActivePlanCode\(supabase, userId, "TALENT"\)/);
  for (const route of [showcase, pitch, images, advertising]) {
    assert.match(route, /getTalentShowcasePlan\(/);
    assert.doesNotMatch(route, /from\(["']Subscription["']\)\.select\(["']plan/);
  }
  assert.match(images, /TALENT_SHOWCASE_LIMITS\[plan\]\.images/);
  assert.match(images, /uniqueExistingImages\.length >= limit/);
  assert.match(images, /ALLOWED_TYPES/);
  assert.match(images, /actionImages: nextImages/);
  assert.match(advertising, /ALLOWED\.has\(f\.type\)/);
  assert.match(advertising, /status:415/);
  assert.match(showcase, /requestedImages\.length > limit/);
  assert.match(showcase, /invalidAdditions\.length/);
  assert.match(showcase, /storage\.from\("talent-showcase"\)\.remove\(removedPaths\)/);
});

test("Talent Showcase surfaces server image quota and upload validation errors", () => {
  const component = read("components/TalentShowcaseStudio.tsx");
  const uploadApi = read("app/api/auth/talent-showcase/image/route.ts");
  assert.match(component, /const remaining=Math\.max\(0,lim\.images-d\.actionImages\.length\)/);
  assert.ok(component.includes('if(!response.ok)throw new Error(body.message||"Impossible d’ajouter cette image.");'));
  assert.ok(component.includes('catch(error){setMsg(error instanceof Error?error.message:"Upload impossible.");}'));
  assert.match(uploadApi, /status: 415/);
  assert.match(uploadApi, /status: 413/);
  assert.match(uploadApi, /status: 409/);
  assert.match(uploadApi, /actionImages: nextImages/);
});

test("Gmail candidate connection is restricted to Talent at authorization and callback", () => {
  const gmail = read("lib/candidateGmail.ts");
  const connect = read("app/api/talent/gmail/connect/route.ts");
  const status = read("app/api/talent/gmail/status/route.ts");
  const callback = read("app/api/talent/gmail/callback/route.ts");
  assert.match(gmail, /String\(user\.role \|\| ""\)\.toUpperCase\(\) !== "TALENT"/);
  assert.match(gmail, /return null/);
  for (const route of [connect, status]) {
    assert.match(route, /candidateContext\(request\)/);
  }
  assert.match(callback, /\.from\("User"\)/);
  assert.match(callback, /\.eq\("id", userId\)/);
  assert.match(callback, /owner\.role \|\| ""\)\.toUpperCase\(\) !== "TALENT"/);
  assert.ok(callback.indexOf("owner.role") < callback.indexOf("exchangeCode(code, request)"));
});

test("CV share links expire after 30 days and only their Talent owner can revoke them", () => {
  const api = read("app/api/cv-share/route.ts");
  const publicJson = read("app/api/cv-share/[token]/route.ts");
  const publicPdf = read("app/api/cv-share/[token]/pdf/route.ts");
  const studio = read("app/talent/cvs/page.tsx");
  assert.match(api, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(api, /expiresAt,/);
  assert.match(api, /\.eq\("userId", user\.id\)/);
  assert.match(api, /\.is\("revokedAt", null\)/);
  const revokeStart = api.indexOf("export async function PATCH");
  const createStart = api.indexOf("export async function POST");
  assert.ok(revokeStart >= 0 && createStart > revokeStart, "CV share revocation must use a PATCH handler before the POST handler.");
  const revokeRoute = api.slice(revokeStart, createStart);
  assert.match(revokeRoute, /\.eq\("userId", user\.id\)/);
  assert.match(revokeRoute, /\.is\("revokedAt", null\)/);
  for (const route of [publicJson, publicPdf]) {
    assert.match(route, /share\.revokedAt/);
    assert.match(route, /share\.expiresAt/);
    assert.match(route, /status: 404/);
  }
  assert.match(studio, /fetch\(["']\/api\/cv-share["']/);
  assert.match(studio, /Révoquer/);
  assert.match(studio, /Copier le lien/);
});

test("CV share links have a 30-day lifetime, owner-only revocation and private no-store metadata", () => {
  const createRoute = read("app/api/cv-share/route.ts");
  const publicApi = read("app/api/cv-share/[token]/route.ts");
  const pdfApi = read("app/api/cv-share/[token]/pdf/route.ts");
  const sharePage = read("app/cv/share/[token]/page.tsx");
  const shareView = read("components/CvShareView.tsx");
  const migration = read("supabase/migrations/20261107020000_cv_share_default_expiration.sql");
  assert.match(createRoute, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(createRoute, /expiresAt,/);
  assert.match(createRoute, /\.eq\("userId", user\.id\)/);
  assert.match(createRoute, /\.is\("revokedAt", null\)/);
  assert.match(createRoute, /\.update\(\{ revokedAt \}\)/);
  assert.match(migration, /alter column "expiresAt" set default/);
  assert.match(migration, /set "expiresAt" = "createdAt" \+ interval '30 days'/);
  for (const route of [publicApi, pdfApi]) {
    assert.match(route, /share\.revokedAt/);
    assert.match(route, /share\.expiresAt/);
    assert.match(route, /status:\s*404/);
  }
  assert.match(publicApi, /Cache-Control.*no-store/);
  assert.ok(sharePage.includes("robots: { index: false, follow: false }"));
  assert.match(sharePage, /data\.revokedAt/);
  assert.match(shareView, /cache:"no-store"/);
});

test("Account notification and Talent privacy preferences persist and control the notification center", () => {
  const schema = read("packages/database/prisma/schema.prisma");
  const migration = read("supabase/migrations/20261107030000_account_notification_preferences.sql");
  const preferencesApi = read("app/api/account/preferences/route.ts");
  const settings = read("components/AccountSettings.tsx");
  const discoverability = read("app/api/talent/discoverability/route.ts");
  const notifications = read("app/api/notifications/route.ts");
  const inbox = read("app/notifications/page.tsx");
  assert.ok(schema.includes("notificationsEnabled"));
  assert.match(migration, /add column if not exists "notificationsEnabled" boolean not null default true/);
  assert.match(preferencesApi, /notificationsEnabled: user\.notificationsEnabled !== false/);
  assert.match(preferencesApi, /update\(\{ notificationsEnabled: body\.notificationsEnabled/);
  assert.match(settings, /fetch\("\/api\/account\/preferences"/);
  assert.match(settings, /method: "PUT"/);
  assert.match(settings, /body: JSON\.stringify\(\{ notificationsEnabled: next \}\)/);
  assert.match(settings, /fetch\("\/api\/talent\/discoverability"/);
  assert.match(settings, /body: JSON\.stringify\(\{ publicDiscoverable: !nextPrivate \}\)/);
  assert.match(discoverability, /\.upsert\(payload, \{ onConflict: "userId" \}\)/);
  assert.match(notifications, /user\.notificationsEnabled === false/);
  assert.match(notifications, /disabled: true/);
  assert.match(inbox, /notificationsDisabled \? "Notifications désactivées"/);
});

test("private Talent profiles are excluded from recruiter discovery and profile detail", () => {
  const recruiterList = read("app/api/recruiter/talents/route.ts");
  const recruiterProfile = read("app/api/recruiter/talents/profile/route.ts");
  assert.match(recruiterList, /\.eq\("publicDiscoverable",\s*true\)/);
  assert.match(recruiterProfile, /\.eq\("publicDiscoverable",\s*true\)/);
  assert.match(recruiterProfile, /Profil public introuvable/);
  assert.match(recruiterProfile, /status:404/);
});

test("logout and remember-me expiry terminate only the current Supabase session", () => {
  const sessionManager = read("lib/session-manager.ts");
  const accountSettings = read("components/AccountSettings.tsx");
  const supabaseClient = read("lib/supabase.ts");

  assert.match(sessionManager, /auth\.signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  assert.match(accountSettings, /auth\.signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  assert.match(supabaseClient, /instance\.auth\.signOut\(\{\s*scope:\s*"local"\s*\}\)/);

  assert.doesNotMatch(sessionManager, /auth\.signOut\(\s*\)/);
  assert.doesNotMatch(accountSettings, /auth\.signOut\(\s*\)/);
  assert.doesNotMatch(supabaseClient, /instance\.auth\.signOut\(\s*\)/);
});

test("shared account settings exposes a visible current-device logout for every role", () => {
  assert.match(accountSettingsPage, /auth\.signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  assert.match(accountSettingsPage, /aria-label="Se déconnecter de Jobly"/);
  assert.match(accountSettingsPage, /router\.replace\("\/"\)/);
  assert.match(accountSettingsPage, /data-testid="jobly-logout-button"/);
});


test("LOT-01 advanced auth browser campaign isolates provider flows and verifies device revocation", () => {
  for (const endpoint of ["/auth/v1/otp", "/auth/v1/verify", "/auth/v1/authorize", "/auth/v1/recover"]) {
    assert.ok(authAdvancedSmoke.includes(endpoint), "Missing intercepted Auth endpoint: " + endpoint);
  }
  assert.match(authAdvancedSmoke, /blockedExternalOrigins/);
  assert.match(authAdvancedSmoke, /blockedExternalRequests/);
  assert.match(authAdvancedSmoke, /unexpectedSupabaseRequests/);
  assert.match(authAdvancedSmoke, /GOOGLE_PROVIDER_REDIRECT_BLOCKED/);
  assert.match(authAdvancedSmoke, /function hasBlockedGoogleNavigation/);
  assert.match(authAdvancedSmoke, /function waitForBlockedGoogleNavigation/);
  assert.match(authAdvancedSmoke, /click\(\{ noWaitAfter: true \}\)/);
  assert.doesNotMatch(authAdvancedSmoke, /waitForEvent\("requestfailed"/);
  assert.match(authAdvancedSmoke, /https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
  assert.match(authAdvancedSmoke, /serviceWorkers: "block"/);
  assert.match(authAdvancedSmoke, /local-html-location-replace/);
  assert.match(authAdvancedSmoke, /window\.location\.replace/);
  assert.match(authAdvancedSmoke, /simulatedResponseStatus === 200/);
  assert.match(authAdvancedSmoke, /réponse HTML locale déclenche la navigation fournisseur/);
  assert.doesNotMatch(authAdvancedSmoke, /status: 302/);
  assert.doesNotMatch(authAdvancedSmoke, /redirectStatus/);
  assert.doesNotMatch(authAdvancedSmoke, /blockedExternalOrigins\.every/);
  assert.match(authAdvancedSmoke, /example\.invalid/);
  assert.match(authAdvancedSmoke, /page\.context\(\)\.storageState\(\)/);
  assert.match(authAdvancedSmoke, /for \(let attempt = 0; attempt < 8; attempt \+= 1\)/);
  assert.match(authAdvancedSmoke, /Execution context was destroyed|Cannot find context with specified id/);
  assert.match(authAdvancedSmoke, /waitForLoadState\("domcontentloaded"/);
  assert.match(authAdvancedSmoke, /undefined, \{ timeout: 15000 \}\)/);
  assert.match(authAdvancedSmoke, /new URL\("\/api\/device-sessions", BASE_URL\)/);
  assert.match(authAdvancedSmoke, /Authorization: "Bearer " \+ token/);
  assert.match(authAdvancedSmoke, /payload-keys=/);
  assert.match(authAdvancedSmoke, /devicePayload\.devices\.find/);
  assert.match(authAdvancedSmoke, /Mes appareils connectés/);
  assert.match(authAdvancedSmoke, /getByText\(deviceLabel, \{ exact: false \}\)/);
  assert.doesNotMatch(authAdvancedSmoke, /const deviceResponsePromise = page\.waitForResponse/);
  assert.match(authAdvancedSmoke, /DEVICE_PREFLIGHT_TWO_FREE_SLOTS/);
  assert.match(authAdvancedSmoke, /activeBefore\.length > 1/);
  assert.match(authAdvancedSmoke, /DEVICE_B_REVOKED_FROM_VISIBLE_UI/);
  assert.match(authAdvancedSmoke, /statusB === 401/);
  assert.match(authAdvancedSmoke, /statusA === 200/);
  assert.match(authAdvancedSmoke, /preexistingDeviceRowsUnchanged/);
  assert.match(authAdvancedSmoke, /select: "id,userId,deviceId,deviceLabel,authSessionId,revokedAt,createdAt,lastSeenAt"/);
  assert.match(authAdvancedSmoke, /expectedDeviceLabels\.get\(owned\.deviceId\) !== owned\.deviceLabel/);
  assert.match(authAdvancedSmoke, /id: "eq\." \+ owned\.id/);
  assert.match(authAdvancedSmoke, /const verifiedRows = await readDeviceRows\(userId\)/);
  assert.match(authAdvancedSmoke, /verifiedOwned\.some\(\(row\) => !row\.revokedAt\)/);
  assert.match(authAdvancedSmoke, /activeOwnedRows: verifiedOwned\.filter\(\(row\) => !row\.revokedAt\)\.length/);
  assert.match(authRecipeRunner, /--auth-advanced-only/);
  assert.match(authRecipeRunner, /reportGeneratedForThisRun/);
});
