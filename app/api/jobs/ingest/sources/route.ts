import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, getAuthUser } from "@/lib/server-auth";
import { collectPublicJobSources, recollectOfferByUrl } from "@/lib/jobSourceCollector";
import {
  buildCanonicalOffer,
  canonicalIsPublishable,
  type CanonicalOffer,
  SOURCE_VERSION,
  RENDER_VERSION,
  EXTRACTION_VERSION,
  STRUCTURE_VERSION,
  VALIDATION_VERSION,
} from "@/lib/jobCanonicalOffer";

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

function sourceDisplayName(sourceKey: string): string {
  return sourceKey === "minajobs"
    ? "MinaJobs"
    : sourceKey === "jobinfocamer"
      ? "JobInfoCamer"
      : sourceKey === "infosconcourseducation"
        ? "Infos Concours Education"
        : sourceKey === "fne"
          ? "FNE Cameroun"
          : sourceKey === "un_cameroon"
            ? "UN Cameroon"
            : sourceKey;
}

async function saveOfferPipeline(
  supabase: ReturnType<typeof adminClient>,
  jobId: string,
  offer: any,
  canonical: CanonicalOffer,
  extractedDescription: string,
): Promise<void> {
  const result = await supabase.from("JobOfferPipeline").upsert({
    jobId,
    sourceKey: offer.sourceKey,
    sourceUrl: offer.sourceUrl,
    captureMode: offer.captureMode || "unknown",
    rawPayload: {
      sourceKey: offer.sourceKey,
      externalId: offer.externalId,
      sourceUrl: offer.sourceUrl,
      title: offer.title,
      company: offer.company,
      location: offer.location,
      contractType: offer.contractType,
      remoteMode: offer.remoteMode,
      deadline: offer.deadline,
      publishedAt: offer.publishedAt,
      applicationProfile: offer.applicationProfile,
      logoUrl: offer.logoUrl,
      companyWebsite: offer.companyWebsite,
      salaryMin: offer.salaryMin,
      salaryMax: offer.salaryMax,
      salaryCurrency: offer.salaryCurrency,
    },
    // rawHtml and renderedHtml are intentionally persisted in separate columns.
    rawHtml: offer.rawHtml || null,
    renderedHtml: offer.renderedHtml || null,
    extractedText: extractedDescription,
    canonicalContent: canonical,
    qualityScore: canonical.quality.score,
    confidence: canonical.quality.confidence,
    status: canonical.quality.status,
    sourceVersion: SOURCE_VERSION,
    renderVersion: RENDER_VERSION,
    extractionVersion: EXTRACTION_VERSION,
    structureVersion: STRUCTURE_VERSION,
    validationVersion: VALIDATION_VERSION,
    canonicalVersion: canonical.version,
    lastError: canonical.quality.warnings.length ? canonical.quality.warnings.join(",") : null,
    processedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { onConflict: "jobId" });
  if (result.error) throw new Error(result.error.message);
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

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "collect";
    const batchSize = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 40);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0) || 0, 0);
    const supabase = adminClient();
    const now = new Date();
    
    if (mode === "reindex") {
      const { data: rows, error } = await supabase.from("Job")
        .select("id,title,description,sourceKey,sourceUrl,createdAt,normalizedAt,normalizedVersion,lastSeenAt")
        .not("sourceUrl", "is", null)
        .not("sourceKey", "is", null)
        .eq("isActive", true)
        .order("normalizedAt", { ascending: true, nullsFirst: true })
        .range(offset, offset + batchSize - 1);
      if (error) throw new Error(error.message);

      let processed = 0, updated = 0, skipped = 0;
      await runWithConcurrency(rows || [], 3, async (row) => {
        if (!row.sourceUrl || !row.sourceKey) { skipped++; return; }
        const offer = await recollectOfferByUrl(row.sourceKey, row.sourceUrl, row.title);
        if (!offer) { skipped++; return; }

        const prepared = buildCanonicalOffer({
          title: offer.title,
          companyName: offer.company,
          description: offer.description,
          location: offer.location,
          contractType: offer.contractType,
          remoteMode: offer.remoteMode,
          salaryMin: offer.salaryMin,
          salaryMax: offer.salaryMax,
          salaryCurrency: offer.salaryCurrency,
          deadline: offer.deadline,
          source: sourceDisplayName(offer.sourceKey),
          sourceUrl: offer.sourceUrl,
        });
        const normalizedContent = prepared.canonical;
        const normalizedExperienceYears = prepared.experienceYears;
        const canonicalDescription = normalizedContent.description.join("\n\n") || prepared.extractedDescription;
        await saveOfferPipeline(supabase, row.id, offer, normalizedContent, prepared.extractedDescription);
        if (!canonicalIsPublishable(normalizedContent)) {
          skipped++;
          return;
        }

        // Never let a transient renderer/extraction failure destroy a healthy
        // offer. Legacy rows are intentionally eligible for repair, while a
        // normalized healthy row is protected against a dramatic content drop.
        const existingDescription = String(row.description || "").trim();
        const legacyOrThinRow =
          !row.normalizedVersion ||
          existingDescription.length < Math.max(180, String(row.title || "").trim().length * 2);
        const candidateTooThin =
          canonicalDescription.length < 180 ||
          canonicalDescription.length < existingDescription.length * 0.55;
        if (!legacyOrThinRow && candidateTooThin) {
          skipped++;
          return;
        }

        const contentHash = crypto.createHash("sha256")
          .update([normalizedContent.title || offer.title, canonicalDescription, offer.location || "", offer.contractType || "", offer.sourceUrl || ""].join("\n"))
          .digest("hex");
        const contact = offer.applicationProfile;
        const applicationReady = Boolean(contact.applicationEmail || contact.applicationPhone || contact.applicationUrl || contact.applyUrl || contact.url);

        const result = await supabase.from("Job").update({
          title: normalizedContent.title || offer.title,
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
          contentHash,
          lastSeenAt: now.toISOString(),
          applicationReady,
          applicationProfile: contact,
          applicationCheckedAt: now.toISOString(),
          updatedAt: now.toISOString(),
          aiProcessed: false,
          aiProcessedAt: null,
        }).eq("id", row.id);
        if (result.error) throw new Error(result.error.message);
        processed++;
        updated++;
      });

      return NextResponse.json({
        ok: true,
        mode,
        processed,
        updated,
        skipped,
        offset,
        limit: batchSize,
        hasMore: (rows || []).length === batchSize,
        nextOffset: offset + (rows || []).length,
        ranAt: now.toISOString(),
      });
    }

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
        const prepared = buildCanonicalOffer({
          title: offer.title,
          companyName: offer.company,
          description: offer.description,
          location: offer.location,
          contractType: offer.contractType,
          remoteMode: offer.remoteMode,
          salaryMin: offer.salaryMin,
          salaryMax: offer.salaryMax,
          salaryCurrency: offer.salaryCurrency,
          deadline: offer.deadline,
          source: sourceDisplayName(row.sourceKey),
          sourceUrl: offer.sourceUrl,
        });
        const normalizedContent = prepared.canonical;
        const normalizedExperienceYears = prepared.experienceYears;
        const canonicalDescription = normalizedContent.description.join("\n\n") || prepared.extractedDescription;
        await saveOfferPipeline(supabase, row.id, offer, normalizedContent, prepared.extractedDescription);
        if (!canonicalIsPublishable(normalizedContent)) {
          skipped++;
          return;
        }
        const cleanedContentHash = crypto.createHash("sha256")
          .update([normalizedContent.title || offer.title, canonicalDescription, offer.location || "", offer.contractType || "", offer.sourceUrl || ""].join("\n"))
          .digest("hex");
        const contact = offer.applicationProfile;
        const applicationReady = Boolean(contact.applicationEmail || contact.applicationPhone || contact.applicationUrl || contact.applyUrl || contact.url);
        const result = await supabase.from("Job").update({
          title: normalizedContent.title || offer.title,
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
          isActive: !isPlatformExpired(row.createdAt, now),
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
    let created = 0, updated = 0, skipped = 0;

    const ingestResult = await runWithConcurrency(offers, INGEST_CONCURRENCY, async (offer) => {
      const source = sourceDisplayName(offer.sourceKey);
      const prepared = buildCanonicalOffer({
        title: offer.title,
        companyName: offer.company,
        description: offer.description,
        location: offer.location,
        contractType: offer.contractType,
        remoteMode: offer.remoteMode,
        salaryMin: offer.salaryMin,
        salaryMax: offer.salaryMax,
        salaryCurrency: offer.salaryCurrency,
        deadline: offer.deadline,
        source,
        sourceUrl: offer.sourceUrl,
      });
      const normalizedContent = prepared.canonical;
      const normalizedExperienceYears = prepared.experienceYears;
      const canonicalDescription = normalizedContent.description.join("\n\n") || prepared.extractedDescription;
      const cleanedContentHash = crypto.createHash("sha256")
        .update([normalizedContent.title || offer.title, canonicalDescription, offer.location || "", offer.contractType || "", offer.sourceUrl || ""].join("\n"))
        .digest("hex");
      const companyName = normalizeCompany(normalizedContent.company || offer.company);
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
        .select("id,contentHash,createdAt,aiProcessed,aiProcessedAt")
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
        title: normalizedContent.title || offer.title,
        description: canonicalDescription,
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
        isActive: existing.data ? !isPlatformExpired(existing.data.createdAt, now) : true,
        deadline: offer.deadline,
        applicationReady,
        applicationProfile: contact,
        applicationCheckedAt: nowIso,
        companyId,
        normalizedContent,
        normalizedVersion: normalizedContent.version,
        normalizedAt: nowIso,
        aiQualityScore: normalizedContent.quality.score,
        aiFlags: normalizedContent.quality.warnings,
        aiProcessed: false,
        aiProcessedAt: null,
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
        await saveOfferPipeline(supabase, existing.data.id, offer, normalizedContent, prepared.extractedDescription);
        if (!canonicalIsPublishable(normalizedContent)) {
          skipped++;
          return;
        }
        const contentChanged = existing.data.contentHash !== cleanedContentHash;
        if (!contentChanged && !companyId) {
          const touch = await supabase.from("Job").update({
            lastSeenAt: nowIso,
            isActive: !isPlatformExpired(existing.data.createdAt, now),
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
          isActive: canonicalIsPublishable(normalizedContent),
        });
        if (insert.error) throw new Error(insert.error.message);
        await saveOfferPipeline(supabase, id, offer, normalizedContent, prepared.extractedDescription);
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
