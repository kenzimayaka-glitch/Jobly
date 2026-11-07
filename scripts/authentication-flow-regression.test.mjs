import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("app/page.tsx");
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
const recruiterJobs = read("app/api/recruiter/jobs/route.ts");
const mobilityAgreement = read("app/api/mobility/recruiter/agreement/route.ts");
const mobilityServer = read("lib/mobilityServer.ts");
const serverAuth = read("lib/server-auth.ts");
const onboarding = read("app/onboarding/page.tsx");

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

test("CV Studio loads current plan and download prices with the authenticated session", () => {
  const effectStart = talentCvPage.indexOf('fetch("/api/entitlements"');
  assert.ok(effectStart >= 0, "CV Studio must load the current entitlement snapshot.");
  const effect = talentCvPage.slice(Math.max(0, effectStart - 500), effectStart + 700);
  assert.match(effect, /const token = await getAccessToken\(\)/);
  assert.ok(effect.includes("Authorization: `Bearer ${token}`"));
  assert.match(talentCvPage, /if \(entitlements\?\.subscription\?\.plan\) setPlan\(entitlements\.subscription\.plan\)/);
  assert.match(talentCvPage, /cvAtsDownloadPriceXaf/);
  assert.match(talentCvPage, /cvOptimizedDownloadPriceXaf/);
});

test("CV Studio persists and reloads free-text experience and education without fabricating structured records", () => {
  const profileApi = read("app/api/profile/route.ts");
  const applicationApi = read("app/api/applications/route.ts");
  const applicationCv = read("lib/applicationCv.ts");
  const schema = read("packages/database/prisma/schema.prisma");
  const migration = read("supabase/migrations/20261107010000_talent_cv_text_sections.sql");

  assert.match(schema, /experienceSummary\\s+String\\?/);
  assert.match(schema, /educationSummary\\s+String\\?/);
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
  assert.match(images, /existingImages\.length >= limit/);
  assert.match(images, /ALLOWED_TYPES/);
  assert.match(images, /actionImages: nextImages/);
  assert.match(showcase, /requestedImages\.length > limit/);
  assert.match(showcase, /invalidAdditions\.length/);
  assert.match(showcase, /storage\.from\("talent-showcase"\)\.remove\(removedPaths\)/);
});
