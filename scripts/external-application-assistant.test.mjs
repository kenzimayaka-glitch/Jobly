import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("source-only offers remain visible independently from direct application readiness", () => {
  const api=read("app/api/jobs/route.ts"), processor=read("supabase/functions/job-harvest-process/index.ts");
  assert.match(api,/Listing visibility is independent from application readiness/);
  assert.match(api,/sourceUrl:job\.sourceUrl/);
  assert.match(processor,/sourceUrl,/);
  assert.doesNotMatch(processor,/if\s*\(!hasApplicationRoute\)\s*\{[\s\S]{0,180}(?:return|quarantine)/i);
});
test("discovery only marks a verified email or phone as direct-ready", () => {
  const source=read("supabase/functions/discover-jobs/index.ts");
  assert.match(source,/const applicationReady=Boolean\(applicationEmail\|\|phoneNumbers\.length\)/);
  assert.match(source,/channel:applicationEmail\?"EMAIL":phoneNumbers\.length\?"WHATSAPP_PHONE":"SOURCE_ONLY"/);
  assert.doesNotMatch(source,/applicationReady:phoneNumbers\.length===0/);
});
test("source-only offers can open their promoter site and pass context to J'IA", () => {
  const feed=read("components/JoblyOfferFeed.tsx");
  assert.match(feed,/job\.sourceUrl\s*\|\|\s*job\.applicationProfile\?\.sourceUrl/);
  assert.match(feed,/announceExternalApplicationToJia/);
  assert.match(feed,/Voir chez le promoteur/);
});
test("offer detail exposes external application and J'IA preparation", () => {
  const detail=read("app/jobs/[id]/page.tsx");
  assert.match(detail,/Préparer avec J’IA/);
  assert.match(detail,/Candidature à poursuivre sur le site du promoteur/);
  assert.match(detail,/Ouvrir l’annonce chez le promoteur/);
});
test("J'IA accepts external application context with final submission reserved to the talent", () => {
  const helper=read("lib/jia/external-application.ts"), presence=read("components/JiaPresence.tsx");
  assert.match(helper,/window\.postMessage/);
  assert.match(helper,/tu ne soumets jamais la candidature à ma place/);
  assert.match(presence,/jobly:jia-application-assist/);
  assert.match(presence,/setCommandInput\(prompt\)/);
});
test("Android PWA can receive a shared promoter page", () => {
  const manifest=JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.share_target.action,"/jia/share");
  assert.match(read("app/jia/share/page.tsx"),/Demander l’aide de J’IA/);
});
test("desktop extension requests origin permission and reads labels only", () => {
  const manifest=JSON.parse(read("apps/jia-chrome-extension/manifest.json"));
  assert.ok(manifest.permissions.includes("sidePanel"));
  const panel=read("apps/jia-chrome-extension/sidepanel.js");
  assert.match(panel,/chrome\.permissions\.request/);
  assert.match(panel,/JOBLY_OPEN_JIA_ASSIST/);
  assert.doesNotMatch(panel,/el\.value|\.value\s*\)/);
});
