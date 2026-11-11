import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
import { JOBLY_EVENTS_BUCKET, eventStoragePathFromPublicUrl } from "@/lib/eventStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;

async function listAll(db: ReturnType<typeof adminClient>) {
  const paths = new Set<string>();
  const expiredPaths: Array<{ id: string; path: string }> = [];
  const now = Date.now();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("Event")
      .select("id,status,createdAt,mediaStoragePath,mediaUrl")
      .range(offset, offset + 999);
    if (error) throw new Error("Lecture des médias liés aux événements impossible : " + error.message);
    for (const row of data ?? []) {
      if (typeof row.mediaStoragePath === "string") {
        const ageMs = row.createdAt ? now - Date.parse(row.createdAt) : 0;
        const staleDraft = row.status === "DRAFT" && ageMs > MAX_AGE_MS;
        const stalePayment = row.status === "PENDING_PAYMENT" && ageMs > 7 * 24 * 60 * 60 * 1000;
        if (staleDraft || stalePayment) expiredPaths.push({ id: row.id, path: row.mediaStoragePath });
        else paths.add(row.mediaStoragePath);
      }
      const legacyPath = eventStoragePathFromPublicUrl(row.mediaUrl);
      const ageMs = row.createdAt ? now - Date.parse(row.createdAt) : 0;
      const pendingPaymentStillValid = row.status === "PENDING_PAYMENT" && ageMs <= 7 * 24 * 60 * 60 * 1000;
      const draftStillValid = row.status === "DRAFT" && ageMs <= MAX_AGE_MS;
      if (legacyPath && (row.status === "PUBLISHED" || pendingPaymentStillValid || draftStillValid)) paths.add(legacyPath);
    }
    if (!data || data.length < 1000) break;
  }
  return { paths, expiredPaths };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = adminClient();
  try {
    const bucket = db.storage.from(JOBLY_EVENTS_BUCKET);
    const { data: config, error: configError } = await db.storage.getBucket(JOBLY_EVENTS_BUCKET);
    if (configError || !config || config.public) {
      return NextResponse.json({ message: "Le bucket événementiel doit rester privé." }, { status: 503 });
    }

    const { paths: referenced, expiredPaths } = await listAll(db);
    const expiredStoragePaths = new Set<string>();
    for (const expired of expiredPaths) {
      const { error: unlinkError } = await db.from("Event").update({
        mediaStoragePath: null,
        mediaType: null,
        mediaSizeBytes: null,
        mediaDurationSeconds: null,
        updatedAt: new Date().toISOString(),
      }).eq("id", expired.id).eq("mediaStoragePath", expired.path);
      if (unlinkError) throw new Error("Désassociation d'un média expiré impossible : " + unlinkError.message);
      expiredStoragePaths.add(expired.path);
    }
    const removed: string[] = [];
    if (expiredStoragePaths.size) {
      const { error: expiredRemoveError } = await bucket.remove([...expiredStoragePaths]);
      if (expiredRemoveError) throw new Error("Suppression des médias d'événements expirés impossible : " + expiredRemoveError.message);
      removed.push(...expiredStoragePaths);
    }
    const cutoff = Date.now() - MAX_AGE_MS;
    const retained: string[] = [];
    let scanned = 0;

    for (let rootOffset = 0; ; rootOffset += PAGE_SIZE) {
      const { data: folders, error: foldersError } = await bucket.list("", { limit: PAGE_SIZE, offset: rootOffset });
      if (foldersError) throw new Error(foldersError.message);
      for (const folder of folders ?? []) {
        if (folder.id !== null) continue;
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const { data: files, error } = await bucket.list(folder.name, {
            limit: PAGE_SIZE,
            offset,
            sortBy: { column: "created_at", order: "asc" },
          });
          if (error) throw new Error("Lecture Storage impossible : " + error.message);
          for (const file of files ?? []) {
            if (file.id === null) continue;
            scanned += 1;
            const path = folder.name + "/" + file.name;
            if (referenced.has(path)) continue;
            const createdAt = file.created_at || file.updated_at || null;
            const createdAtMs = createdAt ? Date.parse(createdAt) : NaN;
            if (!Number.isFinite(createdAtMs) || createdAtMs > cutoff) {
              retained.push(path);
              continue;
            }
            const { error: removeError } = await bucket.remove([path]);
            if (removeError) throw new Error("Nettoyage impossible pour " + path + " : " + removeError.message);
            removed.push(path);
          }
          if (!files || files.length < PAGE_SIZE) break;
        }
      }
      if (!folders || folders.length < PAGE_SIZE) break;
    }

    return NextResponse.json({
      ok: true,
      bucket: JOBLY_EVENTS_BUCKET,
      maxAgeHours: 24,
      scanned,
      removedCount: removed.length,
      expiredEventLinksCleared: expiredStoragePaths.size,
      retainedCount: retained.length,
      removed,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Nettoyage des médias événementiels impossible.",
    }, { status: 503 });
  }
}
