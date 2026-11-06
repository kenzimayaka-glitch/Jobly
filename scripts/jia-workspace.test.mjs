import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJiaAdaptiveQuestionBank,
  buildJiaPracticeQuestionnaire,
  detectJiaWorkspaceIntent,
} from "../lib/jia/workspace.ts";

test("J’IA recognizes the four Talent workspace intents", () => {
  assert.equal(detectJiaWorkspaceIntent("Trouve des offres adaptées à mon profil", "TALENT"), "OFFERS");
  assert.equal(detectJiaWorkspaceIntent("Montre mes candidatures", "TALENT"), "APPLICATIONS");
  assert.equal(detectJiaWorkspaceIntent("Ouvre mon CV et mon profil", "TALENT"), "PROFILE");
  assert.equal(detectJiaWorkspaceIntent("Je veux modifier mon profil depuis J’IA", "TALENT"), "PROFILE");
  assert.equal(detectJiaWorkspaceIntent("Crée un questionnaire Excel", "TALENT"), "ASSESSMENT");
});

test("workspace actions are scoped to the selected Jobly ecosystem", () => {
  assert.equal(detectJiaWorkspaceIntent("Trouve des offres", "RECRUITER"), null);
  assert.equal(detectJiaWorkspaceIntent("Mes candidatures", "PARTNER"), null);
  assert.equal(detectJiaWorkspaceIntent("Montre les offres publiées", "RECRUITER"), "RECRUITER_JOBS");
  assert.equal(detectJiaWorkspaceIntent("Montre les candidatures reçues", "RECRUITER"), "RECRUITER_APPLICATIONS");
  assert.equal(detectJiaWorkspaceIntent("Trouve des candidats pertinents", "RECRUITER"), "RECRUITER_TALENTS");
  assert.equal(detectJiaWorkspaceIntent("Montre mes affectations", "PARTNER"), "PARTNER_ASSIGNMENTS");
  assert.equal(detectJiaWorkspaceIntent("Consulte mes commissions", "PARTNER"), "PARTNER_COMMISSIONS");
  assert.equal(detectJiaWorkspaceIntent("Prépare un rapport Mobility", "PARTNER"), "PARTNER_REPORTS");
  assert.equal(detectJiaWorkspaceIntent("Vue d'ensemble de la plateforme", "ADMIN"), "ADMIN_OVERVIEW");
  assert.equal(detectJiaWorkspaceIntent("Montre mes CV", "ADMIN"), null);
});

test("Excel practice assessment produces three valid multiple-choice questions", () => {
  const assessment = buildJiaPracticeQuestionnaire("Fais-moi passer un questionnaire sur Excel");
  assert.equal(assessment.competency, "Excel");
  assert.equal(assessment.questions.length, 3);
  for (const question of assessment.questions) {
    assert.equal(question.choices.length, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < question.choices.length);
    assert.ok(question.explanation.length > 0);
  }
});

test("generic practice assessment is explicit about its non-certifying scope", () => {
  const assessment = buildJiaPracticeQuestionnaire("Propose un quiz");
  assert.equal(assessment.questions.length, 3);
  assert.match(assessment.objective, /pas une certification/i);
});


test("adaptive question bank offers six distinct questions across three difficulty levels", () => {
  for (const prompt of ["questionnaire Excel", "quiz commercial", "questionnaire communication", "quiz général"]) {
    const bank = buildJiaAdaptiveQuestionBank(prompt);
    assert.equal(bank.questions.length, 6);
    assert.deepEqual(new Set(bank.questions.map((question) => question.difficulty)), new Set([1, 2, 3]));
    assert.equal(new Set(bank.questions.map((question) => question.prompt)).size, 6);
    assert.ok(bank.questions.every((question) => question.choices.length === 4));
  }
});
