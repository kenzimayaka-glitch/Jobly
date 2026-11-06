import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const expectedRef = "ofqqrryamslxoqkklraw";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
assert.equal(process.env.E2E_PROJECT_REF, expectedRef, "E2E project ref mismatch.");
assert.equal(new URL(url).hostname, `${expectedRef}.supabase.co`, "Refusing any non-E2E Supabase project.");
assert.ok(key.startsWith("sb_publishable_"), "A publishable E2E key is required.");

const outDir = path.resolve("artifacts/e2e");
await mkdir(outDir, { recursive: true });
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const report = {
  createdAt: new Date().toISOString(),
  environment: "JOBLY-E2E",
  projectRef: expectedRef,
  scenario: "anonymous-auth-session-lifecycle",
  status: "BLOCKED",
  checks: [],
  externalMessagesSent: false,
  notes: [],
};

try {
  const signIn = await supabase.auth.signInAnonymously({
    options: { data: { full_name: "Jobly E2E Temporary Talent", e2e_test: true } },
  });
  if (signIn.error) {
    report.reason = signIn.error.message;
    report.checks.push({ id: "JOBLY-E2E-AUTH-ANON-001", status: "BLOCKED", detail: signIn.error.message });
  } else {
    const user = signIn.data.user;
    const session = signIn.data.session;
    assert.ok(user?.id, "Anonymous Auth did not return a user id.");
    assert.ok(session?.access_token, "Anonymous Auth did not return an access token.");
    report.authUserId = user.id;
    report.checks.push({ id: "JOBLY-E2E-AUTH-ANON-001", status: "PASS", detail: "E2E anonymous account created without email/SMS." });

    const verified = await supabase.auth.getUser(session.access_token);
    assert.equal(verified.error, null, verified.error?.message);
    assert.equal(verified.data.user?.id, user.id);
    report.checks.push({ id: "JOBLY-E2E-AUTH-ANON-002", status: "PASS", detail: "Access token verified against E2E Auth." });

    const refreshed = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
    assert.equal(refreshed.error, null, refreshed.error?.message);
    assert.equal(refreshed.data.user?.id, user.id);
    assert.ok(refreshed.data.session?.access_token);
    report.checks.push({ id: "JOBLY-E2E-AUTH-ANON-003", status: "PASS", detail: "Refresh token rotated and session refreshed." });

    const ownUser = await supabase.from("User").select("id,role").eq("authUserId", user.id).maybeSingle();
    if (ownUser.error) {
      report.checks.push({ id: "JOBLY-E2E-AUTH-ANON-004", status: "BLOCKED", detail: "The client could not read the matching public.User row: " + ownUser.error.message });
    } else {
      report.checks.push({ id: "JOBLY-E2E-AUTH-ANON-004", status: ownUser.data ? "PASS" : "BLOCKED", detail: ownUser.data ? "Matching public.User row is readable." : "No application User row is provisioned for this temporary Auth user." });
    }

    const signOut = await supabase.auth.signOut({ scope: "local" });
    assert.equal(signOut.error, null, signOut.error?.message);
    report.checks.push({ id: "JOBLY-E2E-AUTH-ANON-005", status: "PASS", detail: "Client session cleared by sign-out." });
    report.status = report.checks.every((item) => item.status === "PASS") ? "PASS" : "PARTIAL";
    report.notes.push("Anonymous Auth is an isolated technical session; it does not replace a verified Talent or Recruiter account.");
  }
} catch (error) {
  report.status = "FAIL";
  report.error = error instanceof Error ? error.message : String(error);
}

await writeFile(path.join(outDir, "auth-session-smoke.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (report.status === "FAIL") process.exitCode = 1;
