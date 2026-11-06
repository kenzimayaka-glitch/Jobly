import assert from "node:assert/strict";

const expectedRef = "ofqqrryamslxoqkklraw";
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || "";
const adminEmail = (process.env.E2E_ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = process.env.E2E_ADMIN_PASSWORD || "";

function requireValue(name, value) {
  if (!value) throw new Error(`Lot 0 BLOQUÉ : secret/variable ${name} absent(e) des variables E2E.`);
}

requireValue("E2E_PROJECT_REF", process.env.E2E_PROJECT_REF);
requireValue("NEXT_PUBLIC_SUPABASE_URL", projectUrl);
requireValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
requireValue("E2E_SUPABASE_SERVICE_ROLE_KEY", serviceKey);
requireValue("E2E_ADMIN_EMAIL", adminEmail);
requireValue("E2E_ADMIN_PASSWORD", adminPassword);

assert.equal(process.env.E2E_PROJECT_REF, expectedRef, "Ref Supabase E2E incorrecte.");
const parsedUrl = new URL(projectUrl);
assert.equal(parsedUrl.protocol, "https:", "L'URL Supabase E2E doit utiliser HTTPS.");
assert.equal(parsedUrl.hostname, `${expectedRef}.supabase.co`, "URL refusée : ce n'est pas JOBLY-E2E.");

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  Accept: "application/json",
};

async function getJson(url, label) {
  const response = await fetch(url, { method: "GET", headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${label} échoué (HTTP ${response.status}). Vérifier que la clé secrète appartient bien à JOBLY-E2E et que l'API est accessible.`);
  }
  return response.json();
}

const publicSettingsResponse = await fetch(`${projectUrl}/auth/v1/settings`, {
  method: "GET",
  headers: { apikey: publishableKey, Accept: "application/json" },
  cache: "no-store",
});
assert.ok(publicSettingsResponse.ok, `La clé publique configurée ne correspond pas à JOBLY-E2E (HTTP ${publicSettingsResponse.status}).`);
const publicSettings = await publicSettingsResponse.json();
assert.ok(publicSettings && typeof publicSettings === "object", "Réponse Auth publique Supabase E2E invalide.");

const settings = await getJson(`${projectUrl}/auth/v1/settings`, "Contrôle de la clé serveur Supabase E2E");
assert.ok(settings && typeof settings === "object", "Réponse Auth serveur Supabase E2E invalide.");

const usersPayload = await getJson(`${projectUrl}/auth/v1/admin/users?page=1&per_page=1000`, "Lecture des comptes Auth E2E");
const authUsers = Array.isArray(usersPayload?.users) ? usersPayload.users : [];
const adminAuth = authUsers.find((user) => String(user.email || "").trim().toLowerCase() === adminEmail);
assert.ok(adminAuth, "Le compte E2E_ADMIN_EMAIL n'existe pas dans Auth JOBLY-E2E.");
assert.ok(adminAuth.email_confirmed_at || adminAuth.confirmed_at, "Le compte ADMIN E2E doit avoir son adresse confirmée.");

const userUrl = new URL(`${projectUrl}/rest/v1/User`);
userUrl.searchParams.set("select", "id,role,authUserId");
userUrl.searchParams.set("email", `eq.${adminEmail}`);
const appUsers = await getJson(userUrl, "Vérification du compte applicatif ADMIN");
assert.equal(appUsers.length, 1, "Une et une seule ligne User doit correspondre au compte ADMIN E2E.");
assert.equal(appUsers[0].role, "ADMIN", "Le compte applicatif lié doit avoir le rôle ADMIN.");
assert.equal(String(appUsers[0].authUserId || ""), String(adminAuth.id), "Le compte Auth et le compte Jobly ne sont pas correctement reliés.");

const identityUrl = new URL(`${projectUrl}/rest/v1/AdminIdentity`);
identityUrl.searchParams.set("select", "id,active,ownerUserId,authUserId");
identityUrl.searchParams.set("ownerUserId", `eq.${appUsers[0].id}`);
const identities = await getJson(identityUrl, "Vérification de l'identité maître ADMIN");
assert.ok(identities.some((identity) => identity.active === true && String(identity.authUserId) === String(adminAuth.id)), "AdminIdentity active et liée au compte Auth introuvable.");

const workspaceUrl = new URL(`${projectUrl}/rest/v1/AdminWorkspace`);
workspaceUrl.searchParams.set("select", "id,enabled");
workspaceUrl.searchParams.set("ownerUserId", `eq.${appUsers[0].id}`);
workspaceUrl.searchParams.set("enabled", "eq.true");
const workspaces = await getJson(workspaceUrl, "Vérification des espaces ADMIN");
assert.equal(workspaces.length, 4, "Les quatre espaces ADMIN attendus ne sont pas tous activés.");

console.log(JSON.stringify({
  status: "PASS",
  gate: "LOT-0-ADMIN-AND-SECRETS",
  projectRef: expectedRef,
  checks: [
    "URL et référence JOBLY-E2E exactes",
    "Clé serveur acceptée par le projet E2E",
    "Compte Auth ADMIN présent et confirmé",
    "Compte public.User unique, rôle ADMIN et authUserId relié",
    "AdminIdentity active et liée",
    "4 espaces ADMIN activés",
    "Aucune écriture ni connexion Auth interactive effectuée"
  ]
}, null, 2));
