import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { verifyPrivateStorageAccess } from "./lot00-storage-access-smoke.mjs";

const EXPECTED_REF = "ofqqrryamslxoqkklraw";
const APPLY_FLAG = "--apply-lot00-e2e-storage-hardening";
const REPORT_PATH = path.resolve("artifacts/e2e/lot00-storage-bucket-hardening.json");
const LOG_PATH = path.resolve("feedback-lot00-storage-20261108.txt");

function parseEnvValue(raw) {
  const value = raw.trim();
  if (!value) return "";
  const quote = value[0];
  if (quote === "'" || quote === '"' || quote === "\`") {
    const end = value.lastIndexOf(quote);
    if (end > 0) {
      const inner = value.slice(1, end);
      return quote === '"'
        ? inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
        : inner;
    }
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function loadLocalEnvFiles() {
  const values = new Map();
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      values.set(match[1], parseEnvValue(match[2]));
    }
  }
  for (const [name, value] of values) {
    if (typeof process.env[name] === "undefined" || !String(process.env[name] ?? "").trim()) process.env[name] = value;
  }
}

const imageMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const eventMimes = [...imageMimes, "application/pdf", "video/mp4"];

const desired = [
  {
    id: "talent-cvs",
    options: { public: false, fileSizeLimit: 3 * 1024 * 1024, allowedMimeTypes: ["application/pdf"] },
    reason: "CV originaux : PDF uniquement, maximum 3 MiB, téléchargements signés.",
  },
  {
    id: "recruitment-listings",
    options: {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/html",
        "text/html; charset=utf-8",
        "image/jpeg",
      ],
    },
    reason: "Exports officiels PDF, XLSX, HTML et JPEG ; bucket privé et lien signé.",
  },
  {
    id: "mobility-documents",
    options: {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    },
    reason: "Documents mobilité privés, maximum 10 MiB.",
  },
  {
    id: "jobly-events",
    options: {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: eventMimes,
    },
    reason: "Staging et médias événementiels privés ; l'API délivre un lien signé uniquement après publication.",
  },
  {
    id: "profile-photos-private",
    createIfMissing: true,
    options: {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: imageMimes,
    },
    reason: "Stockage privé par défaut des photos Talent sans consentement public.",
  },
];

function normalizeBucket(bucket) {
  return {
    public: Boolean(bucket.public),
    fileSizeLimit: bucket.fileSizeLimit ?? bucket.file_size_limit ?? null,
    allowedMimeTypes: bucket.allowedMimeTypes ?? bucket.allowed_mime_types ?? null,
  };
}

function canonicalMimeTypes(value) {
  if (!Array.isArray(value)) return value;
  // Supabase strips MIME parameters (for example "; charset=utf-8")
  // and deduplicates allowed MIME types before persisting bucket config.
  return [...new Set(value.map((mime) =>
    String(mime).split(";", 1)[0].trim().toLowerCase()
  ))].sort();
}

function sameArray(a, b) {
  const left = canonicalMimeTypes(a);
  const right = canonicalMimeTypes(b);
  if (!Array.isArray(left) || !Array.isArray(right)) return left === right;
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function matches(actual, expected) {
  return actual.public === expected.public &&
    actual.fileSizeLimit === expected.fileSizeLimit &&
    sameArray(actual.allowedMimeTypes, expected.allowedMimeTypes);
}

function profilePathFromPublicUrl(value) {
  if (typeof value !== "string") return null;
  const marker = "/storage/v1/object/public/profile-photos/";
  const index = value.indexOf(marker);
  if (index < 0) return null;
  const raw = value.slice(index + marker.length).split("?")[0];
  if (!raw || raw.includes("..")) return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

async function writeReport(report) {
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  const safe = { ...report, credentials: "not included" };
  await writeFile(REPORT_PATH, JSON.stringify(safe, null, 2) + "\n", "utf8");
  await writeFile(LOG_PATH, JSON.stringify(safe, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify(safe, null, 2) + "\n");
}

async function migrateLegacyPhotos(admin, report) {
  const migrated = [];
  const skippedPublicWithConsent = [];
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const { data: rows, error } = await admin.from("User")
      .select("id,profilePhotoUrl,profilePhotoStoragePath,profilePhotoVisibility,profilePhotoConsentAt")
      .not("profilePhotoUrl", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Lecture des anciennes photos impossible : " + error.message);
    if (!rows?.length) break;

    for (const user of rows) {
      const path = profilePathFromPublicUrl(user.profilePhotoUrl);
      if (!path) {
        throw new Error("Photo existante non migrable automatiquement pour le compte " + user.id + " : URL Storage inconnue.");
      }
      if (user.profilePhotoVisibility === "PUBLIC" && user.profilePhotoConsentAt) {
        skippedPublicWithConsent.push(user.id);
        continue;
      }

      const { data: source, error: downloadError } = await admin.storage.from("profile-photos").download(path);
      if (downloadError || !source) {
        throw new Error("Téléchargement de la photo legacy impossible pour le compte " + user.id + ".");
      }
      const bytes = new Uint8Array(await source.arrayBuffer());
      const contentType = source.type || "image/jpeg";
      const destination = admin.storage.from("profile-photos-private");
      const { error: uploadError } = await destination.upload(path, bytes, {
        contentType, upsert: true, cacheControl: "3600",
      });
      if (uploadError) throw new Error("Copie privée impossible pour le compte " + user.id + " : " + uploadError.message);

      let heroCopied = false;
      const heroPath = path + ".hero.png";
      const { data: hero } = await admin.storage.from("profile-photos").download(heroPath);
      if (hero) {
        const { error: heroError } = await destination.upload(heroPath, new Uint8Array(await hero.arrayBuffer()), {
          contentType: "image/png", upsert: true, cacheControl: "3600",
        });
        if (heroError) throw new Error("Copie du visuel Hero impossible pour le compte " + user.id + " : " + heroError.message);
        heroCopied = true;
      }

      const { error: updateError } = await admin.from("User").update({
        profilePhotoUrl: null,
        profilePhotoStoragePath: path,
        profilePhotoVisibility: "PRIVATE",
        profilePhotoConsentAt: null,
        updatedAt: new Date().toISOString(),
      }).eq("id", user.id);
      if (updateError) throw new Error("Mise à jour de confidentialité impossible pour le compte " + user.id + " : " + updateError.message);

      const removePaths = heroCopied ? [path, heroPath] : [path];
      const { error: removeError } = await admin.storage.from("profile-photos").remove(removePaths);
      if (removeError) throw new Error("Suppression de l'ancienne photo publique impossible pour le compte " + user.id + " : " + removeError.message);
      migrated.push({ userId: user.id, photo: "PRIVATE", heroCopied });
    }
    if (rows.length < pageSize) break;
  }
  report.legacyPhotos = { migrated, retainedPublicWithConsent: skippedPublicWithConsent };
}

async function cleanupLegacyPublicPhotos(admin, report) {
  const retainedPaths = new Set();
  for (let offset = 0; ; offset += 500) {
    const { data: users, error } = await admin.from("User")
      .select("profilePhotoUrl,profilePhotoVisibility,profilePhotoConsentAt")
      .not("profilePhotoUrl", "is", null)
      .range(offset, offset + 499);
    if (error) throw new Error("Lecture des consentements photo impossible : " + error.message);
    for (const user of users ?? []) {
      if (user.profilePhotoVisibility === "PUBLIC" && user.profilePhotoConsentAt) {
        const photoPath = profilePathFromPublicUrl(user.profilePhotoUrl);
        if (photoPath) {
          retainedPaths.add(photoPath);
          retainedPaths.add(photoPath + ".hero.png");
        }
      }
    }
    if (!users || users.length < 500) break;
  }

  const bucket = admin.storage.from("profile-photos");
  const removed = [];
  const retained = [];
  for (let rootOffset = 0; ; rootOffset += 500) {
    const { data: folders, error: folderError } = await bucket.list("", { limit: 500, offset: rootOffset });
    if (folderError) throw new Error("Lecture du bucket public de photos impossible : " + folderError.message);
    for (const folder of folders ?? []) {
      if (folder.id !== null) continue;
      for (let offset = 0; ; offset += 500) {
        const { data: files, error } = await bucket.list(folder.name, { limit: 500, offset });
        if (error) throw new Error("Lecture des anciennes photos publiques impossible : " + error.message);
        const toRemove = [];
        for (const file of files ?? []) {
          if (file.id === null) continue;
          const objectPath = folder.name + "/" + file.name;
          if (retainedPaths.has(objectPath)) {
            retained.push(objectPath);
            continue;
          }
          toRemove.push(objectPath);
        }
        if (toRemove.length) {
          const { error: removeError } = await bucket.remove(toRemove);
          if (removeError) throw new Error("Suppression d'une photo publique sans consentement impossible : " + removeError.message);
          removed.push(...toRemove);
        }
        if (!files || files.length < 500) break;
      }
    }
    if (!folders || folders.length < 500) break;
  }
  report.publicPhotoCleanup = { removed, retainedWithConsent: retained };
}

async function main() {
  loadLocalEnvFiles();
  const projectRef = process.env.E2E_PROJECT_REF || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secretKey = process.env.SUPABASE_E2E_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || "";
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  const key = secretKey || legacyKey;
  // Public key is already provisioned for JOBLY-E2E and is safe for anonymous-denial checks.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || "sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y";

  assert.equal(projectRef, EXPECTED_REF, "E2E_PROJECT_REF doit cibler JOBLY-E2E.");
  assert.equal(new URL(url).hostname, EXPECTED_REF + ".supabase.co", "Refus de tout projet Supabase hors JOBLY-E2E.");
  assert.ok(key, "Clé privée JOBLY-E2E absente du fichier local.");
  assert.ok(anonKey, "Clé publique JOBLY-E2E indisponible pour vérifier le refus anonyme.");

  if (key.startsWith("eyJ")) {
    const parts = key.split(".");
    assert.equal(parts.length, 3, "JWT de service_role invalide.");
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    assert.equal(claims.ref, EXPECTED_REF, "La clé JWT ne correspond pas au projet JOBLY-E2E.");
    assert.equal(claims.role, "service_role", "Le JWT fourni n'est pas service_role.");
  } else {
    assert.ok(key.startsWith("sb_secret_"), "Une clé privée sb_secret_ ou un JWT service_role JOBLY-E2E est requis.");
  }

  const report = {
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: EXPECTED_REF,
    status: "RUNNING",
    buckets: [],
    createdBuckets: [],
    rollback: [],
    legacyPhotos: { migrated: [], retainedPublicWithConsent: [] },
    storageAccessSmoke: [],
    credentials: "not included",
  };
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const snapshots = [];

  try {
    for (const item of desired) {
      const current = await admin.storage.getBucket(item.id);
      const missing = current.error || !current.data;
      if (missing && !item.createIfMissing) {
        throw new Error("Bucket introuvable ou non lisible : " + item.id + " — " + (current.error?.message || "sans détail"));
      }
      if (missing && item.createIfMissing) {
        snapshots.push({ id: item.id, previous: null, updated: false, created: false, needsCreate: true });
        report.buckets.push({
          id: item.id,
          reason: item.reason,
          before: null,
          target: item.options,
          created: false,
          status: "CREATE_PENDING",
        });
        continue;
      }
      const previous = normalizeBucket(current.data);
      snapshots.push({ id: item.id, previous, updated: false, created: false, needsCreate: false });
      report.buckets.push({
        id: item.id,
        reason: item.reason,
        before: previous,
        target: item.options,
        created: false,
        status: "PENDING",
      });
    }

    if (!process.argv.includes(APPLY_FLAG)) {
      report.status = "BLOCKED";
      report.reason = "Mode plan seulement. Relancer avec " + APPLY_FLAG + " pour appliquer les réglages à JOBLY-E2E.";
      await writeReport(report);
      process.exitCode = 1;
      return;
    }

    for (let index = 0; index < desired.length; index += 1) {
      const item = desired[index];
      const snapshot = snapshots[index];
      if (snapshot.needsCreate) {
        const creation = await admin.storage.createBucket(item.id, item.options);
        if (creation.error && !/already exists/i.test(creation.error.message)) {
          throw new Error("Création du bucket " + item.id + " impossible : " + creation.error.message);
        }
        const fresh = await admin.storage.getBucket(item.id);
        if (fresh.error || !fresh.data) throw new Error("Le bucket privé n'a pas pu être créé : " + item.id);
        snapshot.created = !creation.error;
        if (snapshot.created) report.createdBuckets.push(item.id);
        report.buckets[index].created = snapshot.created;
      }
      const update = await admin.storage.updateBucket(item.id, item.options);
      if (update.error) throw new Error("Échec Storage updateBucket " + item.id + " : " + update.error.message);

      snapshot.updated = true;
      const verified = await admin.storage.getBucket(item.id);
      if (verified.error || !verified.data) throw new Error("Impossible de relire le bucket après modification : " + item.id);
      const actual = normalizeBucket(verified.data);
      // Preserve the exact API read-back in the report even when comparison fails.
      report.buckets[index].after = actual;
      if (!matches(actual, item.options)) {
        throw new Error(
          "Configuration Storage non conforme après updateBucket : " + item.id +
          " ; actual=" + JSON.stringify(actual) +
          " ; expected=" + JSON.stringify(item.options)
        );
      }
      report.buckets[index].status = "PASS";
    }

    report.storageAccessSmoke = await verifyPrivateStorageAccess({ admin, supabaseUrl: url, anonKey });
    await migrateLegacyPhotos(admin, report);
    await cleanupLegacyPublicPhotos(admin, report);
    report.status = "PASS";
  } catch (error) {
    report.status = "FAIL";
    if (error && Array.isArray(error.results)) report.storageAccessSmoke = error.results;
    report.error = error instanceof Error ? error.message : String(error);
    for (const snapshot of snapshots.filter((item) => item.updated && !item.created && item.id !== "jobly-events").reverse()) {
      try {
        const restored = await admin.storage.updateBucket(snapshot.id, {
          public: snapshot.previous.public,
          fileSizeLimit: snapshot.previous.fileSizeLimit,
          allowedMimeTypes: snapshot.previous.allowedMimeTypes,
        });
        report.rollback.push({
          id: snapshot.id,
          status: restored.error ? "FAIL" : "PASS",
          detail: restored.error ? restored.error.message : "Configuration précédente restaurée.",
        });
      } catch (rollbackError) {
        report.rollback.push({
          id: snapshot.id,
          status: "FAIL",
          detail: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        });
      }
    }
    const eventSnapshot = snapshots.find((item) => item.id === "jobly-events" && item.updated);
    if (eventSnapshot) report.rollback.push({
      id: "jobly-events",
      status: "RETAINED_PRIVATE_SAFETY",
      detail: "Le bucket événementiel reste privé même si une vérification ultérieure échoue.",
    });
    for (const snapshot of snapshots.filter((item) => item.created)) {
      report.rollback.push({
        id: snapshot.id,
        status: "RETAINED_PRIVATE",
        detail: "Bucket créé par la recette conservé privé ; aucune suppression automatique de données.",
      });
    }
  }

  await writeReport(report);
  if (report.status !== "PASS") process.exitCode = 1;
}

main().catch(async (error) => {
  const report = {
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: EXPECTED_REF,
    status: "BLOCKED",
    error: error instanceof Error ? error.message : String(error),
    credentials: "not included",
  };
  await writeReport(report);
  process.exitCode = 1;
});
