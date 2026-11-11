import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldUseInternetBrain } from "../lib/jia/internet/policy.ts";
import { buildNextBestActions } from "../lib/jia/intelligence.ts";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Internet Brain activates for explicit external and current-information requests", () => {
  assert.equal(shouldUseInternetBrain("Cherche sur Internet les dernières actualités de l’emploi au Cameroun."), true);
  assert.equal(shouldUseInternetBrain("Compare ces sources officielles en ligne."), true);
  assert.equal(shouldUseInternetBrain("Quelle est la réglementation en vigueur ?"), true);
  assert.equal(shouldUseInternetBrain("Que s’est-il passé aujourd’hui dans ce secteur ?"), true);
});

test("routine Jobly searches and personal data stay inside Jobly instead of being sent to web search", () => {
  assert.equal(shouldUseInternetBrain("Trouve-moi des offres d’emploi à Douala."), false);
  assert.equal(shouldUseInternetBrain("Analyse mon CV et mes compétences."), false);
  assert.equal(shouldUseInternetBrain("Quel est mon abonnement et mon solde ?"), false);
  assert.equal(shouldUseInternetBrain("Prépare ma candidature avec mon profil."), false);
});

test("the authenticated conversational Brain forwards explicit Internet intent into the unified cognitive cycle", () => {
  const route = read("app/api/jia/brain/route.ts");
  const brain = read("lib/jia/brain.ts");
  assert.match(route, /const useInternetBrain = shouldUseInternetBrain\(message\)/);
  assert.match(route, /includeInternet: useInternetBrain/);
  assert.match(route, /internetQuery: useInternetBrain \? message : undefined/);
  assert.match(brain, /return shouldUseInternetBrain\(message\)/);
});

test("the direct cognitive-cycle API also supports automatic explicit web intent and caller-supplied research queries", () => {
  const route = read("app/api/jia/cycle/route.ts");
  assert.match(route, /shouldUseInternetBrain\(message\)/);
  assert.match(route, /const explicitInternetQuery/);
  assert.match(route, /const includeInternet\s*=\s*body\?\.includeInternet\s*===\s*true\s*\|\|\s*Boolean\(explicitInternetQuery\)\s*\|\|\s*shouldUseInternetBrain\(message\)/);
});

test("external observations are ingested through the cognitive evidence path and Internet Brain can still be globally disabled", () => {
  const runtime = read("lib/jia/runtime.ts");
  const policy = read("lib/jia/internet/policy.ts");
  assert.match(runtime, /observeInternet/);
  assert.match(runtime, /ingestExternalSignal\(/);
  assert.match(runtime, /type:"EXTERNAL_WEB_EVIDENCE"/);
  assert.match(runtime, /sources:internetObservation\.sourcesUsed/);
  const recommendations = buildNextBestActions([{ id: "internet-brain-evidence", type: "EXTERNAL_WEB_EVIDENCE", title: "Éléments externes vérifiés", detail: "Deux sources concordantes.", confidence: "HIGH" }]);
  assert.equal(recommendations[0]?.actionType, "VERIFY");
  assert.equal(recommendations[0]?.entityType, "EXTERNAL_SIGNAL");
  assert.match(policy, /JIA_INTERNET_ENABLED\s*!==\s*"false"/);
  assert.match(policy, /mode\s*!==\s*"OFF"/);
});
