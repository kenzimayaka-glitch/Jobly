import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { access, readFile, rename, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const PROJECT_URL = "https://" + PROJECT_REF + ".supabase.co";
const FIXTURE_KEY = "talent-multidevice";
const PURPOSE = "MULTI_DEVICE_REVOCATION";
const FIXTURE = {
  key: FIXTURE_KEY,
  purpose: PURPOSE,
  role: "TALENT",
  email: "jobly-e2e-multidevice-talent@jobly.test",
  username: "jobly_e2e_multidevice_talent",
  phone: "+237600000199",
  firstName: "Amina",
  lastName: "E2E MultiDevice",
  displayName: "Amina E2E MultiDevice",
  headline: "Profil isolé pour le contrôle multi-appareils Jobly",
};
const ROOT = process.cwd();
const SOURCE_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : "";
const REPORT_PATH = path.join(ROOT, "artifacts", "e2e", "multidevice-talent-fixture-provision.json");

function safeError(error) {
  if (error && typeof error === "object" && typeof error.code === "string") return error.code.slice(0, 80);
  if (error instanceof Error) return error.name + ": " + error.message.slice(0, 180);
  return "UNKNOWN_ERROR";
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function loadSourceEnvironment(sourceRoot) {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const key of keys) delete process.env[key];

  const require = createRequire(import.meta.url);
  const nextPackagePath = require.resolve("next/package.json");
  const nextRequire = createRequire(nextPackagePath);
  const { loadEnvConfig } = nextRequire("@next/env");
  const loaded = loadEnvConfig(sourceRoot, false, { info() {}, error() {} }, true);
  const dotenv = createRequire(nextRequire.resolve("@next/env"))("dotenv");
  const values = {};
  for (const file of loaded.loadedEnvFiles || []) {
    const parsed = file.env && Object.keys(file.env).length
      ? file.env
      : dotenv.parse(file.contents || "");
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim() && !Object.hasOwn(values, key)) values[key] = value;
    }
  }
  const overridePath = path.join(sourceRoot, ".env.e2e.local");
  if (await exists(overridePath)) {
    const parsed = dotenv.parse(await readFile(overridePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) values[key] = value;
    }
  }
  return { ...process.env, ...values };
}

function verifyServerKey(key) {
  assert.ok(
    key.startsWith("sb_secret_") || key.startsWith("eyJ"),
    "Clé serveur JOBLY-E2E absente ou de type inattendu.",
  );
  if (key.startsWith("eyJ")) {
    let claims;
    try { claims = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString("utf8")); }
    catch { throw new Error("Clé JWT illisible ; aucun appel Admin Auth lancé."); }
    assert.equal(claims.ref, PROJECT_REF, "La clé serveur ne correspond pas au projet JOBLY-E2E.");
    assert.equal(claims.role, "service_role", "La clé JWT ne possède pas le rôle serveur attendu.");
  }
}

async function one(admin, table, column, value, select) {
  const { data, error } = await admin.from(table).select(select).eq(column, value).maybeSingle();
  if (error) throw new Error("LOOKUP_FAILED_" + table + "_" + column);
  return data;
}

async function activeDeviceCount(admin, internalUserId) {
  const { data, error } = await admin
    .from("UserDeviceSession")
    .select("id,revokedAt")
    .eq("userId", internalUserId);
  if (error || !Array.isArray(data)) throw new Error("DEVICE_PREFLIGHT_UNAVAILABLE");
  return data.filter((row) => !row.revokedAt).length;
}

async function writeManifest(filePath, document) {
  const temporary = filePath + ".tmp-" + process.pid + "-" + randomUUID();
  try {
    await writeFile(temporary, JSON.stringify(document, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, filePath);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function main() {
  assert.ok(SOURCE_ROOT, "Indiquer le dépôt source qui contient .env.local et .e2e-fixtures.json.");
  assert.notEqual(
    path.resolve(SOURCE_ROOT),
    ROOT,
    "Exécuter depuis le worktree e2e/recette, avec le dépôt source séparé.",
  );

  const manifestPath = path.join(SOURCE_ROOT, ".e2e-fixtures.json");
  assert.ok(await exists(manifestPath), "Le manifeste local .e2e-fixtures.json est absent.");
  const fixtures = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(fixtures.environment, "JOBLY-E2E", "Manifeste non JOBLY-E2E refusé.");
  assert.equal(fixtures.projectRef, PROJECT_REF, "ProjectRef du manifeste incorrect.");
  assert.ok(Array.isArray(fixtures.accounts), "Le tableau accounts du manifeste est absent.");
  for (const [key, role] of [["talent", "TALENT"], ["recruiter", "RECRUITER"], ["partner", "PARTNER"]]) {
    assert.ok(fixtures.accounts.some((item) => item?.key === key && item?.role === role),
      "La fixture partagée " + key + " doit rester présente et inchangée.");
  }

  const env = await loadSourceEnvironment(SOURCE_ROOT);
  const configuredUrls = [env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL].filter((value) => typeof value === "string" && value.trim());
  assert.ok(configuredUrls.every((value) => value === PROJECT_URL),
    "Une URL Supabase locale contredit JOBLY-E2E ; arrêt avant toute mutation.");
  const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
  verifyServerKey(secret);

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(PROJECT_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError || !Array.isArray(listed?.users)) throw new Error("AUTH_ADMIN_LIST_USERS_FAILED");
  const authUser = listed.users.find((item) => item.email?.toLowerCase() === FIXTURE.email);
  if (authUser && (
    authUser.app_metadata?.e2e_fixture !== true ||
    authUser.app_metadata?.e2e_role !== "TALENT" ||
    authUser.app_metadata?.e2e_purpose !== PURPOSE
  )) {
    throw new Error("RESERVED_AUTH_EMAIL_OWNED_BY_NON_MATCHING_FIXTURE");
  }

  const byAuthId = authUser
    ? await one(admin, "User", "authUserId", authUser.id, "id,authUserId,email,phone,role,username")
    : null;
  const byEmail = await one(admin, "User", "email", FIXTURE.email, "id,authUserId,email,phone,role,username");
  const byUsername = await one(admin, "User", "username", FIXTURE.username, "id,authUserId,email,phone,role,username");
  const publicMatches = [byAuthId, byEmail, byUsername].filter(Boolean);
  const matchingIds = new Set(publicMatches.map((item) => item.id));
  if (matchingIds.size > 1) throw new Error("PUBLIC_FIXTURE_IDENTITY_CONFLICT");
  const existingUser = publicMatches[0] || null;

  if (existingUser && (
    existingUser.email?.toLowerCase() !== FIXTURE.email ||
    existingUser.username !== FIXTURE.username ||
    existingUser.role !== "TALENT" ||
    (authUser && existingUser.authUserId && existingUser.authUserId !== authUser.id) ||
    (!authUser && existingUser.authUserId)
  )) {
    throw new Error("PUBLIC_FIXTURE_ROW_OWNED_BY_DIFFERENT_IDENTITY");
  }
  if (authUser && existingUser?.authUserId && existingUser.authUserId !== authUser.id) {
    throw new Error("AUTH_PUBLIC_IDENTITY_LINK_CONFLICT");
  }

  const phoneOwner = await one(admin, "User", "phone", FIXTURE.phone, "id,authUserId,email,role");
  if (phoneOwner && phoneOwner.id !== existingUser?.id) throw new Error("RESERVED_FIXTURE_PHONE_ALREADY_USED");

  const internalUserId = existingUser?.id || randomUUID();
  const activeBefore = existingUser ? await activeDeviceCount(admin, internalUserId) : 0;
  if (activeBefore > 1) {
    throw new Error("DEDICATED_FIXTURE_ALREADY_HAS_MORE_THAN_ONE_ACTIVE_DEVICE; NO_PASSWORD_OR_SESSION_CHANGE");
  }

  const password = "JlyE2E!" + randomBytes(36).toString("base64url") + "aA9";
  let authUserId = authUser?.id || "";
  let createdAuthUser = false;
  let createdPublicUser = false;
  let manifestWritten = false;

  try {
    if (authUser) {
      const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        app_metadata: {
          ...authUser.app_metadata,
          e2e_fixture: true,
          e2e_role: "TALENT",
          e2e_purpose: PURPOSE,
        },
        user_metadata: {
          ...authUser.user_metadata,
          first_name: FIXTURE.firstName,
          last_name: FIXTURE.lastName,
          full_name: FIXTURE.displayName,
          e2e_fixture: true,
          e2e_purpose: PURPOSE,
        },
      });
      if (error || !data?.user?.id) throw new Error("AUTH_FIXTURE_PASSWORD_REFRESH_FAILED");
      authUserId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: FIXTURE.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: FIXTURE.firstName,
          last_name: FIXTURE.lastName,
          full_name: FIXTURE.displayName,
          e2e_fixture: true,
          e2e_purpose: PURPOSE,
        },
      });
      if (error || !data?.user?.id) throw new Error("AUTH_FIXTURE_CREATE_FAILED");
      authUserId = data.user.id;
      createdAuthUser = true;

      const { data: tagged, error: tagError } = await admin.auth.admin.updateUserById(authUserId, {
        app_metadata: { e2e_fixture: true, e2e_role: "TALENT", e2e_purpose: PURPOSE },
      });
      if (tagError || !tagged?.user?.id) throw new Error("AUTH_FIXTURE_TAG_FAILED");
    }

    const now = new Date().toISOString();
    const userRow = {
      authUserId,
      email: FIXTURE.email,
      phone: FIXTURE.phone,
      role: "TALENT",
      displayName: FIXTURE.displayName,
      username: FIXTURE.username,
      firstName: FIXTURE.firstName,
      lastName: FIXTURE.lastName,
      country: "CM",
      privacyAcceptedAt: now,
      updatedAt: now,
    };
    if (existingUser) {
      const { error } = await admin.from("User").update(userRow).eq("id", internalUserId).eq("authUserId", authUserId);
      if (error) throw new Error("PUBLIC_FIXTURE_UPDATE_FAILED");
    } else {
      const { error } = await admin.from("User").insert({ id: internalUserId, ...userRow });
      if (error) throw new Error("PUBLIC_FIXTURE_INSERT_FAILED");
      createdPublicUser = true;
    }

    const existingProfile = await one(admin, "Profile", "userId", internalUserId, "id,userId");
    const profileRow = {
      userId: internalUserId,
      firstName: FIXTURE.firstName,
      lastName: FIXTURE.lastName,
      phone: FIXTURE.phone,
      country: "CM",
      headline: FIXTURE.headline,
      targetRoles: ["Product Manager", "Business Analyst"],
      preferredSectors: ["Technology", "Services"],
      targetCities: ["Yaoundé", "Douala"],
      contractPreferences: ["CDI", "CDD", "Stage"],
      remotePreference: "INDIFFERENT",
      publicDiscoverable: false,
    };
    if (existingProfile) {
      const { error } = await admin.from("Profile").update(profileRow).eq("id", existingProfile.id);
      if (error) throw new Error("PUBLIC_FIXTURE_PROFILE_UPDATE_FAILED");
    } else {
      const { error } = await admin.from("Profile").insert({ id: randomUUID(), ...profileRow });
      if (error) throw new Error("PUBLIC_FIXTURE_PROFILE_INSERT_FAILED");
    }

    const verifiedUser = await one(admin, "User", "authUserId", authUserId, "id,authUserId,email,role,username");
    const verifiedProfile = await one(admin, "Profile", "userId", internalUserId, "id,userId");
    if (!verifiedUser || verifiedUser.id !== internalUserId || verifiedUser.role !== "TALENT" ||
        verifiedUser.email?.toLowerCase() !== FIXTURE.email || !verifiedProfile) {
      throw new Error("FIXTURE_POST_WRITE_VERIFICATION_FAILED");
    }
    const activeAfterProvision = await activeDeviceCount(admin, internalUserId);
    if (activeAfterProvision > 1) throw new Error("FIXTURE_DEVICE_BASELINE_UNSAFE");

    const account = {
      key: FIXTURE_KEY,
      purpose: PURPOSE,
      role: "TALENT",
      email: FIXTURE.email,
      username: FIXTURE.username,
      password,
      authUserId,
      userId: internalUserId,
    };
    const previous = fixtures.accounts.findIndex((item) => item?.key === FIXTURE_KEY);
    if (previous >= 0) {
      const existingEntry = fixtures.accounts[previous];
      if (existingEntry.role !== "TALENT" || existingEntry.purpose !== PURPOSE) {
        throw new Error("LOCAL_FIXTURE_KEY_OWNED_BY_DIFFERENT_ACCOUNT");
      }
      fixtures.accounts[previous] = account;
    } else {
      fixtures.accounts.push(account);
    }

    await writeManifest(manifestPath, fixtures);
    manifestWritten = true;

    const report = {
      status: "PASS",
      createdAt: new Date().toISOString(),
      environment: "JOBLY-E2E",
      projectRef: PROJECT_REF,
      fixtureKey: FIXTURE_KEY,
      role: "TALENT",
      email: FIXTURE.email,
      authUserId,
      userId: internalUserId,
      authIdentityCreated: createdAuthUser,
      publicUserCreated: createdPublicUser,
      activeDevicesBeforeProvisioning: activeBefore,
      activeDevicesAfterProvisioning: activeAfterProvision,
      credentialsStoredInIgnoredLocalManifest: true,
      credentialsPrinted: false,
      existingSharedFixturesChanged: false,
      existingDeviceRowsModified: false,
      businessDataModified: false,
      productionTouched: false,
    };
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (!manifestWritten && createdPublicUser) {
      await admin.from("User").delete().eq("id", internalUserId).eq("authUserId", authUserId).then(() => undefined).catch(() => undefined);
    }
    if (!manifestWritten && createdAuthUser && authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
    }
    throw error;
  }
}

main().catch(async (error) => {
  const report = {
    status: "FAIL",
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: PROJECT_REF,
    fixtureKey: FIXTURE_KEY,
    error: safeError(error),
    credentialsPrinted: false,
    productionTouched: false,
  };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 }).catch(() => undefined);
  console.error("Provisioning fixture multi-appareils JOBLY-E2E : ECHEC — " + report.error);
  process.exitCode = 1;
});
