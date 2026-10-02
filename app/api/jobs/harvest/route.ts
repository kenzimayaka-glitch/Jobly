import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, getAuthUser } from "@/lib/server-auth";
import { collectPublicJobSources, recollectOfferByUrl } from "@/lib/jobSourceCollector";
import { detectJobLanguage, detectLanguageRequirements } from "@/lib/jobLanguage";
import { buildCanonicalOffer } from "@/lib/jobCanonicalOffer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROCESS_BATCH = 40;
const MAX_PROCESS_ATTEMPTS = 3;
const COLLECT_CONCURRENCY = 6;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isSourceExpired(publishedAt: string | null | undefined, now: Date): boolean {
  if (!publishedAt) return false;
  const published = new Date(publishedAt);
  return Number.isFinite(published.getTime()) && addMonths(published, 2).getTime() <= now.getTime();
}

function normalizeCompany(value: string | null | undefined): string | null {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length >= 2 ? clean.slice(0, 180) : null;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function authorized(request: NextRequest): Promise<boolean> {
  const configured = process.env.CRON_SECRET || process.env.JOB_SOURCE_INGEST_SECRET;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (configured && header === configured) return true;
  return Boolean(await getAuthUser(request));
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function runWorker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try { await worker(items[index]); } catch {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
}

async function collectStage(supabase: ReturnType<typeof adminClient>, sourceKey: string | undefined, now: Date) {
  const { offers, sources } = await collectPublicJobSources(sourceKey);
  let captured = 0, refreshed = 0, expired = 0, failed = 0;

  await mapWithConcurrency(offers, COLLECT_CONCURRENCY, async (offer) => {
    const publishedAt = parseDate(offer.publishedAt);
    const sourceExpired = isSourceExpired(publishedAt, now);
    const { data: existing, error: existingError } = await supabase
      .from("JobHarvestCapture")
      .select("id,contentHash,status,attempts")
      .eq("sourceKey", offer.sourceKey)
      .eq("sourceUrl", offer.sourceUrl)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const changed = existing?.contentHash !== offer.contentHash;
    const missingPublicationDate = !publishedAt;
    const status = sourceExpired
      ? "EXPIRED"
      : missingPublicationDate
        ? "QUARANTINED"
        : existing?.status === "PROCESSED" && !changed
          ? "PROCESSED"
          : "PENDING";

    const payload = {
      sourceKey: offer.sourceKey,
      externalId: offer.externalId,
      sourceUrl: offer.sourceUrl,
      title: offer.title,
      company: offer.company,
      location: offer.location,
      contractType: offer.contractType,
      remoteMode: offer.remoteMode,
      description: offer.description,
      deadline: parseDate(offer.deadline),
      publishedAt,
      applicationProfile: offer.applicationProfile,
      contentHash: offer.contentHash,
      rawHtml: offer.rawHtml,
      renderedHtml: offer.renderedHtml,
      extractedText: offer.extractedText,
      captureMode: offer.captureMode,
      payload: {
        logoUrl: offer.logoUrl,
        companyWebsite: offer.companyWebsite,
        salaryMin: offer.salaryMin,
        salaryMax: offer.salaryMax,
        salaryCurrency: offer.salaryCurrency,
      },
      status,
      attempts: status === "PENDING" ? 0 : (existing?.status === status ? undefined : 0),
      lastError: missingPublicationDate ? "MISSING_PUBLICATION_DATE" : null,
      processedAt: status === "PROCESSED" ? undefined : null,
      discoveredAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const query = existing?.id
      ? supabase.from("JobHarvestCapture").update(payload).eq("id", existing.id)
      : supabase.from("JobHarvestCapture").insert(payload);

    const result = await query;
    if (result.error) throw new Error(result.error.message);
    if (sourceExpired) expired++;
    else if (existing?.id) refreshed++;
    else captured++;
  });

  return { discovered: offers.length, captured, refreshed, expired, failed, sources };
}

async function processCapture(supabase: ReturnType<typeof adminClient>, row: any, now: Date) {
  if (Number(row.attempts || 0) >= MAX_PROCESS_ATTEMPTS) {
    await supabase.from("JobHarvestCapture").update({ status: "QUARANTINED", lastError: "MAX_PROCESS_ATTEMPTS", updatedAt: now.toISOString() }).eq("id", row.id);
    return "quarantined";
  }

  const claimed = await supabase
    .from("JobHarvestCapture")
    .update({ status: "PROCESSING", attempts: Number(row.attempts || 0) + 1, updatedAt: now.toISOString() })
    .eq("id", row.id)
    .in("status", ["PENDING", "FAILED"])
    .select("*")
    .maybeSingle();
  if (claimed.error) throw new Error(claimed.error.message);
  if (!claimed.data) return "claimed_elsewhere";

  try {
    let sourcePayload = claimed.data.payload || {};
    let capture = claimed.data;
    // Shadow discoveries provide a lightweight candidate capture. For sources
    // already supported by the native collector, recollect the detail page so
    // application channels, salary, logo and canonical HTML evidence can be
    // enriched before publication.
    if (!claimed.data.applicationProfile?.applicationEmail &&
        !claimed.data.applicationProfile?.applicationPhone &&
        !claimed.data.applicationProfile?.applicationUrl &&
        claimed.data.sourceKey &&
        claimed.data.sourceUrl) {
      const enriched = await recollectOfferByUrl(
        claimed.data.sourceKey,
        claimed.data.sourceUrl,
        claimed.data.title,
      );
      if (enriched) {
        capture = {
          ...claimed.data,
          company: enriched.company || claimed.data.company,
          location: enriched.location || claimed.data.location,
          contractType: enriched.contractType || claimed.data.contractType,
          remoteMode: enriched.remoteMode || claimed.data.remoteMode,
          description: enriched.description || claimed.data.description,
          deadline: enriched.deadline || claimed.data.deadline,
          publishedAt: enriched.publishedAt || claimed.data.publishedAt,
          applicationProfile: enriched.applicationProfile || claimed.data.applicationProfile,
          rawHtml: enriched.rawHtml,
          renderedHtml: enriched.renderedHtml,
          extractedText: enriched.extractedText,
          captureMode: enriched.captureMode,
        };
        sourcePayload = {
          ...sourcePayload,
          logoUrl: enriched.logoUrl,
          companyWebsite: enriched.companyWebsite,
          salaryMin: enriched.salaryMin,
          salaryMax: enriched.salaryMax,
          salaryCurrency: enriched.salaryCurrency,
        };
      }
    }

    if (!capture.publishedAt) {
      await supabase.from("JobHarvestCapture").update({
        status: "QUARANTINED",
        lastError: "MISSING_PUBLICATION_DATE",
        processedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }).eq("id", row.id);
      return "quarantined";
    }

    if (isSourceExpired(capture.publishedAt, now)) {
      await supabase.from("JobHarvestCapture").update({
        status: "EXPIRED",
        lastError: null,
        processedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }).eq("id", row.id);
      return "expired";
    }

    const prepared = buildCanonicalOffer({
      title: capture.title,
      companyName: capture.company,
      description: capture.description,
      location: capture.location,
      contractType: capture.contractType,
      remoteMode: capture.remoteMode,
      salaryMin: sourcePayload.salaryMin,
      salaryMax: sourcePayload.salaryMax,
      salaryCurrency: sourcePayload.salaryCurrency,
      deadline: capture.deadline,
      source: capture.sourceKey,
      sourceUrl: capture.sourceUrl,
    });
    const normalizedContent = prepared.canonical;
    const canonicalDescription = normalizedContent.description.join("\n\n") || prepared.extractedDescription;
    const normalizedExperienceYears = prepared.experienceYears ?? 0;

    // Volume-first mode: canonical normalization is retained for stable Job
    // fields, but no relevance/quality score is used to reject a harvested
    // offer. Only technical validity, exact identity and freshness gates apply.
    const source = capture.sourceKey;
    const contentHash = crypto.createHash("sha256")
      .update([normalizedContent.title || capture.title || "", canonicalDescription, capture.location || "", capture.contractType || "", capture.sourceUrl || ""].join("\n"))
      .digest("hex");

    const existingByIdentity = await supabase.from("Job")
      .select("id,contentHash,createdAt,sourcePublishedAt")
      .eq("sourceKey", source)
      .eq("externalId", claimed.data.externalId)
      .maybeSingle();
    if (existingByIdentity.error) throw new Error(existingByIdentity.error.message);

    let existing = existingByIdentity.data;
    if (!existing) {
      const byUrl = await supabase.from("Job")
        .select("id,contentHash,createdAt,sourcePublishedAt")
        .eq("source", source)
        .eq("sourceUrl", claimed.data.sourceUrl)
        .maybeSingle();
      if (byUrl.error) throw new Error(byUrl.error.message);
      existing = byUrl.data;
    }

    const companyName = normalizeCompany(normalizedContent.company || claimed.data.company);
    let companyId: string | null = null;
    if (companyName) {
      const found = await supabase.from("Company").select("id").ilike("name", companyName).limit(1).maybeSingle();
      if (found.error) throw new Error(found.error.message);
      companyId = found.data?.id || null;
      if (!companyId) {
        const created = await supabase.from("Company").insert({
          name: companyName,
          verified: false,
          description: null,
          website: sourcePayload.companyWebsite || null,
          logoUrl: sourcePayload.logoUrl || null,
        }).select("id").single();
        if (created.error) throw new Error(created.error.message);
        companyId = created.data.id;
      }
    }

    const contact = capture.applicationProfile || {};
    const applicationReady = Boolean(contact.applicationEmail || contact.applicationPhone || contact.applicationUrl || contact.applyUrl || contact.url);
    const language = detectJobLanguage(
      [capture.title, capture.description, capture.location].filter(Boolean).join(" "),
      null,
    );
    const languageRequirements = detectLanguageRequirements(
      [capture.title, capture.description].filter(Boolean).join(" "),
    );

    const sourceCountry: Record<string, string> = {
      minajobs:"CM", jobinfocamer:"CM", infosconcourseducation:"CM", fne:"CM", un_cameroon:"CM",
      jobivoire:"CI", jobs_ghana:"GH", jobweb_ghana:"GH", jobberman_ghana:"GH", myjobmag_ng:"NG",
      hotnigerianjobs:"NG", jobberman_ng:"NG", senjob:"SN", emploi_dakar:"SN", careers_sl:"SL",
      hrjobs_liberia:"LR", malijob:"ML", travailgabon:"GA", acpe_congo:"CG", onape_tchad:"TD",
      emploi_cf:"CF", saplic_gq:"GQ"
    };
    const freshnessAnchor = capture.publishedAt || existing?.sourcePublishedAt || existing?.createdAt || null;
    const isExistingJobExpired = freshnessAnchor
      ? addMonths(new Date(freshnessAnchor), 2).getTime() <= now.getTime()
      : false;
    const payload = {
      countryCode: sourceCountry[source] || sourcePayload.countryCode || null,
      title: normalizedContent.title || capture.title,
      description: canonicalDescription,
      language,
      languageOriginal: language,
      languageRequirements,
      location: capture.location,
      contractType: capture.contractType,
      source,
      sourceUrl: capture.sourceUrl,
      sourceKey: source,
      externalId: capture.externalId,
      contentHash,
      sourcePublishedAt: capture.publishedAt,
      lastSeenAt: now.toISOString(),
      deadline: capture.deadline,
      isActive: !isExistingJobExpired,
      applicationReady,
      applicationProfile: contact,
      applicationCheckedAt: now.toISOString(),
      companyId,
      normalizedContent,
      normalizedVersion: normalizedContent.version,
      normalizedAt: now.toISOString(),
      aiQualityScore: normalizedContent.quality.score,
      aiFlags: normalizedContent.quality.warnings,
      aiProcessed: false,
      aiProcessedAt: null,
      minExperienceYears: normalizedExperienceYears,
      aiSkills: normalizedContent.skills,
      updatedAt: now.toISOString(),
    };

    let jobId: string;
    if (existing?.id) {
      const result = await supabase.from("Job").update(payload).eq("id", existing.id);
      if (result.error) throw new Error(result.error.message);
      jobId = existing.id;
    } else {
      jobId = crypto.randomUUID();
      const result = await supabase.from("Job").insert({ id: jobId, createdAt: now.toISOString(), ...payload });
      if (result.error) throw new Error(result.error.message);
    }

    const finished = await supabase.from("JobHarvestCapture").update({
      status: "PROCESSED",
      jobId,
      lastError: null,
      processedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }).eq("id", row.id);
    if (finished.error) throw new Error(finished.error.message);

    return existing?.id ? "updated" : "created";
  } catch (error) {
    await supabase.from("JobHarvestCapture").update({
      status: "FAILED",
      lastError: error instanceof Error ? error.message : "UNKNOWN_PROCESSING_ERROR",
      updatedAt: now.toISOString(),
    }).eq("id", row.id);
    return "failed";
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "collect";
    const sourceKey = url.searchParams.get("source")?.trim() || undefined;
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || PROCESS_BATCH), 1), PROCESS_BATCH);
    const supabase = adminClient();
    const now = new Date();

    // Bulk shadow handoff: accept the crawler's raw candidates directly.
    // No relevance, scoring or quality ranking is applied here.
    const body = await request.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items : null;
    if (items) {
      let inserted = 0, refreshed = 0, expired = 0, skipped = 0;
      for (const item of items) {
        const source = String(item?.sourceKey || "").trim();
        const sourceUrl = String(item?.url || item?.sourceUrl || "").trim();
        const title = String(item?.title || "").trim();
        const publishedAt = parseDate(item?.published || item?.publishedAt);
        if (!source || !sourceUrl || !title || !publishedAt) {
          skipped++;
          continue;
        }
        if (isSourceExpired(publishedAt, now)) {
          expired++;
          continue;
        }

        const contentHash = crypto.createHash("sha256").update([
          source, sourceUrl, title, String(item?.company || ""),
          String(item?.location || ""), publishedAt,
        ].join("\n")).digest("hex");

        const existing = await supabase.from("JobHarvestCapture")
          .select("id,status,contentHash")
          .eq("sourceKey", source)
          .eq("sourceUrl", sourceUrl)
          .maybeSingle();
        if (existing.error) throw new Error(existing.error.message);

        const payload = {
          sourceKey: source,
          externalId: crypto.createHash("sha1").update(sourceUrl).digest("hex").slice(0, 20),
          sourceUrl,
          title: title.slice(0, 300),
          company: item?.company ? String(item.company).slice(0, 180) : null,
          location: item?.location ? String(item.location).slice(0, 180) : null,
          contractType: item?.contractType ? String(item.contractType).slice(0, 120) : null,
          remoteMode: item?.remoteMode ? String(item.remoteMode).slice(0, 40) : null,
          description: item?.description ? String(item.description).slice(0, 30000) : title,
          deadline: parseDate(item?.deadline),
          publishedAt,
          applicationProfile: {},
          contentHash,
          rawHtml: null,
          renderedHtml: null,
          extractedText: item?.description ? String(item.description).slice(0, 30000) : title,
          captureMode: "http",
          payload: {
            countryCode: item?.countryCode || null,
            opportunityType: item?.opportunityType || "EMPLOI",
          },
          status: "PENDING",
          attempts: 0,
          lastError: null,
          processedAt: null,
          discoveredAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        if (existing.data?.id) {
          if (existing.data.contentHash === contentHash && existing.data.status === "PROCESSED") {
            refreshed++;
            continue;
          }
          const result = await supabase.from("JobHarvestCapture").update(payload).eq("id", existing.data.id);
          if (result.error) throw new Error(result.error.message);
          refreshed++;
        } else {
          const result = await supabase.from("JobHarvestCapture").insert(payload);
          if (result.error) throw new Error(result.error.message);
          inserted++;
        }
      }
      return NextResponse.json({
        ok: true,
        mode: "ingest",
        selected: items.length,
        inserted,
        refreshed,
        expired,
        skipped,
        ingestedAt: now.toISOString(),
      });
    }

    if (mode === "collect") {
      const result = await collectStage(supabase, sourceKey, now);
      return NextResponse.json({ ok: true, mode, ...result, collectedAt: now.toISOString() });
    }

    if (mode === "process") {
      const { data: rows, error } = await supabase.from("JobHarvestCapture")
        .select("*")
        .in("status", ["PENDING", "FAILED"])
        .order("discoveredAt", { ascending: true })
        .range(0, limit - 1);
      if (error) throw new Error(error.message);

      const counts = { created: 0, updated: 0, quarantined: 0, expired: 0, failed: 0, claimed_elsewhere: 0 };
      for (const row of rows || []) {
        const outcome = await processCapture(supabase, row, now);
        if (outcome in counts) (counts as any)[outcome]++;
      }

      return NextResponse.json({
        ok: true,
        mode,
        ...counts,
        selected: rows?.length || 0,
        hasMore: (rows?.length || 0) === limit,
        nextOffset: rows?.length || 0,
        processedAt: now.toISOString(),
      });
    }

    return NextResponse.json({ message: "Mode invalide. Utiliser collect ou process." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Harvest impossible." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
