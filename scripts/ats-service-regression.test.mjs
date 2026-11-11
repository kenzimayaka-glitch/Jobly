import test from "node:test";
import assert from "node:assert/strict";
import { analyzeATSMatch, calculateATSScore, decideStatus } from "../lib/atsService.ts";

test("ATS analysis returns matched and missing keywords for the selected offer", () => {
  const result = analyzeATSMatch(
    "Excel gestion de projet communication",
    "Excel gestion projet Python communication"
  );

  assert.equal(result.score, 80);
  assert.deepEqual(result.matchedKeywords, ["excel", "gestion", "projet", "communication"]);
  assert.deepEqual(result.missingKeywords, ["python"]);
  assert.equal(result.evaluatedKeywords, 5);
});

test("ATS analysis normalizes French accents before comparing keywords", () => {
  const result = analyzeATSMatch(
    "Développement commercial et négociation",
    "Developpement commercial, négociation, CRM"
  );

  assert.deepEqual(result.matchedKeywords, ["developpement", "commercial", "negociation"]);
  assert.deepEqual(result.missingKeywords, ["crm"]);
});

test("ATS analysis marks an empty or unusable CV as not calculable", () => {
  assert.deepEqual(analyzeATSMatch("", "Excel gestion projet"), {
    score: null,
    matchedKeywords: [],
    missingKeywords: ["excel", "gestion", "projet"],
    evaluatedKeywords: 3,
  });
  assert.equal(analyzeATSMatch("CV", "").score, null);
});

test("legacy score helper remains compatible with existing consumers", () => {
  const result = calculateATSScore("Excel gestion projet", "Excel gestion projet Python");
  assert.equal(result.score, 75);
  assert.equal(result.name, "Bon match");
  assert.deepEqual(result.skills, ["excel", "gestion", "projet"]);
  assert.equal(decideStatus(49), "Rejeté ATS");
  assert.equal(decideStatus(50), "À examiner");
});
