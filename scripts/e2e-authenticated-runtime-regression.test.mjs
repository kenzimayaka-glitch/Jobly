import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const smoke = readFileSync(new URL("../e2e/authenticated-role-smoke.mjs", import.meta.url), "utf8");

test("Talent runtime smoke couvre les flux local et Afrique sans mutation", () => {
  const start = smoke.indexOf("// E2E-READONLY-TALENT-START");
  const end = smoke.indexOf("// E2E-READONLY-TALENT-END", start);
  assert.ok(start >= 0 && end > start, "Read-only Talent block must remain explicit.");
  const block = smoke.slice(start, end);
  for (const id of [
    "TALENT-JOBS-FEED-READ",
    "TALENT-AFRICA-FEED-READ",
    "TALENT-JOB-DETAIL-READ",
    "TALENT-CV-ORIGINAL-READ",
    "TALENT-CAREER-JOURNEY-READ",
  ]) assert.ok(block.includes(id), "Missing runtime evidence: " + id);
  assert.match(block, /\/api\/jobs\?scope=local/);
  assert.match(block, /\/api\/jobs\?scope=africa/);
  assert.match(block, /\/api\/talent\/cv\/original/);
  assert.match(block, /\/api\/career-journey/);
  assert.doesNotMatch(block, /request\(token,[\s\S]{0,180}?,\s*"(?:POST|PUT|PATCH|DELETE)"/,
    "Talent read-only block must not write profile or application state.");
});

test("Talent offer detail is selected only from an authenticated feed result", () => {
  const start = smoke.indexOf("// E2E-READONLY-TALENT-START");
  const end = smoke.indexOf("// E2E-READONLY-TALENT-END", start);
  const block = smoke.slice(start, end);
  assert.match(block, /referenceOffer[\s\S]*localFeed\.payload\?\.jobs/);
  assert.match(block, /referenceOffer\.id/);
  assert.match(block, /referenceOffer\.source/);
  assert.match(block, /detail\.payload\?\.job\?\.id === referenceOffer\.id/);
});

test("CV original read accepts only a valid signed-link response or explicit no-CV state", () => {
  const start = smoke.indexOf("// E2E-READONLY-TALENT-START");
  const end = smoke.indexOf("// E2E-READONLY-TALENT-END", start);
  const block = smoke.slice(start, end);
  assert.match(block, /originalCv\.status === 404[\s\S]*CV_NOT_FOUND/);
  assert.match(block, /originalCv\.payload\?\.expiresIn === 60/);
  assert.doesNotMatch(block, /console\.(?:log|info)\([^\n]*originalCv\.payload\?\.url/,
    "A signed CV URL must never be written to a log.");
});

test("Career Journey runtime smoke uses GET only", () => {
  const start = smoke.indexOf("// E2E-READONLY-TALENT-START");
  const end = smoke.indexOf("// E2E-READONLY-TALENT-END", start);
  const block = smoke.slice(start, end);
  assert.match(block, /request\(token, "\/api\/career-journey"\)/);
  assert.match(block, /careerJourney\.payload\?\.ok === true/);
  assert.match(block, /Array\.isArray\(careerJourney\.payload\?\.evidence\)/);
});

test("Recruitment360 runtime smoke verifies non-owned scope and missing document target without writes", () => {
  const start = smoke.indexOf("// E2E-READONLY-RECRUITER-START");
  const end = smoke.indexOf("// E2E-READONLY-RECRUITER-END", start);
  assert.ok(start >= 0 && end > start, "Read-only Recruiter block must remain explicit.");
  const block = smoke.slice(start, end);
  assert.match(block, /RECRUITMENT360-DENY-UNOWNED-ID/);
  assert.match(block, /unownedRecruitment\.status === 403/);
  assert.match(block, /RECRUITMENT360-DOCUMENT-MISSING-APPLICATION/);
  assert.match(block, /missingApplicationDocument\.status === 404/);
  assert.match(block, /example\.invalid/);
  assert.doesNotMatch(block, /\.from\(["']RecruitmentApplicationDocument["']\)\.insert/);
});
