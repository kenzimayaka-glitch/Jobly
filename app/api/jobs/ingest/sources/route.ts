import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, getAuthUser } from "@/lib/server-auth";
import { collectPublicJobSources, recollectOfferByUrl } from "@/lib/jobSourceCollector";
import { cleanJobDescription, cleanJobTitle } from "@/lib/jobContent";
import { getNormalizedExperienceYears, normalizeJobContent } from "@/lib/jobNormalizer";
import { assessJobQuality } from "@/lib/jobQuality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorized(request: NextRequest): Promise<boolean> {
  const configured = process.env.CRON_SECRET || process.env.JOB_SOURCE_INGEST_SECRET;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (configured && header === configured) return true;
  return Boolean(await getAuthUser(request));
}

function normalizeCompany(value: string | null): string | null {
  const clean = (value || "").replace(/\s+/g, " ").trim();
  return clean.length >= 2 ? clean.slice(0, 180) : null;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function platformExpiresAt(createdAt: string, now = new Date()): Date {
  const created = new Date(createdAt);
  return Number.isFinite(created.getTime()) ? addMonths(created, 2) : addMonths(now, 2);
}

function isPlatformExpired(createdAt: string, now = new Date()): boolean {
  return platformExpiresAt(createdAt, now).getTime() <= now.getTime();
}

const INGEST_CONCURRENCY = 4;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<{ failed: number }> {
  let cursor = 0;
  let failed = 0;
  async function runWorker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        await worker(items[index]);
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
  return { failed };
}

function canonicalDescriptionCandidate(parts: unknown, fallback: string): string {\n  return Array.isArray(parts) && parts.length ? parts.map((v) => String(v)).join("\\n\\n") : fallback;\n}\n\nexport async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "collect";
    const batchSize = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 40);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0) || 0, 0);
    const supabase = adminClient();
    const now = new Date();
    
    if (mode === "reprocess" || mode === "reprocess-all") {
      let rowsQuery = supabase.from("Job")
        .select("id,title,sourceKey,sourceUrl,createdAt,isActive,description")
        .not("sourceUrl", "is", null)
        .not("sourceKey", "is", null);

      // "reprocess-all" must really mean all eligible source-backed offers.
      // The targeted "reprocess" mode keeps the corruption/legacy filter.
      if (mode !== "reprocess-all") {
        rowsQuery = rowsQuery.or(
          "sourceKey.eq.infosconcourseducation,description.like.%�%,description.like.%Ã%,description.like.%Â%,description.like.%\\u0019%,description.like.%\\u0013%,title.like.%�%,title.like.%Ã%,title.like.%Â%",
        );
      }

      const { data: rows, error } = await rowsQuery
        .order("createdAt", { ascending: true })
        .range(offset, offset + batchSize - 1);
      if (error) throw new Error(error.message);

      let processed = 0, updated = 0, skipped = 0, deactivated = 0;
      await runWithConcurrency(rows || [], 3, async (row) => {
        if (!row.sourceUrl || !row.sourceKey) { skipped++; return; }
        const parsed = new URL(row.sourceUrl);
        if (/\/(?:category|tag|author|page)(?:\/|$)/i.test(parsed.pathname)) {
          const result = await supabase.from("Job").update({ isActive: false, updatedAt: now.toISOString(), lastSeenAt: now.toISOString() }).eq("id", row.id);
          if (result.error) throw new Error(result.error.message);
          deactivated++; processed++; return;
        }
        if (isPlatformExpired(row.createdAt, now)) {
          const result = await supabase.from("Job").update({ isActive: false, updatedAt: now.toISOString(), lastSeenAt: now.toISOString() }).eq("id", row.id);
          if (result.error) throw new Error(result.error.message);
          deactivated++; processed++; return;
        }
        const offer = await recollectOfferByUrl(row.sourceKey, row.sourceUrl, row.title);
        if (!offer) { skipped++; return; }
        const cleanedTitle = cleanJobTitle(offer.title);
        const cleanedDescription = cleanJobDescription(offer.description, cleanedTitle);
        const normalizedContent = normalizeJobContent({ title: cleanedTitle, description: offer.description, location: offer.location, contractType: offer.contractType, salaryMin: offer.salaryMin, salaryMax: offer.salaryMax, salaryCurrency: offer.salaryCurrency, deadline: offer.deadline, source: row.sourceKey, sourceUrl: offer.sourceUrl });
        const normalizedExperienceYears = getNormalizedExperienceYears(normalizedContent);
        const quality = assessJobQuality({ title: cleanedTitle, description: canonicalDescriptionCandidate(normalizedContent.description, cleanedDescription) });
        const canonicalDescription = normalizedContent.description.join("\n\n") || cleanedDescription;
        const cleanedContentHash = crypto.createHash("sha256")
          .update([cleanedTitle, canonicalDescription, offer.location || "", offer.contractType || "", offer.sourceUrl || ""].join("\n"))
          .digest("hex");
        const contact = offer.applicationProfile;
        const applicationReady = Boolean(contact.applicationEmail || contact.applicationPhone || contact.applicationUrl || contact.applyUrl || contact.url);
        const result = await supabase.from("Job").update({
          title: cleanedTitle,
          description: canonicalDescription,
          location: offer.location,
          contractType: offer.contractType,
          normalizedContent,
          normalizedVersion: normalizedContent.version,
          normalizedAt: now.toISOString(),
          minExperienceYears: normalizedExperienceYears,
          aiSkills: normalizedContent.skills,
          sourcePublishedAt: offer.publishedAt,
          deadline: offer.deadline,
          contentHash: cleanedContentHash,
          lastSeenAt: now.toISOString(),
          // Reprocessing may never reactivate a quarantined offer.\n          // Only a successful quality gate can move qualityStatus back to ok.\n          qualityStatus: quality.status,\n          isActive: row.isActive === true && !isPlatformExpired(row.createdAt, now),
          applicationReady,
          applicationProfile: contact,
          applicationCheckedAt: now.toISOString(),
          updatedAt: now.toISOString(),
          aiProcessed: false,
          aiProcessedAt: null,
        }).eq("id", row.id);
        if (result.error) throw new Error(result.error.message);
        processed++; updated++;
      });

      return NextResponse.json({
        ok: true,
        mode,
        processed,
        updated,
        skipped,
        deactivated,
        offset,
        limit: batchSize,
        hasMore: (rows || []).length === batchSize,
        nextOffset: offset + (rows || []).length,
        message: mode === "reprocess-all" && (rows || []).length < batchSize ? "Réindexation complète terminée." : undefined,
        ranAt: now.toISOString()
      });
    }

    const { offers, sources } = await collectPublicJobSources();
    const nowIso = now.toISOString();
    let created = 0, updated = 0;

    const ingestResult = await runWithConcurrency(offers, INGEST_CONCURRENCY, async (offer) => {
      const cleanedTitle = cleanJobTitle(offer.title);
      const cleanedDescription = cleanJobDescription(offer.description, cleanedTitle);
      const source = offer.sourceKey === "minajobs" ? "MinaJobs" : offer.sourceKey === "jobinfocamer" ? "JobInfoCamer" : "Infos Concours Education";
      const normalizedContent = normalizeJobContent({ title: cleanedTitle, companyName: offer.company, description: offer.description, location: offer.location, contractType: offer.contractType, remoteMode: offer.remoteMode, salaryMin: offer.salaryMin, salaryMax: offer.salaryMax, salaryCurrency: offer.salaryCurrency, deadline: offer.deadline, source, sourceUrl: offer.sourceUrl });
      const normalizedExperienceYears = getNormalizedExperienceYears(normalizedContent);
      const canonicalDescription = normalizedContent.description.join("\n\n") || cleanedDescription;
      const cleanedContentHash = crypto.createHash("sha256")
        .update([cleanedTitle, canonicalDescription, offer.location || "", offer.contractType || "", offer.sourceUrl || ""].join("\n"))
        .digest("hex");
      const companyName = normalizeCompany(offer.company);
      let companyId: string | null = null;

      if (companyName) {
        const existingCompany = await supabase.from("Company").select("id").ilike("name", companyName).limit(1).maybeSingle();
        if (existingCompany.error) throw new Error(existingCompany.error.message);
        companyId = existingCompany.data?.id || null;
        if (!companyId) {
          const createdCompany = await supabase.from("Company").insert({
            name: companyName,
            verified: false,
            description: null,
            website: offer.companyWebsite,
            logoUrl: offer.logoUrl,
          }).select("id").single();
          if (createdCompany.error) throw new Error(createdCompany.error.message);
          companyId = createdCompany.data.id;
        }
      }



      const existingByIdentity = await supabase.from("Job")
        .select("id,contentHash,createdAt,isActive,qualityStatus,aiProcessed,aiProcessedAt")
        .eq("sourceKey", offer.sourceKey)
        .eq("externalId", offer.externalId)
        .maybeSingle();
      if (existingByIdentity.error) throw new Error(existingByIdentity.error.message);

      // Historical imports used a different sourceKey for JobInfoCamer. The
      // database also enforces (source, sourceUrl) uniqueness, so sourceUrl
      // must be treated as a second idempotency key when externalId/sourceKey
      // changed between collector versions.
      let existing = existingByIdentity;
      if (!existing.data?.id && offer.sourceUrl) {
        const existingBySourceUrl = await supabase.from("Job")
          .select("id,contentHash,createdAt,aiProcessed,aiProcessedAt")
          .eq("source", source)
          .eq("sourceUrl", offer.sourceUrl)
          .maybeSingle();
        if (existingBySourceUrl.error) throw new Error(existingBySourceUrl.error.message);
        existing = existingBySourceUrl;
      }

      const contact = offer.applicationProfile;
      const applicationReady = Boolean(contact.applicationEmail || contact.applicationPhone || contact.applicationUrl || contact.applyUrl || contact.url);
      const payload = {
        title: cleanedTitle,
        description: cleanedDescription,
        language: "fr",
        location: offer.location,
        contractType: offer.contractType,
        source,
        sourceUrl: offer.sourceUrl,
        sourceKey: offer.sourceKey,
        externalId: offer.externalId,
        contentHash: cleanedContentHash,
        sourcePublishedAt: offer.publishedAt,
        lastSeenAt: nowIso,
        // Existing rows keep their publication state. New rows start quarantined\n        // until the quality gate has validated the extracted content.\n        isActive: existing.data ? Boolean(existing.data.isActive) : false,\n        qualityStatus: quality.status,
        deadline: offer.deadline,
        applicationReady,
        applicationProfile: contact,
        applicationCheckedAt: nowIso,
        companyId,
        normalizedContent,
        normalizedVersion: normalizedContent.version,
        normalizedAt: nowIso,
        minExperienceYears: normalizedExperienceYears,
        aiSkills: normalizedContent.skills,
        updatedAt: nowIso
      };

      if (companyId && (offer.logoUrl || offer.companyWebsite)) {
        const companyPatch: Record<string, unknown> = {};
        if (offer.logoUrl) companyPatch.logoUrl = offer.logoUrl;
        if (offer.companyWebsite) companyPatch.website = offer.companyWebsite;
        const companyUpdate = await supabase.from("Company").update(companyPatch).eq("id", companyId);
        if (companyUpdate.error) throw new Error(companyUpdate.error.message);
      }

      if (existing.data?.id) {
        const contentChanged = existing.data.contentHash !== cleanedContentHash;
        if (!contentChanged && !companyId) {
          const touch = await supabase.from("Job").update({
            lastSeenAt: nowIso,
            // Preserve publication state; ingestion is not allowed to reactivate a row.\n          qualityStatus: quality.status,
            applicationReady,
            applicationProfile: contact,
            applicationCheckedAt: nowIso,
            updatedAt: nowIso
          }).eq("id", existing.data.id);
          if (touch.error) throw new Error(touch.error.message);
        } else {
          const update = await supabase.from("Job").update({
            ...payload,
            ...(contentChanged ? { aiProcessed: false, aiProcessedAt: null } : {}),
          }).eq("id", existing.data.id);
          if (update.error) throw new Error(update.error.message);
        }
        updated++;
      } else {
        const id = crypto.randomUUID();
        const insert = await supabase.from("Job").insert({
          id,
          createdAt: nowIso,
          ...payload,
        });
        if (insert.error) throw new Error(insert.error.message);
        created++;
      }
    });

    return NextResponse.json({
      ok: true,
      mode: "free-public-sources",
      sources,
      discovered: offers.length,
      created,
      updated,
      skipped: ingestResult.failed,
      ranAt: now,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Import impossible." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
