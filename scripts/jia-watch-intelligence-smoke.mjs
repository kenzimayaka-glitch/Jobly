import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("lib/jia/watchIntelligenceScoring.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const module = { exports: {} };
new Function("require", "module", "exports", js)(require, module, module.exports);
const { scoreWatchObservation } = module.exports;

const cases = [
  {
    name: "SUPPRESS — no substantive change",
    changed: false,
    observation: { confidence: 0.95, context: { relevance: 1, impact: 1 } },
    expected: "SUPPRESS",
  },
  {
    name: "DIGEST — useful but below alert threshold",
    changed: true,
    observation: { confidence: 0.55, context: { relevance: 0.55, impact: 0.45 } },
    expected: "DIGEST",
  },
  {
    name: "NOTIFY — new, relevant, impactful and reliable",
    changed: true,
    observation: { confidence: 0.95, context: { relevance: 0.95, impact: 0.95 } },
    expected: "NOTIFY",
  },
  {
    name: "REVIEW — material contested signal",
    changed: true,
    observation: {
      confidence: 0.9,
      status: "CONTESTED",
      context: { relevance: 0.9, impact: 0.9 },
      contradictingSources: ["source-a", "source-b"],
    },
    expected: "REVIEW",
  },
];

for (const testCase of cases) {
  const result = scoreWatchObservation(testCase.observation, testCase.changed);
  assert.equal(result.decision, testCase.expected, testCase.name);
}

const contradiction = scoreWatchObservation(
  {
    confidence: 0.9,
    context: { relevance: 0.9, impact: 0.9 },
    contradictingSources: ["a", "b", "c"],
  },
  true,
);
assert.ok(contradiction.contradictionScore > 0);
assert.ok(contradiction.certainty < 0.9);

console.log("JIA Watch B3.1 smoke: 4/4 decision paths + contradiction attenuation passed.");
