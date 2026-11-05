import test from "node:test";
import assert from "node:assert/strict";
import {
  applicationStepNumber,
  hasRecruitmentRole,
  RECRUITMENT_READ_ROLES,
  RECRUITMENT_WRITE_ROLES,
  RECRUITMENT_STATE_ROLES,
  validateApplicationTransition,
} from "../lib/recruitment360/access.ts";
import { isInstitutionMobilityAdminRole, mayGuaranteeMobilityRequest, recruiterOwnsMobilityRequest } from "../lib/mobilityAccess.ts";

test("Institution Mobility mutation requires an active InstitutionMember admin role", () => {
  assert.equal(isInstitutionMobilityAdminRole("INSTITUTION_ADMIN"), true);
  assert.equal(isInstitutionMobilityAdminRole(" institution_admin "), true);
  assert.equal(isInstitutionMobilityAdminRole("INSTITUTION_VIEWER"), false);
  assert.equal(isInstitutionMobilityAdminRole("PARTNER"), false);
});

test("Only a linked recruiter or admin may guarantee a Mobility dossier", () => {
  const links = { requestRecruiterUserId: "recruiter-1" };
  assert.equal(mayGuaranteeMobilityRequest("RECRUITER", "recruiter-1", links), true);
  assert.equal(mayGuaranteeMobilityRequest("RECRUITER", "other", links), false);
  assert.equal(mayGuaranteeMobilityRequest("TALENT", "recruiter-1", links), false);
  assert.equal(mayGuaranteeMobilityRequest("ADMIN", "admin-1", {}), true);
});

test("Recruitment360 read-only roles cannot write or transition states", () => {
  assert.equal(hasRecruitmentRole("OWNER", RECRUITMENT_READ_ROLES), true);
  assert.equal(hasRecruitmentRole("JURY", RECRUITMENT_READ_ROLES), true);
  assert.equal(hasRecruitmentRole("DG_READONLY", RECRUITMENT_READ_ROLES), true);
  assert.equal(hasRecruitmentRole("JURY", RECRUITMENT_WRITE_ROLES), false);
  assert.equal(hasRecruitmentRole("DG_READONLY", RECRUITMENT_STATE_ROLES), false);
  assert.equal(hasRecruitmentRole("TALENT", RECRUITMENT_READ_ROLES), false);
  assert.equal(hasRecruitmentRole("  hr  ", RECRUITMENT_WRITE_ROLES), true);
});

test("Mobility recruiter access requires an explicit dossier relationship", () => {
  assert.equal(recruiterOwnsMobilityRequest("recruiter-1", { requestRecruiterUserId: "recruiter-1" }), true);
  assert.equal(recruiterOwnsMobilityRequest("recruiter-1", { agreementRecruiterUserId: "recruiter-1" }), true);
  assert.equal(recruiterOwnsMobilityRequest("recruiter-1", { applicationRecruiterUserId: "recruiter-1" }), true);
  assert.equal(recruiterOwnsMobilityRequest("recruiter-1", { applicationRecruiterUserId: "other" }), false);
  assert.equal(recruiterOwnsMobilityRequest("", { requestRecruiterUserId: "recruiter-1" }), false);
});

test("Candidates may only withdraw and cannot bypass the offer response API", () => {
  assert.equal(validateApplicationTransition("CANDIDATE", "REVIEW", "WITHDRAWN", ""), null);
  assert.equal(validateApplicationTransition("CANDIDATE", "OFFER", "OFFER_DECLINED", ""), "CANDIDATE_TRANSITION_FORBIDDEN");
  assert.equal(validateApplicationTransition("CANDIDATE", "INTERVIEW", "OFFER_DECLINED", ""), "CANDIDATE_TRANSITION_FORBIDDEN");
  assert.equal(validateApplicationTransition("CANDIDATE", "OFFER", "HIRED", ""), "CANDIDATE_TRANSITION_FORBIDDEN");
  assert.equal(validateApplicationTransition("CANDIDATE", "REJECTED", "WITHDRAWN", ""), "CANDIDATE_TRANSITION_FORBIDDEN");
});

test("Recruiter state changes retain terminal and backwards-transition safeguards", () => {
  assert.equal(validateApplicationTransition("RECRUITER", "REVIEW", "INTERVIEW", ""), null);
  assert.equal(validateApplicationTransition("RECRUITER", "INTERVIEW", "REVIEW", ""), "BACKWARD_TRANSITION_REQUIRES_REASON");
  assert.equal(validateApplicationTransition("RECRUITER", "INTERVIEW", "REVIEW", "Correction justifiée"), null);
  assert.equal(validateApplicationTransition("RECRUITER", "REJECTED", "REVIEW", ""), "LOCKED_STATE_EXCEPTION_REASON_REQUIRED");
  assert.equal(validateApplicationTransition("RECRUITER", "REJECTED", "REVIEW", "Correction validée"), null);
  assert.equal(validateApplicationTransition("RECRUITER", "UNKNOWN", "REVIEW", ""), "CURRENT_APPLICATION_STATE_INVALID");
  assert.equal(validateApplicationTransition("RECRUITER", "toString", "REVIEW", ""), "CURRENT_APPLICATION_STATE_INVALID");
});

test("Recruitment360 state numbers are canonical", () => {
  assert.equal(applicationStepNumber("SENT"), 0);
  assert.equal(applicationStepNumber("INTERVIEW"), 5);
  assert.equal(applicationStepNumber("HIRED"), 8);
  assert.equal(applicationStepNumber("toString"), -1);
  assert.equal(applicationStepNumber("unknown"), -1);
});
