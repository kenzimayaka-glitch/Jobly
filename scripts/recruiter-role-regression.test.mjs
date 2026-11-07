import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
async function source(file) {
  return readFile(path.join(root, file), "utf8");
}

test("profil Recruteur : session Supabase et propriété Auth UID", async () => {
  const code = await source("app/api/recruiter/profile/route.ts");
  assert.match(code, /getAuthUser\(request\)/);
  assert.match(code, /ensureUser\(supabase,\s*authUser\)/);
  assert.match(code, /ensureRecruiterProfileForAuthUser\(supabase,\s*authUser\.id/);
});

test("offres Recruteur : rôle, entitlement et rattachement interne", async () => {
  const code = await source("app/api/recruiter/jobs/route.ts");
  assert.match(code, /getAuthUser\(req\)/);
  assert.match(code, /authorizeRecruiterWorkspace/);
  assert.match(code, /enforceRecruiterMarketEntitlement/);
  assert.match(code, /recruiterUserId:\s*user\.id/);
  assert.match(code, /\.from\("RecruiterJob"\)/);
});

test("offre Recruteur : lecture, modification et suppression limitées au propriétaire", async () => {
  const code = await source("app/api/recruiter/jobs/[id]/route.ts");
  assert.match(code, /loadOwnedJob/);
  assert.match(code, /\.eq\("recruiterUserId",\s*user\.id\)/);
  assert.match(code, /export async function PATCH/);
  assert.match(code, /export async function DELETE/);
});

test("candidatures Recruteur : seulement les offres du recruteur connecté", async () => {
  const code = await source("app/api/recruiter/applications/route.ts");
  assert.match(code, /getAuthUser\(req\)/);
  assert.match(code, /\.eq\("recruiterUserId",\s*user\.id\)/);
  assert.match(code, /markViewed/);
});

test("Recruitment 360 : listes, rôles et RPC métier protégés", async () => {
  const applications = await source("app/api/recruitment360/applications/route.ts");
  const decisions = await source("app/api/recruitment360/decisions/route.ts");
  assert.match(applications, /getAuthUser\(req\)/);
  assert.match(applications, /RecruitmentRole/);
  assert.match(applications, /recruitment360_lot3_score_application/);
  assert.match(applications, /recruitment360_lot3_set_shortlist/);
  assert.match(decisions, /getAuthUser\(req\)/);
  assert.match(decisions, /RecruitmentRole/);
  assert.match(decisions, /recruitment360_lot6_get_workspace/);
  assert.match(decisions, /recruitment360_lot6_finalize_decision/);
});
