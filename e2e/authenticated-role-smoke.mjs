import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const SUPABASE_URL = "https://" + PROJECT_REF + ".supabase.co";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const FIXTURE_PATH = path.resolve(".e2e-fixtures.json");
const REPORT_PATH = path.resolve("artifacts/e2e/authenticated-role-smoke.json");
const runId = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

const report = {
  createdAt: new Date().toISOString(),
  environment: "JOBLY-E2E",
  projectRef: PROJECT_REF,
  baseURL: BASE_URL,
  status: "BLOCKED",
  checks: [],
  roles: {},
  externalActions: false,
};

function record(role, id, status, httpStatus, detail) {
  report.checks.push({ role, id, status, httpStatus: httpStatus ?? null, detail: String(detail || "").slice(0, 240) });
}

async function request(token, route, method = "GET", body = undefined) {
  const response = await fetch(new URL(route, BASE_URL), {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      "Cache-Control": "no-store",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function runCheck(role, id, action, expectedStatuses = [200]) {
  try {
    const result = await action();
    const ok = expectedStatuses.includes(result.status);
    record(role, id, ok ? "PASS" : "FAIL", result.status, ok ? "Réponse API conforme." : JSON.stringify(result.payload?.message || result.payload || {}));
    return result;
  } catch (error) {
    record(role, id, "FAIL", null, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  assert.equal(process.env.E2E_PROJECT_REF, PROJECT_REF, "Projet E2E inattendu.");
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, "URL Supabase non-E2E refusée.");
  assert.ok(PUBLISHABLE_KEY.startsWith("sb_publishable_"), "Clé publishable JOBLY-E2E absente.");
  const fixtures = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  assert.equal(fixtures.environment, "JOBLY-E2E");
  assert.equal(fixtures.projectRef, PROJECT_REF);

  const expected = [
    { key: "talent", role: "TALENT" },
    { key: "recruiter", role: "RECRUITER" },
    { key: "partner", role: "PARTNER" },
  ];

  for (const item of expected) {
    const account = fixtures.accounts?.find((candidate) => candidate.key === item.key && candidate.role === item.role);
    assert.ok(account?.email && account?.password, "Fixture absente pour " + item.role);
    const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    try {
      const login = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
      assert.equal(login.error, null, login.error?.message);
      const user = login.data.user;
      const token = login.data.session?.access_token;
      assert.ok(user?.id && token, "Session Auth incomplète pour " + item.role);
      assert.equal(user.app_metadata?.e2e_fixture, true);
      assert.equal(user.app_metadata?.e2e_role, item.role);
      record(item.role, item.role + "-AUTH-LOGIN", "PASS", 200, "Connexion Supabase Auth réelle.");
      const verified = await supabase.auth.getUser(token);
      assert.equal(verified.error, null, verified.error?.message);
      assert.equal(verified.data.user?.id, user.id);
      record(item.role, item.role + "-AUTH-GET-USER", "PASS", 200, "Jeton vérifié par Supabase Auth.");

      if (item.role === "TALENT") {
        const profile = await runCheck(item.role, "TALENT-PROFILE-READ", () => request(token, "/api/profile"));
        if (profile?.status === 200 && profile.payload?.profile) {
          const summary = "Profil synthétique JOBLY-E2E — run " + runId;
          const update = await runCheck(item.role, "TALENT-PROFILE-WRITE", () => request(token, "/api/profile", "PUT", {
            section: "profil",
            headline: "Candidat de recette automatisée",
            summary,
            location: "Yaoundé, Cameroun",
            phone: account.phone || "+237600000101",
          }));
          if (update?.status === 200) {
            const reread = await runCheck(item.role, "TALENT-PROFILE-PERSIST", () => request(token, "/api/profile"));
            if (reread?.status === 200 && reread.payload?.profile?.summary !== summary) {
              record(item.role, "TALENT-PROFILE-PERSIST-CONTENT", "FAIL", 200, "Le résumé synthétique n'a pas été retrouvé après écriture.");
            } else if (reread?.status === 200) {
              record(item.role, "TALENT-PROFILE-PERSIST-CONTENT", "PASS", 200, "La modification du profil a été relue.");
            }
          }
        }
        await runCheck(item.role, "TALENT-APPLICATIONS-READ", () => request(token, "/api/applications"));
      }

      if (item.role === "RECRUITER") {
        await runCheck(item.role, "RECRUITER-PROFILE-READ", () => request(token, "/api/recruiter/profile"));
        await runCheck(item.role, "RECRUITER-JOBS-LIST", () => request(token, "/api/recruiter/jobs"));
        await runCheck(item.role, "RECRUITER-APPLICATIONS-LIST", () => request(token, "/api/recruiter/applications?markViewed=0"));
        await runCheck(item.role, "RECRUITER-TALENTS-LIST", () => request(token, "/api/recruiter/talents"));
        await runCheck(item.role, "RECRUITMENT360-APPLICATIONS-LIST", () => request(token, "/api/recruitment360/applications"));
        await runCheck(item.role, "RECRUITMENT360-DECISIONS-LIST", () => request(token, "/api/recruitment360/decisions"));

        const draftTitle = "JOBLY E2E — brouillon " + runId;
        const created = await runCheck(item.role, "RECRUITER-DRAFT-CREATE", () => request(token, "/api/recruiter/jobs", "POST", {
          title: draftTitle,
          description: "Offre synthétique de test automatisé. Aucune candidature externe ne sera envoyée.",
          companyName: "Jobly E2E Test Company",
          location: "Yaoundé, Cameroun",
          countryCode: "CM",
          distributionScope: "COUNTRY",
          targetCountryCodes: ["CM"],
          mode: "Hybride",
          contract: "CDD",
          salary: "0",
          sector: "Technology",
          tags: ["E2E", "TEST"],
          status: "draft",
        }), [201, 403]);
        if (created?.status === 403) {
          record(item.role, "RECRUITER-DRAFT-CREATE-ENTITLEMENT", "BLOCKED", 403, created.payload?.message || "Règle d'éligibilité métier : création de brouillon refusée.");
        } else if (created?.status === 201 && created.payload?.job?.id) {
          const jobId = created.payload.job.id;
          try {
            await runCheck(item.role, "RECRUITER-DRAFT-DETAIL", () => request(token, "/api/recruiter/jobs/" + encodeURIComponent(jobId)));
            await runCheck(item.role, "RECRUITER-DRAFT-UPDATE", () => request(token, "/api/recruiter/jobs/" + encodeURIComponent(jobId), "PATCH", {
              title: draftTitle + " — modifié",
            }));
          } finally {
            await runCheck(item.role, "RECRUITER-DRAFT-CLEANUP", () => request(token, "/api/recruiter/jobs/" + encodeURIComponent(jobId), "DELETE"));
          }
        }
      }

      if (item.role === "PARTNER") {
        await runCheck(item.role, "PARTNER-PROFILE-READ", () => request(token, "/api/partner/profile"));
        await runCheck(item.role, "PARTNER-COMMISSIONS-READ", () => request(token, "/api/partner/commissions"));
        await runCheck(item.role, "PARTNER-BA-ONBOARDING-READ", () => request(token, "/api/partner/ba-onboarding"));
      }
      report.roles[item.role] = "EXECUTED";
    } catch (error) {
      record(item.role, item.role + "-RUNTIME", "FAIL", null, error instanceof Error ? error.message : String(error));
      report.roles[item.role] = "FAIL";
    } finally {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  }

  const failed = report.checks.some((check) => check.status === "FAIL");
  const blocked = report.checks.some((check) => check.status === "BLOCKED");
  report.status = failed ? "FAIL" : blocked ? "PARTIAL" : report.checks.length >= 15 ? "PASS" : "PARTIAL";
  report.summary =
    report.checks.filter((check) => check.status === "PASS").length + "/" + report.checks.length +
    " contrôles API authentifiés PASS ; " +
    report.checks.filter((check) => check.status === "BLOCKED").length + " BLOCKED ; " +
    report.checks.filter((check) => check.status === "FAIL").length + " FAIL.";
}

try {
  await main();
} catch (error) {
  report.status = "BLOCKED";
  report.error = error instanceof Error ? error.message : String(error);
  report.summary = "Parcours authentifiés non exécutés : " + report.error;
}

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  ...report,
  credentials: "not included",
}, null, 2));
if (report.status === "FAIL") process.exitCode = 1;
