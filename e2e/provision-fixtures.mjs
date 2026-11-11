import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const PROJECT_URL = "https://" + PROJECT_REF + ".supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";
const FIXTURE_PATH = path.resolve(".e2e-fixtures.json");
const RUNTIME_PATH = path.resolve(".e2e-fixture-runtime.json");

const FIXTURES = [
  { key: "talent", email: "jobly-e2e-talent@jobly.test", role: "TALENT", firstName: "Amina", lastName: "E2E Talent", username: "jobly_e2e_talent", phone: "+237600000101", displayName: "Amina E2E Talent", headline: "Profil de test automatisé Jobly" },
  { key: "recruiter", email: "jobly-e2e-recruiter@jobly.test", role: "RECRUITER", firstName: "David", lastName: "E2E Recruiter", username: "jobly_e2e_recruiter", phone: "+237600000102", displayName: "David E2E Recruiter", companyName: "Jobly E2E Test Company" },
  { key: "partner", email: "jobly-e2e-partner@jobly.test", role: "PARTNER", firstName: "Mireille", lastName: "E2E Partner", username: "jobly_e2e_partner", phone: "+237600000103", displayName: "Mireille E2E Partner" },
];

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

async function keyFromExistingE2EEnvFile() {
  for (const file of [".env.e2e.local", ".env.local", ".env"]) {
    const content = await readFile(path.resolve(file), "utf8").catch(() => "");
    if (!content) continue;
    const values = parseEnvFile(content);
    const url = values.NEXT_PUBLIC_SUPABASE_URL || values.SUPABASE_URL || "";
    if (url !== PROJECT_URL) continue;
    const key = values.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SECRET_KEY || "";
    if (key) return key;
  }
  return "";
}

function readHiddenSecret(prompt) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("E2E_SERVICE_ROLE_KEY_REQUIRED: relancez depuis Node.js Command Prompt interactif pour saisir la clé privée JOBLY-E2E sans affichage.");
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
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

function assertKeyBelongsToE2E(key) {
  if (!key || key.length < 20) throw new Error("Clé privée Supabase absente ou invalide.");
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
      if (payload.ref !== PROJECT_REF) {
        throw new Error("La clé JWT fournie n'est pas associée à JOBLY-E2E. Seul JOBLY-E2E est autorisé.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("appartient")) throw error;
      throw new Error("Impossible de vérifier la clé Supabase fournie.");
    }
  }
}

function makePassword() {
  return "JlyE2E!" + randomBytes(32).toString("base64url") + "aA9!";
}

async function getOrCreateAuthUser(admin, fixture, password) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error("Lecture Auth Admin JOBLY-E2E impossible : " + listError.message);
  const existing = listed.users.find((user) => user.email && user.email.toLowerCase() === fixture.email);
  if (existing && (existing.app_metadata?.e2e_fixture !== true || existing.app_metadata?.e2e_role !== fixture.role)) {
    throw new Error("Adresse de fixture déjà utilisée par une identité non-fixture : " + fixture.email);
  }

  const metadata = {
    e2e_fixture: true,
    e2e_role: fixture.role,
    e2e_run_managed: true,
  };
  const userMetadata = {
    first_name: fixture.firstName,
    last_name: fixture.lastName,
    full_name: fixture.displayName,
    e2e_fixture: true,
  };

  if (existing) {
    throw new Error(
      "E2E_EXISTING_FIXTURE_PRESERVED: un compte fixture existe déjà. " +
      "Le provisionnement complet refuse de changer son mot de passe. " +
      "Utilisez --runtime-only si le fichier local des fixtures est intact ; " +
      "sinon, une récupération ciblée explicitement autorisée est nécessaire."
    );
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: fixture.email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (error || !data.user?.id) throw new Error("Création Auth du compte fixture impossible : " + (error?.message || "identité absente"));
  const { data: secured, error: metadataError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: metadata,
  });
  if (metadataError || !secured.user?.id) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw new Error("Marquage sécurisé de la fixture impossible : " + (metadataError?.message || "identité absente"));
  }
  return secured.user.id;
}

async function upsertApplicationIdentity(admin, fixture, authUserId) {
  const { data: byAuthId, error: byAuthIdError } = await admin
    .from("User").select("id,authUserId,email,role").eq("authUserId", authUserId).maybeSingle();
  if (byAuthIdError) throw byAuthIdError;
  const { data: byEmail, error: byEmailError } = await admin
    .from("User").select("id,authUserId,email,role").eq("email", fixture.email).maybeSingle();
  if (byEmailError) throw byEmailError;
  if (byAuthId && byEmail && byAuthId.id !== byEmail.id) throw new Error("Conflit de liaison User/Auth pour " + fixture.key);

  const existing = byAuthId || byEmail;
  if (existing && (
    (existing.authUserId && existing.authUserId !== authUserId) ||
    existing.email?.toLowerCase() !== fixture.email ||
    existing.role !== fixture.role
  )) {
    throw new Error("Ligne public.User occupée par une identité non-fixture : " + fixture.key);
  }

  const internalUserId = existing?.id || randomUUID();
  const now = new Date().toISOString();
  const userRow = {
    id: internalUserId,
    authUserId,
    email: fixture.email,
    phone: fixture.phone,
    role: fixture.role,
    displayName: fixture.displayName,
    username: fixture.username,
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    country: "CM",
    privacyAcceptedAt: now,
    aiWelcomeCredits: fixture.role === "TALENT" ? 30 : 0,
    aiWelcomeGrantedAt: fixture.role === "TALENT" ? now : null,
    updatedAt: now,
  };
  const userWrite = existing
    ? await admin.from("User").update(userRow).eq("id", internalUserId)
    : await admin.from("User").insert(userRow);
  if (userWrite.error) throw userWrite.error;

  if (fixture.role === "TALENT") {
    const { data: profile, error } = await admin.from("Profile").select("id").eq("userId", internalUserId).maybeSingle();
    if (error) throw error;
    const row = {
      userId: internalUserId,
      firstName: fixture.firstName,
      lastName: fixture.lastName,
      phone: fixture.phone,
      country: "CM",
      headline: fixture.headline,
      targetRoles: ["Product Manager", "Business Analyst"],
      preferredSectors: ["Technology", "Services"],
      targetCities: ["Yaoundé", "Douala"],
      contractPreferences: ["CDI", "CDD", "Stage"],
      remotePreference: "INDIFFERENT",
      publicDiscoverable: false,
    };
    const write = profile
      ? await admin.from("Profile").update(row).eq("id", profile.id)
      : await admin.from("Profile").insert({ id: randomUUID(), ...row });
    if (write.error) throw write.error;
  }

  if (fixture.role === "RECRUITER") {
    const { data: profile, error } = await admin.from("RecruiterProfile").select("id").eq("userId", authUserId).maybeSingle();
    if (error) throw error;
    const row = {
      userId: authUserId,
      companyName: fixture.companyName,
      sector: "Technology",
      website: "https://jobly-e2e.test",
      location: "Yaoundé, Cameroon",
      verified: false,
      updatedAt: now,
    };
    const write = profile
      ? await admin.from("RecruiterProfile").update(row).eq("id", profile.id)
      : await admin.from("RecruiterProfile").insert({ id: randomUUID(), ...row });
    if (write.error) throw write.error;
  }

  if (fixture.role === "PARTNER") {
    const { data: partner, error } = await admin.from("Partner").select("id").eq("userId", internalUserId).maybeSingle();
    if (error) throw error;
    const row = {
      userId: internalUserId,
      referralCode: "E2E-" + internalUserId.replaceAll("-", "").slice(0, 12).toUpperCase(),
      partnerType: "BRAND_AMBASSADOR",
      kycStatus: "PENDING",
      locationText: "Yaoundé, Cameroon",
      locationConsent: false,
    };
    const write = partner
      ? await admin.from("Partner").update(row).eq("id", partner.id)
      : await admin.from("Partner").insert({ id: randomUUID(), ...row });
    if (write.error) throw write.error;
  }

  // Verify the distinct Auth UID/internal User.id mapping and the role-specific profile.
  const { data: verifiedUser, error: verifiedUserError } = await admin
    .from("User").select("id,authUserId,email,role")
    .eq("id", internalUserId).single();
  if (verifiedUserError) throw verifiedUserError;
  if (verifiedUser.authUserId !== authUserId || verifiedUser.email?.toLowerCase() !== fixture.email || verifiedUser.role !== fixture.role) {
    throw new Error("Vérification de l'identité métier échouée pour " + fixture.key);
  }
  const profileTable = fixture.role === "TALENT" ? "Profile" : fixture.role === "RECRUITER" ? "RecruiterProfile" : "Partner";
  const profileOwnerId = fixture.role === "RECRUITER" ? authUserId : internalUserId;
  const { data: verifiedProfile, error: verifiedProfileError } = await admin
    .from(profileTable).select("id,userId").eq("userId", profileOwnerId).maybeSingle();
  if (verifiedProfileError) throw verifiedProfileError;
  if (!verifiedProfile) throw new Error("Profil " + profileTable + " non persisté pour " + fixture.key);

  return internalUserId;
}


async function restoreRuntimeOnly() {
  const existing = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  if (existing.environment !== "JOBLY-E2E" || existing.projectRef !== PROJECT_REF || !Array.isArray(existing.accounts)) {
    throw new Error("Fixtures existantes absentes ou non JOBLY-E2E : restauration sans rotation refusée.");
  }

  for (const fixture of FIXTURES) {
    const account = existing.accounts.find((item) => item.key === fixture.key && item.role === fixture.role);
    if (!account?.email || !account?.password || !account?.authUserId || !account?.userId) {
      throw new Error("Fixture locale incomplète pour " + fixture.role + " : aucune modification effectuée.");
    }
  }

  let serviceRoleKey = await keyFromExistingE2EEnvFile();
  if (!serviceRoleKey) {
    serviceRoleKey = await readHiddenSecret(
      "Clé service_role / secret de JOBLY-E2E (restauration runtime uniquement, saisie masquée) : "
    );
  }
  assertKeyBelongsToE2E(serviceRoleKey);

  const admin = createClient(PROJECT_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: listed, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw new Error("Vérification Auth Admin JOBLY-E2E impossible : " + authError.message);

  for (const fixture of FIXTURES) {
    const account = existing.accounts.find((item) => item.key === fixture.key && item.role === fixture.role);
    const authUser = listed.users.find((user) => user.id === account.authUserId);
    if (!authUser ||
      authUser.email?.toLowerCase() !== account.email.toLowerCase() ||
      authUser.app_metadata?.e2e_fixture !== true ||
      authUser.app_metadata?.e2e_role !== fixture.role) {
      throw new Error("Identité Auth fixture non confirmée pour " + fixture.role + " ; aucun compte n'a été modifié.");
    }

    const { data: appUser, error: userError } = await admin
      .from("User")
      .select("id,authUserId,email,role")
      .eq("id", account.userId)
      .maybeSingle();
    if (userError) throw new Error("Vérification public.User impossible : " + userError.message);
    if (!appUser ||
      appUser.authUserId !== account.authUserId ||
      appUser.email?.toLowerCase() !== account.email.toLowerCase() ||
      appUser.role !== fixture.role) {
      throw new Error("Liaison Auth/User fixture non confirmée pour " + fixture.role + " ; aucun compte n'a été modifié.");
    }
  }

  await writeFile(RUNTIME_PATH, JSON.stringify({
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    serviceRoleKey,
    createdAt: new Date().toISOString(),
  }) + "\n", { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") await chmod(RUNTIME_PATH, 0o600);

  console.log(JSON.stringify({
    status: "PASS",
    gate: "JOBLY-E2E-FIXTURE-RUNTIME-RESTORE",
    environment: "JOBLY-E2E",
    accounts: FIXTURES.map((fixture) => ({ key: fixture.key, role: fixture.role })),
    accountPasswordsChanged: false,
    accountsRecreated: false,
    externalActions: false,
    privateKeyStoredLocallyOnlyForCurrentRun: true,
  }, null, 2));
}

async function main() {
  if (process.env.E2E_PROJECT_REF !== PROJECT_REF || process.env.NEXT_PUBLIC_SUPABASE_URL !== PROJECT_URL) {
    throw new Error("Refus de provisionner : la configuration doit cibler exclusivement JOBLY-E2E.");
  }
  if (process.argv.includes("--runtime-only")) {
    await restoreRuntimeOnly();
    return;
  }
  // Never delete local fixture/runtime files before validating the E2E key.
  // The full provisioner is creation-only: existing remote identities must be
  // recovered through --runtime-only or an explicitly authorized reset path.
  let serviceRoleKey = await keyFromExistingE2EEnvFile();
  if (!serviceRoleKey) {
    serviceRoleKey = await readHiddenSecret(
      "Colle la clé service_role / secret de JOBLY-E2E (saisie masquée, jamais enregistrée dans le rapport) : "
    );
  }
  assertKeyBelongsToE2E(serviceRoleKey);

  const admin = createClient(PROJECT_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: listedUsers, error: authCheckError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authCheckError) throw new Error("La clé n'est pas autorisée sur JOBLY-E2E : " + authCheckError.message);

  const existingFixtureIdentities = FIXTURES.flatMap((fixture) => {
    const user = listedUsers.users.find((candidate) =>
      candidate.email && candidate.email.toLowerCase() === fixture.email.toLowerCase()
    );
    if (!user) return [];
    if (user.app_metadata?.e2e_fixture !== true || user.app_metadata?.e2e_role !== fixture.role) {
      throw new Error("E2E_FIXTURE_EMAIL_COLLISION: adresse de fixture occupée par une identité non-fixture ; aucun compte n'a été modifié.");
    }
    return [{ role: fixture.role, authUserId: user.id }];
  });
  if (existingFixtureIdentities.length > 0) {
    throw new Error(
      "E2E_EXISTING_FIXTURE_PRESERVED: " + existingFixtureIdentities.length +
      " identité(s) fixture existent déjà dans JOBLY-E2E. Aucun mot de passe, compte ou profil n'a été modifié. " +
      "Le provisionnement complet est interdit dans ce cas ; utilisez --runtime-only avec les fixtures locales intactes " +
      "ou une procédure de récupération explicitement autorisée."
    );
  }

  await writeFile(RUNTIME_PATH, JSON.stringify({
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    serviceRoleKey,
    createdAt: new Date().toISOString(),
  }) + "\n", { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") await chmod(RUNTIME_PATH, 0o600);

  const accounts = [];
  for (const fixture of FIXTURES) {
    const password = makePassword();
    const authUserId = await getOrCreateAuthUser(admin, fixture, password);
    const userId = await upsertApplicationIdentity(admin, fixture, authUserId);
    accounts.push({
      key: fixture.key,
      role: fixture.role,
      email: fixture.email,
      username: fixture.username,
      password,
      authUserId,
      userId,
    });
  }

  const report = {
    schemaVersion: 2,
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    accounts,
    safeguards: {
      onlySyntheticFixtureEmails: true,
      adminIdentityModified: false,
      productionAccess: false,
      emailSent: false,
      smsSent: false,
      paymentSent: false,
    },
  };
  await writeFile(FIXTURE_PATH, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") await chmod(FIXTURE_PATH, 0o600);

  console.log(JSON.stringify({
    status: "PASS",
    gate: "JOBLY-E2E-FIXTURE-PROVISION",
    environment: "JOBLY-E2E",
    accounts: accounts.map((account) => ({ key: account.key, role: account.role, username: account.username })),
    credentialsStoredLocally: true,
    privateKeyStoredLocallyOnlyForCurrentRun: true,
    externalActions: false,
  }, null, 2));
}

main().catch((error) => {
  console.error("[FIXTURE-PROVISION] " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
