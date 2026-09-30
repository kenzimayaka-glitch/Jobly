#!/usr/bin/env node
import fs from "node:fs";

const mode = process.env.TEST_MODE || "strict";
const input = process.argv[2] || "audit-output/duplication-v3-report.json";
const out = process.argv[3] || `audit-output/contradiction-${mode}.json`;

const report = JSON.parse(fs.readFileSync(input, "utf8"));
const findings = Array.isArray(report.findings) ? report.findings : [];

function num(f, key) {
  const x = f.counterEvidence?.find?.(e => e.type === key)?.value;
  return Number.isFinite(Number(x)) ? Number(x) : 0;
}
function flag(f, key) {
  const x = f.counterEvidence?.find?.(e => e.type === "discriminants")?.[key];
  return !!x;
}
function evidence(f) {
  const ev = Array.isArray(f.evidence) ? f.evidence : [];
  const exact = ev.filter(e => e.type === "exact_unit_match").length;
  const semantic = ev.filter(e => e.type === "semantic_overlap");
  const avg = semantic.length ? semantic.reduce((s,e)=>s+Number(e.similarity||0),0)/semantic.length : 0;
  const substantive = num(f,"substantiveUnits");
  const substantiveExact = num(f,"substantiveExactUnits");
  const disc = ["titleSame","companySame","locationSame","urlSame"].filter(k=>flag(f,k)).length;
  const sameSource = flag(f,"sameSource");
  return {exact,avg,substantive,substantiveExact,disc,sameSource};
}
function classify(f) {
  const e=evidence(f);
  if (mode==="strict") {
    return e.substantiveExact>=2 && e.disc>=2 ? "DUPLICATION" : "REVIEW";
  }
  if (mode==="semantic") {
    return (e.substantiveExact>=2 && e.disc>=2) ||
      (e.substantive>=3 && e.avg>=0.92 && e.disc>=3) ? "DUPLICATION" : "REVIEW";
  }
  if (mode==="source-aware") {
    if (e.sameSource && e.disc<2) return "NO_DUPLICATION";
    return (e.substantiveExact>=2 && e.disc>=2) ||
      (e.substantive>=3 && e.avg>=0.92 && e.disc>=3) ? "DUPLICATION" : "REVIEW";
  }
  throw new Error(`Unknown TEST_MODE: ${mode}`);
}

const target = findings.filter(f => f.class==="DUPLICATE_OFFER" || f.decision==="REVIEW" || f.class==="REVIEW");
const cases = target.map(f => {
  const e=evidence(f);
  const proposed=classify(f);
  return {
    pair:f.pair, currentClass:f.class, currentDecision:f.decision,
    proposed, changed: proposed!==f.decision,
    evidence:e, reason:f.reason
  };
});
const summary = {
  mode,
  inputFindings:findings.length,
  targetCases:cases.length,
  currentDuplicate:target.filter(f=>f.class==="DUPLICATE_OFFER"||f.decision==="DUPLICATION").length,
  currentReview:target.filter(f=>f.decision==="REVIEW").length,
  proposedDuplication:cases.filter(c=>c.proposed==="DUPLICATION").length,
  proposedReview:cases.filter(c=>c.proposed==="REVIEW").length,
  proposedNoDuplication:cases.filter(c=>c.proposed==="NO_DUPLICATION").length,
  changed:cases.filter(c=>c.changed).length
};
fs.mkdirSync("audit-output",{recursive:true});
fs.writeFileSync(out,JSON.stringify({version:"contradictory-3-tests-v1",generatedAt:new Date().toISOString(),summary,cases},null,2));
console.log(JSON.stringify(summary,null,2));
