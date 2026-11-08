import { randomUUID } from "node:crypto";

const PDF_BYTES = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);
const PNG_BYTES = new Uint8Array([
  0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
  0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
  0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,0x89,
  0x00,0x00,0x00,0x0b,0x49,0x44,0x41,0x54,0x78,0x9c,
  0x63,0x60,0x00,0x02,0x00,0x00,0x05,0x00,0x01,0xa5,
  0xf6,0x45,0x40,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82,
]);

export const PRIVATE_STORAGE_SMOKE_TARGETS = Object.freeze([
  { bucket: "talent-cvs", extension: "pdf", mimeType: "application/pdf", bytes: PDF_BYTES },
  { bucket: "recruitment-listings", extension: "pdf", mimeType: "application/pdf", bytes: PDF_BYTES },
  { bucket: "mobility-documents", extension: "pdf", mimeType: "application/pdf", bytes: PDF_BYTES },
  { bucket: "jobly-events", extension: "png", mimeType: "image/png", bytes: PNG_BYTES },
  { bucket: "profile-photos-private", extension: "png", mimeType: "image/png", bytes: PNG_BYTES },
]);

function encodeObjectPath(value) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function safeStageError(stage) {
  return "Échec du contrôle " + stage + ". Aucun secret ni URL signée n'est inclus dans le rapport.";
}

export async function verifyPrivateStorageAccess({ admin, supabaseUrl, anonKey, fetchImpl = fetch }) {
  if (!admin?.storage?.from || typeof fetchImpl !== "function") {
    throw new Error("Storage access smoke requires an admin storage client and fetch implementation.");
  }
  if (typeof supabaseUrl !== "string" || new URL(supabaseUrl).hostname !== "ofqqrryamslxoqkklraw.supabase.co") {
    throw new Error("Storage access smoke is restricted to JOBLY-E2E.");
  }
  if (typeof anonKey !== "string" || !anonKey.trim()) {
    throw new Error("Storage access smoke requires the JOBLY-E2E public key.");
  }

  const results = [];
  const failures = [];

  for (const target of PRIVATE_STORAGE_SMOKE_TARGETS) {
    const objectPath = "lot00-smoke/" + randomUUID() + "." + target.extension;
    const bucket = admin.storage.from(target.bucket);
    const result = {
      bucket: target.bucket,
      upload: "NOT_RUN",
      signedRead: "NOT_RUN",
      anonymousPublicRead: "NOT_RUN",
      cleanup: "NOT_NEEDED",
      status: "RUNNING",
    };
    let uploaded = false;
    let stage = "upload";

    try {
      const upload = await bucket.upload(objectPath, target.bytes, {
        contentType: target.mimeType,
        upsert: false,
        cacheControl: "60",
      });
      if (upload.error) throw new Error(safeStageError(stage));
      uploaded = true;
      result.upload = "PASS";

      stage = "signed-read";
      const signed = await bucket.createSignedUrl(objectPath, 60);
      const signedUrl = signed.data?.signedUrl;
      if (signed.error || typeof signedUrl !== "string" || !signedUrl) {
        throw new Error(safeStageError(stage));
      }
      const signedResponse = await fetchImpl(signedUrl, { method: "GET", cache: "no-store" });
      if (!signedResponse.ok) throw new Error(safeStageError(stage));
      result.signedRead = "PASS";
      result.signedReadHttpStatus = signedResponse.status;

      stage = "anonymous-public-read";
      const publicUrl = new URL(
        "/storage/v1/object/public/" + target.bucket + "/" + encodeObjectPath(objectPath),
        supabaseUrl,
      );
      const anonymousResponse = await fetchImpl(publicUrl, {
        method: "GET",
        cache: "no-store",
        headers: { apikey: anonKey },
      });
      if (![400, 401, 403, 404].includes(anonymousResponse.status)) {
        throw new Error(safeStageError(stage));
      }
      result.anonymousPublicRead = "DENIED";
      result.anonymousPublicReadHttpStatus = anonymousResponse.status;
    } catch {
      result.status = "FAIL";
      result.failedStage = stage;
      failures.push(target.bucket);
    } finally {
      if (uploaded) {
        try {
          const removed = await bucket.remove([objectPath]);
          if (removed.error) throw new Error("cleanup");
          result.cleanup = "PASS";
        } catch {
          result.cleanup = "FAIL";
          result.status = "FAIL";
          result.failedStage = result.failedStage ?? "cleanup";
          if (!failures.includes(target.bucket)) failures.push(target.bucket);
        }
      }
    }
    if (result.status !== "FAIL") result.status = "PASS";
    results.push(result);
  }

  if (failures.length) {
    const error = new Error("Storage access smoke failed for: " + failures.join(", "));
    error.results = results;
    throw error;
  }
  return results;
}
