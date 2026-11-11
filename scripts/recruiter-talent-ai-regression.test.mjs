import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeATSMatch, selectApplicationCvText } from "../lib/atsService.ts";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("ATS recruiter calculation prioritizes the CV snapshot attached to the application", () => {
  const submitted = "CV soumis : expérience de gestion de portefeuille clients, négociation commerciale, CRM et reporting financier.";
  const currentProfile = "Profil mis à jour : développement logiciel, React, TypeScript, conception d'interfaces et tests automatisés.";
  const selected = selectApplicationCvText(submitted, currentProfile);

  assert.equal(selected.source, "APPLICATION_CV");
  assert.equal(selected.text, submitted);
  assert.ok(analyzeATSMatch(selected.text, "gestion portefeuille clients négociation CRM reporting financier").score > 0);
});

test("ATS recruiter calculation falls back to a usable Jobly profile only for legacy applications", () => {
  const profile = "Responsable commercial, gestion de portefeuille clients, négociation, prospection et maîtrise CRM.";
  const selected = selectApplicationCvText("CV non disponible.", profile);

  assert.equal(selected.source, "PROFILE_ANALYSIS");
  assert.equal(selected.text, profile);
});

test("ATS recruiter calculation marks insufficient CV and profile material as not calculable", () => {
  assert.deepEqual(selectApplicationCvText("", "CV"), {
    text: "",
    source: "NOT_CALCULABLE",
  });
});

test("Recruiter ATS exposes score, keyword, combined filters and applies them server-side", () => {
  const page = read("app/recruiter/ats/page.tsx");
  const api = read("app/api/recruiter/applications/route.ts");
  const board = read("components/RecruiterATS.tsx");

  for (const key of ["atsMin", "atsMax", "atsKeyword", "atsKeywordMode", "atsSort"]) {
    assert.ok(page.includes(`query.set("${key}"`), `Recruiter UI must send ${key}`);
  }
  assert.match(api, /url\.searchParams\.get\("atsMin"\)/);
  assert.match(api, /url\.searchParams\.get\("atsMax"\)/);
  assert.match(api, /url\.searchParams\.get\("atsKeyword"\)/);
  assert.match(api, /url\.searchParams\.get\("atsKeywordMode"\)/);
  assert.match(api, /results = results\.filter/);
  assert.match(api, /atsScoreSource: analysis\.score !== null \? selectedCv\.source/);
  assert.match(board, /Compatibilité ATS Jobly/);
  assert.match(board, /Présents/);
  assert.match(board, /Manquants/);
  assert.match(board, /Calculé depuis le CV soumis avec cette candidature/);
});

test("Talent ATS conversation uses a Talent-only persisted J'IA conversation and the authenticated CV assistant", () => {
  const page = read("app/talent/cvs/page.tsx");
  const assist = read("app/api/talent/cv/assist/route.ts");
  const conversations = read("app/api/jia/conversations/route.ts");

  assert.match(page, /ecosystem=TALENT&title=CV%20ATS/);
  assert.match(page, /action: "create", ecosystem: "TALENT", title: "CV ATS"/);
  assert.match(page, /mode: "CHAT"/);
  assert.match(page, /await persistAtsChatMessage\("user", question\)/);
  assert.match(page, /await persistAtsChatMessage\("assistant", reply\)/);
  assert.match(assist, /user\.role !== "TALENT" && user\.role !== "ADMIN"/);
  assert.match(assist, /mode === "CHAT"/);
  assert.match(conversations, /privacyAcceptedAt/);
  assert.match(conversations, /\.eq\("userId", ctx\.user\.id\)/);
});

test("Talent CV improvement is proposed, reviewed, selectively accepted and saved only by the Talent", () => {
  const page = read("app/talent/cvs/page.tsx");
  const assist = read("app/api/talent/cv/assist/route.ts");
  const aiCore = read("supabase/functions/ai-core/index.ts");

  assert.match(page, /mode: "IMPROVE"/);
  assert.match(page, /setPendingCvChanges\(changes\)/);
  assert.match(page, /Appliquer la sélection/);
  assert.match(page, /Tout refuser/);
  assert.match(page, /Clique sur Enregistrer pour les conserver/);
  assert.match(assist, /mode === "IMPROVE"/);
  assert.match(assist, /fullName: clean\(cv\.fullName, 160\)/);
  assert.match(assist, /email: clean\(cv\.email, 200\)/);
  assert.match(assist, /phone: clean\(cv\.phone, 80\)/);
  assert.match(aiCore, /Ne crée pas de nouvelles réalisations ou responsabilités/);
  assert.match(aiCore, /Chaque changement doit montrer exactement le texte avant et après/);
});

test("Recruiter job generation starts from the title, returns a reviewable draft and never publishes automatically", () => {
  const page = read("components/recruiter/RecruiterJobForm.tsx");
  const route = read("app/api/recruiter/jobs/generate/route.ts");
  const aiCore = read("supabase/functions/ai-core/index.ts");

  assert.match(page, /onClick=\{generateFromTitle\}/);
  assert.match(page, /JSON\.stringify\(\{ title \}\)/);
  assert.match(page, /setDescription\(draft\.description\)/);
  assert.match(page, /setGenerationNotice/);
  assert.match(page, /submit\(nextStatus: "draft" \| "published"\)/);
  assert.match(route, /getAuthUser\(request\)/);
  assert.match(route, /runAiGateway\(request, "OFFER_INTELLIGENCE", \{ jobTitle: title \}\)/);
  assert.match(route, /missingFields/);
  assert.doesNotMatch(route, /\.from\("RecruiterJob"\)\.insert/);
  assert.match(aiCore, /ne les invente jamais/);
  assert.match(aiCore, /Ne publie jamais l'offre/);
});
