import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { chmod, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const PROJECT_URL = "https://" + PROJECT_REF + ".supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
const FIXTURE_PATH = path.resolve(".e2e-fixtures.json");
const PENDING_PATH = path.resolve(".e2e-fixture-password-reset.pending.json");
const REPORT_PATH = path.resolve("artifacts/e2e/fixture-password-reset.json");

const FIXTURES = [
  { key: "talent", role: "TALENT", email: "jobly-e2e-talent@jobly.test", username: "jobly_e2e_talent" },
  { key: "recruiter", role: "RECRUITER", email: "jobly-e2e-recruiter@jobly.test", username: "jobly_e2e_recruiter" },
  { key: "partner", role: "PARTNER", email: "jobly-e2e-partner@jobly.test", username: "jobly_e2e_partner" },
];

let serviceRoleUsed = false;
let changedRoles = [];

function makePassword() {
  return "JlyE2E!" + randomBytes(36).toString("base64url") + "aA9!";
}

function parseEnvFile(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

async function getE2ESecretFromLocalEnv() {
  for (const file of [".env.e2e.local", ".env.local", ".env"]) {
    const raw = await readFile(path.resolve(file), "utf8").catch(() => "");
    if (!raw) continue;
    const values = parseEnvFile(raw);
    const url = values.NEXT_PUBLIC_SUPABASE_URL || values.SUPABASE_URL || "";
    if (url !== PROJECT_URL) continue;
    const key = values.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SECRET_KEY || "";
    if (key && key.length >= 20) return key;
  }
  return "";
}

function readHiddenSecret(prompt) {
  const stream = input;
  if (!stream.isTTY || typeof stream.setRawMode !== "function") {
    throw new Error("TERMINAL_NOT_INTERACTIVE");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    let finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      stream.off("data", onData);
      stream.setRawMode(false);
      stream.pause();
      output.write("\n");
      if (error) reject(error);
      else resolve(value.trim());
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Saisie interrompue."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u0008" || character === "\u007f") value = value.slice(0, -1);
        else if (character >= " " && character !== "\u007f") value += character;
      }
    };
    output.write(prompt);
    stream.setRawMode(true);
    stream.resume();
    stream.on("data", onData);
  });
}

function validateSecretShape(secret) {
  if (!secret || secret.length < 20) throw new Error("Clé privée Supabase absente ou invalide.");
  if (secret.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(secret.split(".")[1], "base64url").toString("utf8"));
      if (payload.ref !== PROJECT_REF) throw new Error("WRONG_PROJECT_KEY");
    } catch (error) {
      if (error?.message === "WRONG_PROJECT_KEY") throw new Error("La clé JWT fournie n'appartient pas à JOBLY-E2E.");
      throw new Error("La clé JWT ne peut pas être vérifiée.");
    }
  }
  if (secret.startsWith("sb_secret_") || secret.startsWith("eyJ")) return;
  throw new Error("Format de clé privée inconnu. Utilise la Secret key ou l'ancienne service_role de JOBLY-E2E.");
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = filePath + ".tmp-" + randomUUID();
  await writeFile(tempPath, JSON.stringify(value, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  if (process.platform !== "win32") await chmod(tempPath, 0o600);
  await rename(tempPath, filePath);
  if (process.platform !== "win32") await chmod(filePath, 0o600);
}

async function askForExplicitConfirmation() {
  if (!process.argv.includes("--confirm-reset-existing-e2e-passwords")) {
    throw new Error("CONFIRMATION_FLAG_REQUIRED");
  }
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      "Confirme le changement des mots de passe des 3 COMPTES EXISTANTS JOBLY-E2E en tapant exactement RESET 3 JOBLY-E2E PASSWORDS : "
    );
    if (answer.trim() !== "RESET 3 JOBLY-E2E PASSWORDS") {
      throw new Error("CONFIRMATION_TEXT_MISMATCH");
    }
  } finally {
    rl.close();
  }
}

async function listAndValidateExistingAccounts(admin) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error("Lecture Auth Admin JOBLY-E2E impossible.");

  const result = [];
  for (const fixture of FIXTURES) {
    const matches = data.users.filter((user) => user.email?.toLowerCase() === fixture.email);
    if (matches.length !== 1) {
      throw new Error("Le compte Auth existant attendu n'est pas présent exactement une fois : " + fixture.role);
    }
    const authUser = matches[0];
    if (authUser.app_metadata?.e2e_fixture !== true || authUser.app_metadata?.e2e_role !== fixture.role) {
      throw new Error("Le rôle ou le marqueur fixture ne correspond pas pour " + fixture.role + ". Aucun mot de passe n'a encore été modifié.");
    }

    const { data: appUser, error: userError } = await admin
      .from("User")
      .select("id,authUserId,email,role")
      .eq("authUserId", authUser.id)
      .maybeSingle();
    if (userError || !appUser ||
        appUser.authUserId !== authUser.id ||
        appUser.email?.toLowerCase() !== fixture.email ||
        appUser.role !== fixture.role) {
      throw new Error("La correspondance Auth/User n'est pas vérifiée pour " + fixture.role + ". Aucun mot de passe n'a encore été modifié.");
    }

    const profileTable = fixture.role === "TALENT" ? "Profile"
      : fixture.role === "RECRUITER" ? "RecruiterProfile" : "Partner";
    const profileOwnerId = fixture.role === "RECRUITER" ? authUser.id : appUser.id;
    const { data: profile, error: profileError } = await admin
      .from(profileTable)
      .select("id")
      .eq("userId", profileOwnerId)
      .maybeSingle();
    if (profileError || !profile) {
      throw new Error("Le profil métier existant n'est pas confirmé pour " + fixture.role + ". Aucun mot de passe n'a encore été modifié.");
    }

    result.push({
      ...fixture,
      authUserId: authUser.id,
      userId: appUser.id,
      password: null,
    });
  }
  return result;
}

async function main() {
  const report = {
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    status: "BLOCKED",
    operation: "RESET_PASSWORDS_OF_EXISTING_FIXTURES_ONLY",
    targets: FIXTURES.map(({ role }) => role),
    serviceRoleUsed,
    passwordsChanged: changedRoles.length > 0,
    changedRoles,
    accountsCreatedOrDeleted: false,
    profilesModified: false,
    credentialsPrinted: false,
    checks: FIXTURES.map(({ role }) => ({ role, status: "NOT_RUN" })),
  };

  await askForExplicitConfirmation();

  try {
    await readFile(FIXTURE_PATH, "utf8");
    throw new Error("FIXTURE_FILE_ALREADY_EXISTS");
  } catch (error) {
    if (error?.message === "FIXTURE_FILE_ALREADY_EXISTS") throw error;
    if (error?.code !== "ENOENT") throw error;
  }

  let pending;
  try {
    pending = JSON.parse(await readFile(PENDING_PATH, "utf8"));
    assert.equal(pending.environment, "JOBLY-E2E");
    assert.equal(pending.projectRef, PROJECT_REF);
    assert.ok(Array.isArray(pending.accounts));
    assert.equal(pending.accounts.length, 3);
    for (const fixture of FIXTURES) {
      const account = pending.accounts.find((item) => item.key === fixture.key && item.role === fixture.role);
      assert.ok(account?.password && account.password.length >= 30);
      assert.ok(account.authUserId && account.userId);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw new Error("Fichier de reprise de mots de passe invalide. Conserve-le et demande une inspection ; aucune réinitialisation lancée.");
    pending = null;
  }

  let secret = await getE2ESecretFromLocalEnv();
  if (!secret) {
    secret = await readHiddenSecret("Clé privée Secret/service_role de JOBLY-E2E (saisie masquée) : ");
  }
  validateSecretShape(secret);

  const admin = createClient(PROJECT_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const verified = await listAndValidateExistingAccounts(admin);
  serviceRoleUsed = true;
  report.serviceRoleUsed = true;

  if (pending) {
    for (const fixture of FIXTURES) {
      const old = pending.accounts.find((item) => item.key === fixture.key && item.role === fixture.role);
      if (old.authUserId !== verified.find((item) => item.role === fixture.role).authUserId ||
          old.userId !== verified.find((item) => item.role === fixture.role).userId) {
        throw new Error("Les identifiants Auth/User ont changé depuis la préparation du reset. Aucune mise à jour effectuée.");
      }
    }
  } else {
    pending = {
      schemaVersion: 1,
      environment: "JOBLY-E2E",
      projectRef: PROJECT_REF,
      createdAt: new Date().toISOString(),
      accounts: verified.map((account) => ({ ...account, password: makePassword(), resetStatus: "PENDING" })),
    };
    await writeJsonAtomic(PENDING_PATH, pending);
  }

  console.log("Prévalidation terminée : 3 identités Auth, 3 rôles, 3 correspondances User et 3 profils confirmés.");
  console.log("Mise à jour des mots de passe des comptes existants uniquement…");

  for (const fixture of FIXTURES) {
    const item = pending.accounts.find((account) => account.key === fixture.key && account.role === fixture.role);
    const { error } = await admin.auth.admin.updateUserById(item.authUserId, { password: item.password });
    if (error) {
      report.checks = pending.accounts.map((account) => ({
        role: account.role,
        status: account.resetStatus === "UPDATED" ? "PASSWORD_UPDATED" : "NOT_UPDATED",
      }));
      report.status = "PARTIAL";
      report.reason = "Une mise à jour a échoué. Le fichier pending local conserve les nouveaux mots de passe générés pour permettre une reprise contrôlée.";
      await mkdir(path.dirname(REPORT_PATH), { recursive: true });
      await writeJsonAtomic(REPORT_PATH, report);
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = 1;
      return;
    }
    item.resetStatus = "UPDATED";
    item.updatedAt = new Date().toISOString();
    changedRoles = pending.accounts.filter((account) => account.resetStatus === "UPDATED").map((account) => account.role);
    report.passwordsChanged = changedRoles.length > 0;
    report.changedRoles = changedRoles;
    await writeJsonAtomic(PENDING_PATH, pending);
  }

  const fixtureDocument = {
    schemaVersion: 2,
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    accounts: pending.accounts.map(({ key, role, email, username, password, authUserId, userId }) => ({
      key, role, email, username, password, authUserId, userId,
    })),
    safeguards: {
      onlySyntheticFixtureEmails: true,
      existingAuthAccountsPreserved: true,
      accountsCreated: false,
      accountsDeleted: false,
      profilesModified: false,
      productionAccess: false,
      emailSent: false,
      smsSent: false,
      paymentSent: false,
    },
  };
  await writeJsonAtomic(FIXTURE_PATH, fixtureDocument);
  await unlink(PENDING_PATH).catch(() => undefined);

  const verification = await Promise.all(FIXTURES.map(async (fixture) => {
    const saved = fixtureDocument.accounts.find((item) => item.key === fixture.key);
    const client = createClient(PROJECT_URL, PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    try {
      const login = await client.auth.signInWithPassword({ email: saved.email, password: saved.password });
      if (login.error || !login.data.session?.access_token) {
        return { role: fixture.role, status: "FAIL", reason: "Connexion après réinitialisation refusée." };
      }
      const checked = await client.auth.getUser(login.data.session.access_token);
      const ok = !checked.error &&
        checked.data.user?.id === saved.authUserId &&
        checked.data.user?.app_metadata?.e2e_fixture === true &&
        checked.data.user?.app_metadata?.e2e_role === fixture.role;
      return ok
        ? { role: fixture.role, status: "PASS", reason: "Nouveau mot de passe accepté ; UID et rôle signé vérifiés." }
        : { role: fixture.role, status: "FAIL", reason: "Connexion obtenue, mais identité/rôle non conforme." };
    } catch {
      return { role: fixture.role, status: "NON_TESTABLE", reason: "Erreur technique pendant la vérification post-reset." };
    } finally {
      await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  }));

  report.checks = verification;
  report.passwordsChanged = true;
  report.status = verification.every((item) => item.status === "PASS")
    ? "PASS"
    : verification.some((item) => item.status === "FAIL")
      ? "PARTIAL"
      : "PARTIAL";
  report.reason = "Les trois mots de passe des comptes Auth existants ont été mis à jour ; le fichier de fixtures local a été restauré ; aucun compte ni profil n'a été créé, supprimé ou modifié.";
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeJsonAtomic(REPORT_PATH, report);
  console.log(JSON.stringify(report, null, 2));
  console.log("Fixtures locales sécurisées : .e2e-fixtures.json (ne pas partager).");
  console.log("Rapport expurgé : artifacts/e2e/fixture-password-reset.json");
}

main().catch(async (error) => {
  const report = {
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    status: "BLOCKED",
    serviceRoleUsed,
    passwordsChanged: changedRoles.length > 0,
    changedRoles,
    accountsCreatedOrDeleted: false,
    profilesModified: false,
    credentialsPrinted: false,
    reason: error?.message === "CONFIRMATION_FLAG_REQUIRED"
      ? "Commande incomplète : confirmation explicite requise dans les arguments."
      : error?.message === "CONFIRMATION_TEXT_MISMATCH"
        ? "Confirmation textuelle incorrecte ; aucune mise à jour effectuée."
        : error?.message === "FIXTURE_FILE_ALREADY_EXISTS"
          ? "Le fichier de fixtures existe déjà. Ne pas l'écraser ; utiliser la recette Auth normale."
          : error instanceof Error
            ? error.message.replace(/sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+/g, "[secret masqué]")
            : "Erreur inconnue, détails masqués.",
    checks: FIXTURES.map(({ role }) => ({
      role,
      status: changedRoles.includes(role) ? "PASSWORD_UPDATED" : "NOT_UPDATED",
    })),
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true }).catch(() => undefined);
  await writeJsonAtomic(REPORT_PATH, report).catch(() => undefined);
  console.log(JSON.stringify(report, null, 2));
  console.log("Aucun secret n'a été affiché.");
  process.exitCode = 1;
});
