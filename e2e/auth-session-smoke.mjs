import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const expectedRef = "ofqqrryamslxoqkklraw";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const fixturePath = path.resolve(".e2e-fixtures.json");
assert.equal(process.env.E2E_PROJECT_REF, expectedRef, "E2E project ref mismatch.");
assert.equal(new URL(url).hostname, expectedRef + ".supabase.co", "Refusing any non-E2E Supabase project.");
assert.ok(key.startsWith("sb_publishable_"), "A publishable E2E key is required.");

const outDir = path.resolve("artifacts/e2e");
await mkdir(outDir, { recursive: true });
const report = {
  createdAt: new Date().toISOString(),
  environment: "JOBLY-E2E",
  projectRef: expectedRef,
  scenario: "authenticated-role-session-lifecycle",
  status: "BLOCKED",
  checks: [],
  accounts: [],
  externalMessagesSent: false,
  notes: [],
};

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

try {
  if (!(await fileExists(fixturePath))) {
    report.reason = "Aucun jeu de fixtures E2E local disponible. Contrôle bloqué : ne pas créer, restaurer ou réinitialiser de compte pour contourner ce blocage.";
    report.checks.push({
      id: "JOBLY-E2E-AUTH-FIXTURES-001",
      status: "BLOCKED",
      detail: "Comptes Talent/Recruteur/Partenaire locaux absents ; aucun compte n'est créé/restauré et aucun e-mail/SMS n'est envoyé.",
    });
  } else {
    const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
    assert.equal(fixtures.environment, "JOBLY-E2E");
    assert.equal(fixtures.projectRef, expectedRef);
    assert.ok(Array.isArray(fixtures.accounts), "Fixture account list missing.");

    const expectedRoles = {
      talent: "TALENT",
      recruiter: "RECRUITER",
      partner: "PARTNER",
    };
    for (const [keyName, role] of Object.entries(expectedRoles)) {
      const account = fixtures.accounts.find((item) => item.key === keyName && item.role === role);
      if (!account || typeof account.email !== "string" || typeof account.password !== "string") {
        report.checks.push({
          id: "JOBLY-E2E-AUTH-" + role + "-001",
          status: "FAIL",
          detail: "Identifiants de fixture manquants pour le rôle " + role + ".",
        });
        continue;
      }

      const supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });

      try {
        const signIn = await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        });
        assert.equal(signIn.error, null, signIn.error?.message);
        const user = signIn.data.user;
        const session = signIn.data.session;
        assert.ok(user?.id, "Supabase Auth user id missing.");
        assert.ok(session?.access_token, "Supabase access token missing.");
        assert.equal(user.app_metadata?.e2e_fixture, true, "The Auth identity is not marked as an E2E fixture.");
        assert.equal(user.app_metadata?.e2e_role, role, "The Auth app_metadata role does not match the fixture role.");

        report.checks.push({
          id: "JOBLY-E2E-AUTH-" + role + "-001",
          status: "PASS",
          detail: "Connexion réelle Supabase Auth effectuée pour le rôle " + role + ".",
        });

        const verified = await supabase.auth.getUser(session.access_token);
        assert.equal(verified.error, null, verified.error?.message);
        assert.equal(verified.data.user?.id, user.id);
        report.checks.push({
          id: "JOBLY-E2E-AUTH-" + role + "-002",
          status: "PASS",
          detail: "Access token vérifié pour le rôle " + role + ".",
        });

        // Jobly deliberately separates auth.uid() from public.User.id.
        // RLS on User/Profile/Partner is not an Auth identity lookup contract;
        // persisted identity/profile ownership is verified through the server APIs
        // in authenticated-role-smoke.mjs, which uses the isolated JOBLY-E2E server.
        assert.equal(user.app_metadata?.e2e_fixture, true);
        assert.equal(user.app_metadata?.e2e_role, role);
        report.checks.push({
          id: "JOBLY-E2E-AUTH-" + role + "-003",
          status: "PASS",
          detail: "Rôle de fixture vérifié via app_metadata signé par Supabase Auth.",
        });

        const refreshed = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
        assert.equal(refreshed.error, null, refreshed.error?.message);
        assert.equal(refreshed.data.user?.id, user.id);
        assert.ok(refreshed.data.session?.access_token);
        report.checks.push({
          id: "JOBLY-E2E-AUTH-" + role + "-004",
          status: "PASS",
          detail: "Renouvellement de session et rotation du refresh token vérifiés.",
        });
        report.accounts.push({ key: keyName, role, status: "PASS" });
      } catch (error) {
        report.checks.push({
          id: "JOBLY-E2E-AUTH-" + role + "-RUNTIME",
          status: "FAIL",
          detail: error instanceof Error ? error.message : String(error),
        });
        report.accounts.push({ key: keyName, role, status: "FAIL" });
      } finally {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      }
    }

    const failed = report.checks.some((item) => item.status === "FAIL");
    const blocked = report.checks.some((item) => item.status === "BLOCKED");
    report.status = failed ? "FAIL" : blocked ? "PARTIAL" : report.checks.length === 12 ? "PASS" : "PARTIAL";
  }
} catch (error) {
  report.status = "FAIL";
  report.error = error instanceof Error ? error.message : String(error);
}

await writeFile(path.join(outDir, "auth-session-smoke.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({
  ...report,
  credentials: "not included",
}, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
