import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_REF = "ofqqrryamslxoqkklraw";
const APPLY_FLAG = "--apply-lot00-e2e-storage-hardening";
const REPORT_PATH = path.resolve("artifacts/e2e/lot00-storage-bucket-hardening.json");
const LOG_PATH = path.resolve("feedback-lot00-storage-20261108.txt");

const desired = [
  {
    id: "talent-cvs",
    options: {
      public: false,
      fileSizeLimit: 3 * 1024 * 1024,
      allowedMimeTypes: ["application/pdf"],
    },
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
      allowedMimeTypes: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ],
    },
    reason: "Bucket mobilité privé réservé aux documents PDF et images courants ; aucune route active d'upload n'a été trouvée dans l'inventaire actuel.",
  },
];

function normalizeBucket(bucket) {
  return {
    public: Boolean(bucket.public),
    fileSizeLimit: bucket.fileSizeLimit ?? bucket.file_size_limit ?? null,
    allowedMimeTypes: bucket.allowedMimeTypes ?? bucket.allowed_mime_types ?? null,
  };
}

function sameArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function matches(actual, expected) {
  return actual.public === expected.public &&
    actual.fileSizeLimit === expected.fileSizeLimit &&
    sameArray(actual.allowedMimeTypes, expected.allowedMimeTypes);
}

async function writeReport(report) {
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
  await writeFile(LOG_PATH, JSON.stringify({ ...report, credentials: "not included" }, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify({ ...report, credentials: "not included" }, null, 2) + "\n");
}

async function main() {
  loadEnvConfig(process.cwd());

  const projectRef = process.env.E2E_PROJECT_REF || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const secretKey = process.env.SUPABASE_E2E_SECRET_KEY || "";
  const key = secretKey || legacyKey;

  assert.equal(projectRef, EXPECTED_REF, "E2E_PROJECT_REF doit cibler JOBLY-E2E.");
  assert.equal(new URL(url).hostname, EXPECTED_REF + ".supabase.co", "Refus de tout projet Supabase hors JOBLY-E2E.");
  assert.ok(key, "Clé privée JOBLY-E2E absente du fichier local.");

  if (key.startsWith("eyJ")) {
    const parts = key.split(".");
    assert.equal(parts.length, 3, "JWT de service_role invalide.");
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    assert.equal(claims.ref, EXPECTED_REF, "La clé JWT ne correspond pas au projet JOBLY-E2E.");
    assert.equal(claims.role, "service_role", "Le JWT fourni n'est pas service_role.");
  } else {
    assert.ok(
      secretKey.startsWith("sb_secret_"),
      "Une clé sb_secret_ doit être fournie explicitement via SUPABASE_E2E_SECRET_KEY.",
    );
  }

  const report = {
    createdAt: new Date().toISOString(),
    environment: "JOBLY-E2E",
    projectRef: EXPECTED_REF,
    status: "RUNNING",
    buckets: [],
    rollback: [],
    credentials: "not included",
  };

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const snapshots = [];

  try {
    for (const item of desired) {
      const current = await admin.storage.getBucket(item.id);
      if (current.error || !current.data) {
        throw new Error("Bucket introuvable ou non lisible : " + item.id + " — " + (current.error?.message || "sans détail"));
      }
      const previous = normalizeBucket(current.data);
      snapshots.push({ id: item.id, previous, updated: false });
      report.buckets.push({
        id: item.id,
        reason: item.reason,
        before: previous,
        target: item.options,
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
      const update = await admin.storage.updateBucket(item.id, item.options);
      if (update.error) throw new Error("Échec Storage updateBucket " + item.id + " : " + update.error.message);

      snapshot.updated = true;
      const verified = await admin.storage.getBucket(item.id);
      if (verified.error || !verified.data) {
        throw new Error("Impossible de relire le bucket après modification : " + item.id);
      }
      const actual = normalizeBucket(verified.data);
      if (!matches(actual, item.options)) {
        throw new Error("Configuration Storage non conforme après updateBucket : " + item.id);
      }
      report.buckets[index].after = actual;
      report.buckets[index].status = "PASS";
    }

    report.status = "PASS";
  } catch (error) {
    report.status = "FAIL";
    report.error = error instanceof Error ? error.message : String(error);
    for (const snapshot of snapshots.filter((item) => item.updated).reverse()) {
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
