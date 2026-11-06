import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJiaPracticeQuestionnaire,
  detectJiaWorkspaceIntent,
} from "../lib/jia/workspace.ts";

test("J’IA recognizes the four Talent workspace intents", () => {
  assert.equal(detectJiaWorkspaceIntent("Trouve des offres adaptées à mon profil", "TALENT"), "OFFERS");
  assert.equal(detectJiaWorkspaceIntent("Montre mes candidatures", "TALENT"), "APPLICATIONS");
  assert.equal(detectJiaWorkspaceIntent("Ouvre mon CV et mon profil", "TALENT"), "PROFILE");
  assert.equal(detectJiaWorkspaceIntent("Crée un questionnaire Excel", "TALENT"), "ASSESSMENT");
});

test("workspace actions never expose Talent endpoints to other ecosystems", () => {
  assert.equal(detectJiaWorkspaceIntent("Trouve des offres", "RECRUITER"), null);
  assert.equal(detectJiaWorkspaceIntent("Mes candidatures", "PARTNER"), null);
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
