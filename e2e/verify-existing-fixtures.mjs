import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const PROJECT_REF = "ofqqrryamslxoqkklraw";
const PROJECT_URL = "https://" + PROJECT_REF + ".supabase.co";
// Publishable key (public client key) pinned to JOBLY-E2E so this verifier
// does not depend on a potentially stale local copy of provision-fixtures.mjs.
const PUBLISHABLE_KEY = "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
const FIXTURES = [
  { key: "talent", role: "TALENT", email: "jobly-e2e-talent@jobly.test" },
  { key: "recruiter", role: "RECRUITER", email: "jobly-e2e-recruiter@jobly.test" },
  { key: "partner", role: "PARTNER", email: "jobly-e2e-partner@jobly.test" },
];
const REPORT_PATH = path.join(ROOT, "artifacts", "e2e", "fixture-password-verification.json");

function safeResult(role, status, reason) {
  return { role, status, reason };
}

async function discoverFixtureFile() {
  const explicit = process.argv[2];
  if (explicit) return path.resolve(ROOT, explicit);

  const names = await readdir(ROOT).catch(() => []);
  const candidates = names.filter((name) =>
    name === ".e2e-fixtures.json" ||
    (name.startsWith(".e2e-fixtures") && /(?:backup|bak|old|copy|save)/i.test(name))
  );
  const valid = [];
  for (const name of candidates) {
    const fullPath = path.join(ROOT, name);
    try {
      const parsed = JSON.parse(await readFile(fullPath, "utf8"));
      validateFixtureDocument(parsed);
      valid.push(fullPath);
    } catch {}
  }
  if (valid.length === 1) return valid[0];
  if (valid.length > 1) throw new Error("MULTIPLE_FIXTURE_BACKUPS");
  return null;
}

function validateFixtureDocument(document) {
  assert.equal(document?.environment, "JOBLY-E2E", "Fichier non JOBLY-E2E refusé.");
  assert.equal(document?.projectRef, PROJECT_REF, "Référence Supabase inattendue.");
  assert.ok(Array.isArray(document.accounts), "Liste des comptes absente.");
  for (const fixture of FIXTURES) {
    const account = document.accounts.find((item) =>
      item.key === fixture.key &&
      item.role === fixture.role &&
      item.email?.toLowerCase() === fixture.email
    );
    assert.ok(account, "Une fixture attendue est absente.");
    assert.ok(typeof account.password === "string" && account.password.length >= 8, "Mot de passe local indisponible.");
    assert.ok(typeof account.authUserId === "string" && account.authUserId.length > 0, "UID Auth local indisponible.");
  }
}

async function verifyAccount(fixture, account, publishableKey) {
  const client = createClient(PROJECT_URL, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const result = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (result.error) {
      const status = Number(result.error.status || 0);
      if (status === 400 || status === 401) {
        return safeResult(fixture.role, "FAIL", "Supabase Auth a refusé les identifiants existants.");
      }
      return safeResult(fixture.role, "NON_TESTABLE", "Erreur de service ou de réseau pendant la connexion Auth.");
    }

    const accessToken = result.data.session?.access_token;
    if (!accessToken) {
      return safeResult(fixture.role, "FAIL", "Supabase Auth n'a pas retourné de session utilisable.");
    }
    const verified = await client.auth.getUser(accessToken);
    if (verified.error) {
      return safeResult(fixture.role, "NON_TESTABLE", "La session a été ouverte, mais sa vérification serveur a échoué.");
    }
    const user = verified.data.user;
    const valid = user?.id === account.authUserId &&
      user?.app_metadata?.e2e_fixture === true &&
      user?.app_metadata?.e2e_role === fixture.role;

    return valid
      ? safeResult(fixture.role, "PASS", "Connexion réelle, session vérifiée côté serveur et identité/rôle fixture confirmés.")
      : safeResult(fixture.role, "FAIL", "Connexion obtenue, mais UID ou rôle signé différent de la fixture attendue.");
  } catch {
    return safeResult(fixture.role, "NON_TESTABLE", "Erreur technique pendant le contrôle Auth.");
  } finally {
    await client.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}

async function main() {
  const report = {
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    status: "NON_TESTABLE",
    credentialsPrinted: false,
    serviceRoleUsed: false,
    passwordsChanged: false,
    accountsCreatedOrDeleted: false,
    profilesModified: false,
    stage: "fixture_discovery",
    checks: FIXTURES.map((fixture) => safeResult(fixture.role, "NON_TESTABLE", "Contrôle non commencé : préflight non franchi.")),
  };

  try {
    const fixturePath = await discoverFixtureFile();
    if (!fixturePath) {
      report.reason = "Aucun fichier local de fixtures ni sauvegarde reconnue. Aucun appel Auth n'a été effectué.";
      return report;
    }

    let document;
    try {
      document = JSON.parse(await readFile(fixturePath, "utf8"));
      validateFixtureDocument(document);
    } catch (error) {
      report.reason = error?.message === "MULTIPLE_FIXTURE_BACKUPS"
        ? "Plusieurs sauvegardes plausibles existent. Relancer avec le chemin explicite d'une seule sauvegarde."
        : "Le fichier trouvé ne contient pas les trois fixtures JOBLY-E2E complètes. Aucun appel Auth n'a été effectué.";
      return report;
    }

    report.stage = "auth_configuration";
    const publishableKey = PUBLISHABLE_KEY;
    report.stage = "auth_verification";
    const results = [];
    for (const fixture of FIXTURES) {
      const account = document.accounts.find((item) => item.key === fixture.key && item.role === fixture.role);
      results.push(await verifyAccount(fixture, account, publishableKey));
    }
    report.checks = results;
    report.stage = "completed";
    report.status = results.every((item) => item.status === "PASS")
      ? "PASS"
      : results.some((item) => item.status === "FAIL")
        ? "FAIL"
        : "PARTIAL";
    report.reason = "Contrôle Auth réel effectué sans réinitialisation ni modification des profils.";
    return report;
  } catch (error) {
    report.reason = error?.message === "MULTIPLE_FIXTURE_BACKUPS"
      ? "Plusieurs sauvegardes JOBLY-E2E valides existent. Relancer en indiquant explicitement le chemin d'une seule sauvegarde."
      : report.stage === "auth_configuration"
        ? "Configuration du client public JOBLY-E2E indisponible ; aucun secret privé n'a été utilisé."
        : "Contrôle interrompu avant la fin ; aucun secret privé ni changement de compte n'a été utilisé.";
    return report;
  }
}

const report = await main();
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", {
  encoding: "utf8",
  mode: 0o600,
});
console.log(JSON.stringify(report, null, 2));
console.log("Rapport : artifacts/e2e/fixture-password-verification.json");
