import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const PROJECT_REF = "ofqqrryamslxoqkklraw";
const PROJECT_URL = "https://" + PROJECT_REF + ".supabase.co";
const REPORT_PATH = path.join(ROOT, "artifacts", "e2e", "fixture-password-verification-bulk.json");
const FIXTURES = [
  { key: "talent", role: "TALENT", email: "jobly-e2e-talent@jobly.test" },
  { key: "recruiter", role: "RECRUITER", email: "jobly-e2e-recruiter@jobly.test" },
  { key: "partner", role: "PARTNER", email: "jobly-e2e-partner@jobly.test" },
];

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
    assert.ok(account, "Fixture attendue absente.");
    assert.ok(typeof account.password === "string" && account.password.length >= 8, "Mot de passe local indisponible.");
  }
}

async function findLocalBackup() {
  const primary = path.join(ROOT, ".e2e-fixtures.json");
  const names = await readdir(ROOT).catch(() => []);
  const paths = [
    ...(names.includes(".e2e-fixtures.json") ? [primary] : []),
    ...names
      .filter((name) => name.startsWith(".e2e-fixtures") && /(?:backup|bak|old|copy|save)/i.test(name))
      .map((name) => path.join(ROOT, name)),
  ];
  const valid = [];
  for (const candidate of paths) {
    try {
      const parsed = JSON.parse(await readFile(candidate, "utf8"));
      validateFixtureDocument(parsed);
      valid.push({ file: candidate, document: parsed });
    } catch {}
  }
  if (valid.length > 1) {
    const error = new Error("MULTIPLE_FIXTURE_BACKUPS");
    throw error;
  }
  return valid[0] ?? null;
}

function readHidden(prompt) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("TERMINAL_NOT_INTERACTIVE");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    let finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Saisie interrompue."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u0008" || character === "\u007f") value = value.slice(0, -1);
        else if (character >= " " && character !== "\u007f") value += character;
      }
    };
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function loadPublishableKey() {
  const source = await readFile(path.join(ROOT, "e2e", "provision-fixtures.mjs"), "utf8");
  const urlMatch = source.match(/const PROJECT_URL = "([^"]+)";/);
  const keyMatch = source.match(/const PUBLISHABLE_KEY = "(sb_publishable_[^"]+)";/);
  if (urlMatch?.[1] !== PROJECT_URL || !keyMatch?.[1]) {
    throw new Error("CONFIGURATION_E2E_PUBLISHABLE_KEY_UNAVAILABLE");
  }
  return keyMatch[1];
}

async function verifyOne(fixture, credential, publishableKey) {
  const client = createClient(PROJECT_URL, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const login = await client.auth.signInWithPassword({
      email: fixture.email,
      password: credential.password,
    });
    if (login.error) {
      const status = Number(login.error.status || 0);
      return {
        role: fixture.role,
        status: status === 400 || status === 401 ? "FAIL" : "NON_TESTABLE",
        reason: status === 400 || status === 401
          ? "Supabase Auth a refusé les identifiants fournis."
          : "Erreur de service/réseau ; résultat non concluant.",
      };
    }

    const token = login.data.session?.access_token;
    if (!token) {
      return { role: fixture.role, status: "FAIL", reason: "Aucune session Auth retournée." };
    }

    const verified = await client.auth.getUser(token);
    if (verified.error) {
      return { role: fixture.role, status: "NON_TESTABLE", reason: "Session ouverte, mais vérification serveur impossible." };
    }

    const user = verified.data.user;
    const valid =
      user?.email?.toLowerCase() === fixture.email &&
      (!credential.authUserId || user?.id === credential.authUserId) &&
      user?.app_metadata?.e2e_fixture === true &&
      user?.app_metadata?.e2e_role === fixture.role;

    return valid
      ? { role: fixture.role, status: "PASS", reason: "Connexion réelle, UID et rôle signé confirmés." }
      : { role: fixture.role, status: "FAIL", reason: "Connexion obtenue, mais identité ou rôle signé non conforme." };
  } catch {
    return { role: fixture.role, status: "NON_TESTABLE", reason: "Erreur technique pendant la vérification Auth." };
  } finally {
    await client.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}

async function main() {
  const report = {
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    execution: "BULK_PARALLEL",
    status: "NON_TESTABLE",
    serviceRoleUsed: false,
    passwordsChanged: false,
    accountsCreatedOrDeleted: false,
    profilesModified: false,
    credentialsPrinted: false,
    checks: [],
  };

  let credentials;
  let source = "MASKED_TERMINAL_INPUT";
  try {
    const backup = await findLocalBackup();
    if (backup) {
      source = "LOCAL_FIXTURE_BACKUP";
      credentials = FIXTURES.map((fixture) => {
        const account = backup.document.accounts.find((item) => item.key === fixture.key && item.role === fixture.role);
        return { password: account.password, authUserId: account.authUserId };
      });
    } else {
      console.log("Aucune fixture locale exploitable trouvée.");
      console.log("Saisis les anciens mots de passe un par un. La saisie est masquée et rien n'est enregistré.\n");
      credentials = [];
      for (const fixture of FIXTURES) {
        const password = await readHidden("Ancien mot de passe " + fixture.role + " (" + fixture.email + ") : ");
        if (!password || password.length < 8) {
          throw new Error("EMPTY_OR_SHORT_PASSWORD_INPUT");
        }
        credentials.push({ password, authUserId: null });
      }
    }

    const publishableKey = await loadPublishableKey();
    report.credentialSource = source;
    console.log("\nLancement simultané des 3 vérifications Auth…");
    report.checks = await Promise.all(
      FIXTURES.map((fixture, index) => verifyOne(fixture, credentials[index], publishableKey))
    );
    report.status = report.checks.every((item) => item.status === "PASS")
      ? "PASS"
      : report.checks.some((item) => item.status === "FAIL")
        ? "FAIL"
        : "PARTIAL";
    report.reason = "Trois tentatives uniques exécutées en parallèle ; aucune réinitialisation ni écriture de profil.";
    return report;
  } catch (error) {
    report.reason = error?.message === "MULTIPLE_FIXTURE_BACKUPS"
      ? "Plusieurs sauvegardes de fixtures valides détectées. Sélection manuelle nécessaire ; aucun appel Auth effectué."
      : error?.message === "TERMINAL_NOT_INTERACTIVE"
        ? "Lancer depuis un CMD interactif pour la saisie masquée ; aucun appel Auth effectué."
        : error?.message === "EMPTY_OR_SHORT_PASSWORD_INPUT"
          ? "Saisie vide ou trop courte ; aucun appel Auth effectué."
          : "Vérification non exécutée : fichier ou configuration locale indisponible.";
    report.checks = FIXTURES.map((fixture) => ({
      role: fixture.role,
      status: "NON_TESTABLE",
      reason: "Aucun essai de connexion n'a été effectué pour ce rôle.",
    }));
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
console.log("Rapport : artifacts/e2e/fixture-password-verification-bulk.json");
