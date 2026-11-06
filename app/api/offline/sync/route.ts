import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OfflineOperation = {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
};

function strings(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim().slice(0, 120));
}

async function claimReceipt(db: ReturnType<typeof adminClient>, userId: string, operationId: string) {
  const { data: existing, error: readError } = await db.from("OfflineSyncReceipt")
    .select("status").eq("userId", userId).eq("operationId", operationId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing?.status === "APPLIED") return false;
  if (!existing) {
    const { error } = await db.from("OfflineSyncReceipt").insert({
      id: newId(), userId, operationId, status: "PROCESSING",
    });
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  return true;
}

async function applyOperation(db: ReturnType<typeof adminClient>, userId: string, authUserId: string, operation: OfflineOperation) {
  const payload = operation.payload || {};
  if (operation.type === "profile.update") {
    const update: Record<string, unknown> = {};
    if (typeof payload.headline === "string") update.headline = payload.headline.trim().slice(0, 180) || null;
    if (typeof payload.summary === "string") update.summary = payload.summary.trim().slice(0, 6000) || null;
    if (typeof payload.location === "string") update.location = payload.location.trim().slice(0, 180) || null;
    if (Array.isArray(payload.targetRoles)) update.targetRoles = strings(payload.targetRoles);
    if (Array.isArray(payload.preferredSectors)) update.preferredSectors = strings(payload.preferredSectors);
    if (Array.isArray(payload.targetCities)) update.targetCities = strings(payload.targetCities);
    if (Array.isArray(payload.contractPreferences)) update.contractPreferences = strings(payload.contractPreferences);
    if (typeof payload.remotePreference === "string" && ["YES", "NO", "INDIFFERENT"].includes(payload.remotePreference)) {
      update.remotePreference = payload.remotePreference;
    }
    if (!Object.keys(update).length) throw new Error("Aucun champ de profil modifiable.");
    const { data: current, error: lookupError } = await db.from("Profile").select("id").eq("userId", userId).maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    const { error } = await db.from("Profile").upsert({
      id: current?.id || newId(),
      userId,
      ...update,
    }, { onConflict: "userId" });
    if (error) throw new Error(error.message);
    return;
  }

  if (operation.type === "application.prepare") {
    const jobId = typeof payload.jobId === "string" ? payload.jobId : "";
    const recruiterJobId = typeof payload.recruiterJobId === "string" ? payload.recruiterJobId : "";
    if (Boolean(jobId) === Boolean(recruiterJobId)) throw new Error("Une seule offre doit être sélectionnée.");
    const language = payload.language === "en" ? "en" : "fr";
    if (jobId) {
      const { data: job, error: jobError } = await db.from("Job").select("id,isActive,applicationReady").eq("id", jobId).maybeSingle();
      if (jobError) throw new Error(jobError.message);
      if (!job || !job.isActive || !job.applicationReady) throw new Error("Cette offre n'est plus disponible pour préparer une candidature.");
      const { error } = await db.from("Application").upsert({
        id: newId(), userId, jobId, recruiterJobId: null, status: "PREPARED", language,
      }, { onConflict: "userId,jobId", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      return;
    }
    const { data: job, error: jobError } = await db.from("RecruiterJob").select("id,status,applicationReady").eq("id", recruiterJobId).maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job || job.status !== "published" || !job.applicationReady) throw new Error("Cette offre recruteur n'est plus disponible pour préparer une candidature.");
    const { error } = await db.from("Application").upsert({
      id: newId(), userId, jobId: null, recruiterJobId, status: "PREPARED", language,
    }, { onConflict: "userId,recruiterJobId", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return;
  }

  if (operation.type === "recruiter.job-draft") {
    const { data: recruiter, error: recruiterError } = await db.from("RecruiterProfile")
      .select("companyName").eq("userId", authUserId).maybeSingle();
    if (recruiterError) throw new Error(recruiterError.message);
    if (!recruiter) throw new Error("Cette action est réservée à un compte recruteur.");
    const title = typeof payload.title === "string" ? payload.title.trim().slice(0, 180) : "";
    const description = typeof payload.description === "string" ? payload.description.trim().slice(0, 12000) : "";
    if (!title || !description) throw new Error("Le titre et la description de l'offre sont obligatoires.");
    const { error } = await db.from("RecruiterJob").insert({
      id: newId(),
      recruiterUserId: authUserId,
      title,
      companyName: recruiter.companyName || "Mon entreprise",
      description,
      location: typeof payload.location === "string" ? payload.location.trim().slice(0, 180) || null : null,
      contract: typeof payload.contract === "string" ? payload.contract.slice(0, 50) : "CDI",
      salary: typeof payload.salary === "string" ? payload.salary.trim().slice(0, 100) || null : null,
      sector: typeof payload.sector === "string" ? payload.sector.trim().slice(0, 100) || null : null,
      tags: strings(payload.tags, 15),
      status: "draft",
    });
    if (error) throw new Error(error.message);
    return;
  }

  throw new Error("Type d'opération hors connexion non autorisé.");
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise ou appareil révoqué." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const operations = Array.isArray(body.operations) ? body.operations as OfflineOperation[] : [];
    if (!operations.length || operations.length > 100) {
      return NextResponse.json({ message: "La synchronisation accepte de 1 à 100 opérations." }, { status: 400 });
    }
    if (JSON.stringify(operations).length > 1_000_000) {
      return NextResponse.json({ message: "Lot de synchronisation trop volumineux." }, { status: 413 });
    }
    const db = adminClient();
    const user = await ensureUser(db, authUser);
    if (typeof body.userId !== "string" || body.userId !== user.id) {
      return NextResponse.json({ message: "Ces opérations hors connexion appartiennent à un autre compte Jobly." }, { status: 403 });
    }
    const applied: string[] = [];
    const failed: { id: string; message: string }[] = [];

    for (const raw of operations) {
      const operation = raw && typeof raw === "object" ? raw : null;
      const id = typeof operation?.id === "string" ? operation.id : "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        failed.push({ id: id || "unknown", message: "Identifiant d'opération invalide." });
        continue;
      }
      try {
        const shouldApply = await claimReceipt(db, user.id, id);
        if (shouldApply) await applyOperation(db, user.id, authUser.id, operation);
        const { error: receiptError } = await db.from("OfflineSyncReceipt")
          .update({ status: "APPLIED", appliedAt: new Date().toISOString() })
          .eq("userId", user.id).eq("operationId", id);
        if (receiptError) throw new Error(receiptError.message);
        applied.push(id);
      } catch (error) {
        await db.from("OfflineSyncReceipt")
          .update({ status: "ERROR" })
          .eq("userId", user.id).eq("operationId", id);
        failed.push({ id, message: error instanceof Error ? error.message : "Synchronisation impossible." });
      }
    }
    return NextResponse.json({ applied, failed, pendingCount: failed.length }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Synchronisation hors connexion impossible." }, { status: 500 });
  }
}
