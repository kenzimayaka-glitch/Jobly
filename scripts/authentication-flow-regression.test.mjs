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
