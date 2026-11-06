import assert from "node:assert/strict";

const expectedRef = "ofqqrryamslxoqkklraw";
const expectedUrl = `https://${expectedRef}.supabase.co`;
const expectedPublishableKey = "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
const projectRef = process.env.E2E_PROJECT_REF || "";
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

assert.equal(projectRef, expectedRef, "Ref Supabase E2E incorrecte.");
assert.equal(projectUrl, expectedUrl, "URL refusée : seule JOBLY-E2E est autorisée.");
assert.equal(publishableKey, expectedPublishableKey, "Clé publique refusée : elle ne correspond pas à JOBLY-E2E.");

const response = await fetch(`${expectedUrl}/auth/v1/settings`, {
  method: "GET",
  headers: { apikey: publishableKey, Accept: "application/json" },
  cache: "no-store",
});
assert.ok(response.ok, `JOBLY-E2E ne répond pas avec sa clé publique (HTTP ${response.status}).`);
const settings = await response.json();
assert.ok(settings && typeof settings === "object", "Réponse Auth de JOBLY-E2E invalide.");

console.log(JSON.stringify({
  status: "PASS",
  gate: "LOT-0-E2E-PUBLIC-CONNECTION",
  projectRef: expectedRef,
  authSettings: {
    disableSignup: settings.disable_signup ?? null,
    mailerAutoconfirm: settings.mailer_autoconfirm ?? settings.autoconfirm ?? null,
    phoneAutoconfirm: settings.phone_autoconfirm ?? null,
  },
  checks: [
    "URL Supabase strictement limitée à JOBLY-E2E",
    "Clé publishable vérifiée sans secret serveur",
    "API Auth JOBLY-E2E joignable",
    "Aucune écriture, création de compte ou opération Auth effectuée"
  ]
}, null, 2));
