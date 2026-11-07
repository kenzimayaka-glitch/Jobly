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

test("Recruitment360 applications rejects an explicit recruitmentId outside the actor's authorized roles", async () => {
  const applications = await source("app/api/recruitment360/applications/route.ts");
  const roleLookup = applications.indexOf('.from("RecruitmentRole")');
  const authorizationGuard = applications.indexOf("if (requestedRecruitmentId && !accessibleIds.includes(requestedRecruitmentId))");
  const recruitmentRead = applications.indexOf('.from("Recruitment360")');
  assert.ok(roleLookup >= 0, "The actor's RecruitmentRole memberships must be loaded.");
  assert.ok(authorizationGuard > roleLookup, "An explicit recruitmentId must be checked against the actor's roles.");
  assert.ok(recruitmentRead > authorizationGuard, "No Recruitment360 or Application data may be read before authorization.");
  assert.match(applications, /\.in\("role",\s*RECRUITMENT_READ_ROLES\)/);
  assert.match(applications, /return NextResponse\.json\(\{ message: "Accès refusé à ce recrutement\." \}, \{ status: 403 \}\)/);
});

test("Recruitment360 document uploads require ownership of the application recruitment", async () => {
  const applications = await source("app/api/recruitment360/applications/route.ts");
  const documentAction = applications.indexOf('if (body.action === "document")');
  const applicationLookup = applications.indexOf('.from("Application")', documentAction);
  const recruitmentLookup = applications.indexOf('.from("Recruitment360")', documentAction);
  const actorRoleLookup = applications.indexOf('.from("RecruitmentRole")', documentAction);
  const documentInsert = applications.indexOf('.from("RecruitmentApplicationDocument")', documentAction);
  assert.ok(documentAction >= 0);
  assert.ok(applicationLookup > documentAction);
  assert.ok(recruitmentLookup > applicationLookup);
  assert.ok(actorRoleLookup > recruitmentLookup);
  assert.ok(documentInsert > actorRoleLookup, "A document must not be inserted before the actor's recruitment role is verified.");
  assert.match(applications.slice(actorRoleLookup, documentInsert), /\.eq\("userId", user\.id\)/);
  assert.match(applications.slice(actorRoleLookup, documentInsert), /\.in\("role", \["OWNER", "HR", "MANAGER", "DELEGATE"\]\)/);
  assert.match(applications.slice(actorRoleLookup, documentInsert), /status: 403/);
});
