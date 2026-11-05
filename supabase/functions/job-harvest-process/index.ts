import { jwtVerify, createRemoteJWKSet } from "npm:jose@6";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveEffectivePublicationDate } from "../_shared/job-freshness.ts";
import { extractApplicationContact } from "../_shared/application-contact.ts";
import { resolveApplicationReadiness } from "../_shared/application-readiness.ts";
import { classifyJobSector } from "../_shared/job-sector-classification.ts";
import { deriveOfferQualityStatus } from "../_shared/offer-quality.ts";
import {
  decodeHtmlEntities,
  isGenericRecruitmentTitle,
  mapOpportunityType,
  normalizeLanguage,
  normalizeRemoteMode,
  normalizePipelineCaptureMode,
  resolveCountryCode,
  safeHttpUrl,
  safeInteger,
} from "./processor-logic.ts";

const JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "jobly-harvest";
const REPOSITORY = "kenzimayaka-glitch/Jobly";
const MAX_BATCH = 40;
const MAX_ATTEMPTS = 3;
const STALE_PROCESSING_MS = 20 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type AnyRecord = Record<string, any>;

const asRecord = (value: unknown): AnyRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {};

const asDate = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const clean = (value: unknown, max = 30000): string =>
  decodeHtmlEntities(value).replace(/\s+/g, " ").trim().slice(0, max);

const safeTextArray = (value: unknown, maxItems = 40): string[] =>
  Array.isArray(value)
    ? value.map((item) => clean(item, 100)).filter(Boolean).slice(0, maxItems)
    : [];

const optionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(2_000_000_000, Math.trunc(n))) : null;
};

async function authorize(req: Request): Promise<void> {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw new Error("Missing GitHub Actions OIDC token");
  const { payload } = await jwtVerify(header.slice(7), JWKS, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (payload.repository !== REPOSITORY || payload.ref !== "refs/heads/main") {
    throw new Error("Unauthorized repository/ref");
  }
}

function processingProfile(
  applicationProfile: unknown,
  status: string,
  code: string,
  reason: string,
  details: AnyRecord = {},
): AnyRecord {
  const previous = asRecord(applicationProfile);
  return {
    ...previous,
    processing: {
      state: status,
      code,
      reason: clean(reason, 800),
      at: new Date().toISOString(),
      ...details,
    },
  };
}

async function persistCaptureState(
  db: any,
  capture: AnyRecord,
  status: "PROCESSED" | "QUARANTINED" | "EXPIRED" | "FAILED",
  code: string | null,
  reason: string | null,
  details: AnyRecord = {},
  jobId: string | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    ...asRecord(capture.payload),
    processing: {
      state: status,
      code,
      reason: reason ? clean(reason, 800) : null,
      at: now,
      ...details,
    },
  };
  const applicationProfile = processingProfile(
    capture.applicationProfile,
    status,
    code ?? "OK",
    reason ?? "Processed successfully",
    details,
  );
  const update: AnyRecord = {
    status,
    lastError: code ? clean(code + (reason ? ": " + reason : ""), 1000) : null,
    applicationProfile,
    payload,
    processedAt: status === "FAILED" ? null : now,
    updatedAt: now,
  };
  if (jobId) update.jobId = jobId;
  const { error } = await db.from("JobHarvestCapture").update(update).eq("id", capture.id);
  if (error) throw new Error("CAPTURE_STATE_UPDATE_FAILED: " + error.message);
}

async function quarantine(
  db: any,
  capture: AnyRecord,
  code: string,
  reason: string,
  details: AnyRecord = {},
): Promise<void> {
  await persistCaptureState(db, capture, "QUARANTINED", code, reason, details);
}

async function findOrCreateCompany(db: any, companyName: string, payload: AnyRecord): Promise<string | null> {
  const name = clean(companyName, 180);
  if (!name) return null;
  const existing = await db.from("Company").select("id").ilike("name", name).limit(1).maybeSingle();
  if (existing.error) throw new Error("COMPANY_LOOKUP_FAILED: " + existing.error.message);
  if (existing.data?.id) return existing.data.id;

  const website = safeHttpUrl(payload.companyWebsite ?? payload.website);
  const inserted = await db.from("Company").insert({
    name,
    website,
    logoUrl: safeHttpUrl(payload.logoUrl),
  }).select("id").single();
  if (inserted.error) throw new Error("COMPANY_CREATE_FAILED: " + inserted.error.message);
  return inserted.data.id;
}

async function claimCapture(db: any, row: AnyRecord): Promise<AnyRecord | null> {
  const now = new Date().toISOString();
  const update = db.from("JobHarvestCapture")
    .update({ status: "PROCESSING", attempts: Number(row.attempts ?? 0) + 1, updatedAt: now })
    .eq("id", row.id)
    .eq("status", row.status);
  if (row.updatedAt) update.eq("updatedAt", row.updatedAt);
  const { data, error } = await update.select("*").maybeSingle();
  if (error) throw new Error("CAPTURE_CLAIM_FAILED: " + error.message);
  return data ?? null;
}

async function processCapture(db: any, capture: AnyRecord, counts: AnyRecord): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  const payload = asRecord(capture.payload);
  const profile = asRecord(capture.applicationProfile);
  const title = clean(capture.title ?? payload.title, 300);
  const description = clean(capture.description ?? capture.extractedText ?? payload.description, 30000);
  const sourceKey = clean(capture.sourceKey, 120);
  const sourceUrl = safeHttpUrl(capture.sourceUrl ?? payload.url);
  const externalId = clean(capture.externalId ?? sourceUrl, 500);
  const location = clean(capture.location ?? payload.location, 300);
  const companyName = clean(capture.company ?? payload.company, 180);

  if (!sourceKey || !sourceUrl || !externalId || !title || description.length < 60) {
    await quarantine(db, capture, "REQUIRED_CONTENT_MISSING",
      "Source, URL, external id, title and a meaningful description are required.");
    counts.quarantined++;
    return;
  }
  if (isGenericRecruitmentTitle(title)) {
    await quarantine(db, capture, "GENERIC_RECRUITMENT_LANDING",
      "This page is a recruiter account, CV bank or generic recruitment landing page, not an individual vacancy.");
    counts.quarantined++;
    return;
  }

  const declaredCountry = payload.countryCode ?? profile.countryCode ?? payload.country ?? profile.country;
  const countryResolution = resolveCountryCode(declaredCountry, location);
  const countryCode = countryResolution.countryCode;
  if (!countryCode) {
    await quarantine(db, capture, "COUNTRY_CODE_UNRESOLVED",
      "No supported African country could be verified from capture metadata or the offer location.");
    counts.quarantined++;
    return;
  }

  // A strong country signal in the actual offer location wins over a crawler's
  // loop-country label. Keep the conflict in JSON metadata for later audit.
  const kind = mapOpportunityType(
    payload.opportunityType ?? profile.opportunityType,
    title,
    description,
  );
  if (!kind) {
    await quarantine(db, capture, "UNSUPPORTED_OPPORTUNITY_TYPE",
      "The capture is not a job, internship, consultancy, competition, training or recruitment notice.",
      { sourceOpportunityType: payload.opportunityType ?? profile.opportunityType ?? null });
    counts.quarantined++;
    return;
  }

  const publicationDate = asDate(capture.publishedAt ?? payload.published ?? payload.sourcePublishedAt);
  const publicationDateEstimated =
    profile.publicationDateEstimated === true || payload.publicationDateEstimated === true;
  const deadline = asDate(capture.deadline ?? payload.deadline);
  const discoveredAt = asDate(capture.discoveredAt);
  const freshness = resolveEffectivePublicationDate({
    sourcePublishedAt: publicationDateEstimated ? null : publicationDate,
    firstHarvestAt: publicationDateEstimated ? discoveredAt : null,
    createdAt: null,
    deadline,
    now: nowIso,
  });

  const countryDetails = {
    countryCode,
    countryEvidence: countryResolution.evidence,
    declaredCountryCode: countryResolution.declaredCountryCode,
    countryConflictCorrected: countryResolution.conflict,
    sourceOpportunityType: kind.sourceType,
    publicationDateEstimated: freshness.publicationDateEstimated,
    publicationDateSource: freshness.publicationDateSource,
    effectivePublishedAt: freshness.effectivePublishedAt,
    freshnessExpiresAt: freshness.expiresAt,
  };

  if (!freshness.effectivePublishedAt) {
    await quarantine(db, capture, "MISSING_PUBLICATION_AND_FALLBACK_DATE",
      "No reliable source publication date or first-harvest fallback is available.", countryDetails);
    counts.quarantined++;
    return;
  }
  if (!freshness.visible) {
    const expiredReason = freshness.expiredByDeadline
      ? "Application deadline has passed."
      : freshness.publishedInFuture
      ? "Publication date is in the future."
      : "Publication date is outside the freshness window.";
    const status = freshness.publishedInFuture ? "QUARANTINED" : "EXPIRED";
    await persistCaptureState(
      db, capture, status,
      freshness.rejectionCode ?? "FRESHNESS_REJECTED",
      expiredReason,
      countryDetails,
    );
    if (status === "EXPIRED") counts.expired++;
    else counts.quarantined++;
    return;
  }

  const applicationUrl = safeHttpUrl(
    profile.applicationUrl ?? profile.applyUrl ?? payload.applicationUrl ?? payload.applyUrl,
  );
  const profileUrl = safeHttpUrl(profile.url);
  const applicationContacts = extractApplicationContact(
    description,
    profile.applicationEmail ?? payload.applicationEmail ?? payload.email,
    profile.applicationPhone ?? payload.applicationPhone ?? payload.phone,
  );
  const applicationEmail = applicationContacts.email;
  const applicationPhone = applicationContacts.phone;
  const applicationReadiness = resolveApplicationReadiness({
    email: applicationEmail,
    phone: applicationPhone,
    applicationUrl,
  });
  const hasApplicationRoute = applicationReadiness.applicationReady;
  const displayModel = clean(profile.displayModel ?? payload.displayModel, 120) ||
    `jobly-standard-${sourceKey}-v1`;
  const jobTags = safeTextArray(payload.tags);
  const sector = classifyJobSector(title, description, jobTags);
  const applicationProfile = {
    ...profile,
    ...countryDetails,
    sourceUrl,
    sourceName: clean(payload.sourceName ?? payload.source ?? sourceKey, 180),
    opportunityType: kind.sourceType,
    displayModel,
    applicationUrl,
    applyUrl: applicationUrl,
    applicationEmail: applicationEmail || null,
    applicationPhone: applicationPhone || null,
    applicationReady: hasApplicationRoute,
    applicationAvailability: applicationReadiness.applicationAvailability,
  };

  const language = normalizeLanguage(
    profile.language ?? payload.language ?? payload.languageOriginal,
    title + " " + description,
  );
  const remoteMode = normalizeRemoteMode(capture.remoteMode ?? payload.remoteMode);
  const minExperienceYears = safeInteger(
    payload.minExperienceYears ?? payload.minimumExperienceYears ?? payload.experienceYears,
    0,
  );

  let salaryMin = optionalNumber(payload.salaryMin);
  let salaryMax = optionalNumber(payload.salaryMax);
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    salaryMin = null;
    salaryMax = null;
  }

  const companyId = await findOrCreateCompany(db, companyName, payload);
  const normalizedContent = {
    version: "jobly-offer-v3",
    displayModel,
    title,
    company: companyName || null,
    sector,
    sectorClassification: { method: "deterministic-title-tags-rules", version: "p1-sector-v1" },
    description: [description],
    location: location || null,
    countryCode,
    opportunityType: kind.sourceType,
    jobOpportunityType: kind.jobType,
    contractType: clean(capture.contractType ?? payload.contractType, 100) || null,
    salary: { min: salaryMin, max: salaryMax, currency: clean(payload.salaryCurrency, 8) || null },
    minExperienceYears,
    remoteMode,
    skills: safeTextArray(payload.skills),
    tags: safeTextArray(payload.tags),
    publishedAt: freshness.effectivePublishedAt,
    sourcePublishedAt: publicationDate,
    publicationDateEstimated: freshness.publicationDateEstimated,
    publicationDateSource: freshness.publicationDateSource,
    deadline,
    applicationUrl,
    applicationEmail: applicationEmail || null,
    applicationPhone: applicationPhone || null,
    applicationAvailability: applicationReadiness.applicationAvailability,
    sourceUrl,
    sourceVerified: true,
  };

  const jobValues: AnyRecord = {
    companyId,
    title,
    description,
    language,
    languageOriginal: language,
    languageRequirements: safeTextArray(payload.languageRequirements, 12),
    location: location || null,
    contractType: clean(capture.contractType ?? payload.contractType, 100) || null,
    salaryMin,
    salaryMax,
    salaryCurrency: clean(payload.salaryCurrency, 8) || null,
    source: clean(payload.sourceName ?? payload.source ?? sourceKey, 180),
    sourceUrl,
    deadline,
    lastSeenAt: nowIso,
    isActive: true,
    remoteMode,
    minExperienceYears,
    sourceKey,
    externalId,
    contentHash: clean(capture.contentHash ?? payload.contentHash, 128) || null,
    sourcePublishedAt: publicationDate,
    aiProcessed: false,
    aiFlags: [],
    aiSkills: safeTextArray(payload.skills),
    aiSector: sector,
    applicationReady: hasApplicationRoute,
    applicationProfile,
    applicationCheckedAt: hasApplicationRoute ? nowIso : null,
    tags: jobTags,
    opportunityType: kind.jobType,
    normalizedContent,
    normalizedVersion: "jobly-offer-v3",
    normalizedAt: nowIso,
    qualityStatus: deriveOfferQualityStatus({ title, description, sourceUrl }),
    countryCode,
    updatedAt: nowIso,
    aiSummary: description.slice(0, 700),
  };

  let existing: AnyRecord | null = null;
  const byExternalId = await db.from("Job")
    .select("id,createdAt")
    .eq("sourceKey", sourceKey)
    .eq("externalId", externalId)
    .maybeSingle();
  if (byExternalId.error) throw new Error("JOB_LOOKUP_FAILED: " + byExternalId.error.message);
  existing = byExternalId.data;

  if (!existing) {
    const bySourceUrl = await db.from("Job")
      .select("id,createdAt")
      .eq("source", jobValues.source)
      .eq("sourceUrl", sourceUrl)
      .maybeSingle();
    if (bySourceUrl.error) throw new Error("JOB_SOURCE_URL_LOOKUP_FAILED: " + bySourceUrl.error.message);
    existing = bySourceUrl.data;
  }

  let jobId: string;
  if (existing?.id) {
    const { error } = await db.from("Job").update(jobValues).eq("id", existing.id);
    if (error) throw new Error("JOB_UPDATE_FAILED: " + error.message);
    jobId = existing.id;
    counts.updated++;
  } else {
    const { data, error } = await db.from("Job")
      .insert({ createdAt: nowIso, ...jobValues })
      .select("id")
      .single();
    if (error) throw new Error("JOB_INSERT_FAILED: " + error.message);
    jobId = data.id;
    counts.created++;
  }

  const rawPayload = {
    ...payload,
    countryCode,
    opportunityType: kind.sourceType,
    publicationDateEstimated: freshness.publicationDateEstimated,
    publicationDateSource: freshness.publicationDateSource,
    effectivePublishedAt: freshness.effectivePublishedAt,
    applicationProfile,
  };
  const confidence = {
    sourceUrlVerified: true,
    countryCodeVerified: true,
    countryEvidence: countryResolution.evidence,
    countryConflictCorrected: countryResolution.conflict,
    publicationDateVerified: Boolean(publicationDate),
    publicationDateEstimated: freshness.publicationDateEstimated,
    deadlineVerified: Boolean(deadline),
    applicationRouteVerified: hasApplicationRoute,
    sectorClassificationVerified: true,
    descriptionVerified: description.length >= 60,
  };
  const captureMode = normalizePipelineCaptureMode(capture.captureMode);
  const pipelineRow = {
    jobId,
    sourceKey,
    sourceUrl,
    captureMode,
    rawPayload,
    extractedText: capture.extractedText ?? description,
    canonicalContent: normalizedContent,
    qualityScore: null,
    confidence,
    status: "READY",
    lastError: null,
    processedAt: nowIso,
    updatedAt: nowIso,
  };
  const { error: pipelineError } = await db.from("JobOfferPipeline")
    .upsert(pipelineRow, { onConflict: "jobId" });
  if (pipelineError) throw new Error("PIPELINE_UPSERT_FAILED: " + pipelineError.message);

  await persistCaptureState(
    db,
    capture,
    "PROCESSED",
    null,
    null,
    { ...countryDetails, applicationRouteVerified: hasApplicationRoute },
    jobId,
  );
  counts.processed++;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ message: "POST required" }, 405);

  try {
    await authorize(req);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Unauthorized" }, 401);
  }

  try {
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const key = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) throw new Error("No privileged Supabase key configured");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, key);

    const body = await req.json().catch(() => ({}));
    const requested = Number((body as AnyRecord)?.limit ?? MAX_BATCH);
    const limit = Math.min(Math.max(Number.isFinite(requested) ? Math.trunc(requested) : MAX_BATCH, 1), MAX_BATCH);
    const rawSourceKeys = Array.isArray((body as AnyRecord)?.sourceKeys) ? (body as AnyRecord).sourceKeys : [];
    const sourceKeys = [...new Set(rawSourceKeys.map((key: unknown) => clean(key, 120)).filter(Boolean))];
    if (sourceKeys.length > 20) return json({ message: "A processing batch is limited to 20 source keys." }, 400);

    const pendingOnly = (body as AnyRecord)?.pendingOnly === true;
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
    const staleLimit = Math.min(5, limit);
    let stale: AnyRecord[] = [];
    if (!pendingOnly) {
      let staleQuery = db.from("JobHarvestCapture").select("*").eq("status", "PROCESSING")
        .lt("updatedAt", staleBefore).order("updatedAt", { ascending: true });
      if (sourceKeys.length) staleQuery = staleQuery.in("sourceKey", sourceKeys);
      const { data: staleRows, error: staleError } = await staleQuery.limit(staleLimit);
      if (staleError) throw new Error("STALE_CAPTURE_SELECT_FAILED: " + staleError.message);
      stale = staleRows ?? [];
    }
    const statuses = pendingOnly ? ["PENDING"] : ["PENDING", "FAILED"];
    let normalQuery = db.from("JobHarvestCapture").select("*").in("status", statuses)
      .order("discoveredAt", { ascending: true });
    if (sourceKeys.length) normalQuery = normalQuery.in("sourceKey", sourceKeys);
    const { data: normalRows, error: normalError } = await normalQuery.limit(Math.max(0, limit - stale.length));
    if (normalError) throw new Error("CAPTURE_SELECT_FAILED: " + normalError.message);

    // Reclaim abandoned PROCESSING rows first so they are not starved by a
    // continuously replenished PENDING queue.
    const rows: AnyRecord[] = [...stale, ...(normalRows ?? [])];

    const counts: AnyRecord = {
      selected: rows.length,
      created: 0,
      updated: 0,
      processed: 0,
      expired: 0,
      quarantined: 0,
      failed: 0,
      claimedElsewhere: 0,
      persistenceErrors: 0,
    };

    for (const row of rows) {
      const attempts = Number(row.attempts ?? 0);
      if (attempts >= MAX_ATTEMPTS) {
        try {
          await quarantine(db, row, "MAX_PROCESS_ATTEMPTS",
            "Processing retry ceiling reached; manual review is required.");
          counts.quarantined++;
        } catch (error) {
          counts.persistenceErrors++;
          console.error("Failed to quarantine retry-exhausted capture", row.id, error);
        }
        continue;
      }

      let capture: AnyRecord | null;
      try {
        capture = await claimCapture(db, row);
      } catch (error) {
        counts.persistenceErrors++;
        console.error("Capture claim failed", row.id, error);
        continue;
      }
      if (!capture) {
        counts.claimedElsewhere++;
        continue;
      }

      try {
        await processCapture(db, capture, counts);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const attemptCount = Number(capture.attempts ?? 0);
        const retryExhausted = attemptCount >= MAX_ATTEMPTS;
        try {
          if (retryExhausted) {
            await quarantine(db, capture, "MAX_PROCESS_ATTEMPTS", reason);
            counts.quarantined++;
          } else {
            await persistCaptureState(db, capture, "FAILED", "PROCESSING_ERROR", reason);
            counts.failed++;
          }
        } catch (persistError) {
          counts.persistenceErrors++;
          console.error("Failed to persist processing error", capture.id, persistError);
        }
      }
    }

    return json({ ok: true, ...counts, sourceKeys: sourceKeys.length ? sourceKeys : null, processedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Harvest processor fatal error", error);
    return json({ ok: false, message: error instanceof Error ? error.message : String(error) }, 500);
  }
});
