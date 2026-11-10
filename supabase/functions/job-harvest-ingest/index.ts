
import { jwtVerify, createRemoteJWKSet } from "npm:jose@6";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveEffectivePublicationDate } from "../_shared/job-freshness.ts";
import { extractApplicationContact, resolveSourceDisplayModel } from "../_shared/application-contact.ts";
import { resolveApplicationReadiness } from "../_shared/application-readiness.ts";

const JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "jobly-harvest";
const REPO = "kenzimayaka-glitch/Jobly";
const COUNTRY_CODES = new Set(["AO","BF","BI","BJ","BW","CD","CF","CG","CI","CM","CV","DJ","DZ","EG","ER","ET","GA","GH","GM","GN","GQ","GW","KE","KM","LR","LS","LY","MA","MG","ML","MR","MU","MW","MZ","NA","NE","NG","RW","SC","SD","SL","SN","SO","SS","ST","SZ","TD","TG","TN","TZ","UG","ZA","ZM","ZW"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const asDate = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

async function authorize(req: Request) {
  const value = req.headers.get("authorization") ?? "";
  if (!value.startsWith("Bearer ")) throw new Error("Missing GitHub Actions OIDC token");
  const token = value.slice(7);
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE });
  if (payload.repository !== REPO || payload.ref !== "refs/heads/main") {
    throw new Error("Unauthorized repository/ref");
  }
  return payload;
}


export async function ingestHarvestItems(admin: any, items: any[], now = new Date()) {
  if (!items.length) return { status: 200, body: { insertedOrRefreshed: 0, skipped: 0, expired: 0 } };
  if (items.length > 500) return { status: 413, body: { message: "Batch exceeds 500 items" } };

  const nowIso = now.toISOString();
  const rows = [];
  let skipped = 0;
  let expired = 0;

  for (const item of items) {
    const sourceKey = String(item?.sourceKey ?? "").trim();
    const sourceUrl = String(item?.url ?? "").trim();
    const title = String(item?.title ?? "").trim();
    const countryCode = String(item?.countryCode ?? "").trim().toUpperCase();
    const publishedAt = asDate(item?.published);
    const deadline = asDate(item?.deadline);
    const applicationContact = extractApplicationContact(
      String(item?.title ?? "") + "\\n" + String(item?.description ?? ""),
      item?.applicationEmail,
      item?.applicationPhone,
    );
    const applicationReadiness = resolveApplicationReadiness({
      email: applicationContact.email,
      phone: applicationContact.phone,
      applicationUrl: item?.applicationUrl ?? item?.applyUrl,
    });
    const displayModel = String(item?.displayModel ?? "").trim() ||
      resolveSourceDisplayModel(
        sourceKey,
        String(item?.sourceType ?? "national"),
        String(item?.sourceCaptureMode ?? "http"),
        Boolean(item?.renderRequired),
      );

    let validUrl = false;
    try {
      const parsed = new URL(sourceUrl);
      validUrl = parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      validUrl = false;
    }

    if (!sourceKey || !validUrl || !title || !COUNTRY_CODES.has(countryCode)) {
      skipped++;
      continue;
    }

    const publicationDateEstimated = item?.publicationDateEstimated === true || !publishedAt;
    const firstHarvestAt = publicationDateEstimated
      ? asDate(item?.discoveredAt) ?? nowIso
      : nowIso;
    const freshness = resolveEffectivePublicationDate({
      sourcePublishedAt: publicationDateEstimated ? null : publishedAt,
      firstHarvestAt,
      createdAt: null,
      deadline,
      now: nowIso,
    });

    if (!freshness.visible) {
      if (freshness.expiredByDeadline || freshness.expiredByFreshness) expired++;
      else skipped++;
      continue;
    }

    const payload = {
      ...item,
      published: freshness.effectivePublishedAt,
      discoveredAt: firstHarvestAt,
      publicationDateEstimated: freshness.publicationDateEstimated,
      publicationDateSource: freshness.publicationDateSource,
    };

    rows.push({
      sourceKey,
      externalId: sourceUrl,
      sourceUrl,
      title: title.slice(0, 500),
      company: item.company ? String(item.company).slice(0, 300) : null,
      location: item.location ? String(item.location).slice(0, 300) : null,
      description: item.description ? String(item.description).slice(0, 30000) : null,
      deadline,
      publishedAt: freshness.effectivePublishedAt,
      applicationProfile: {
        countryCode,
        opportunityType: item.opportunityType ?? null,
        applicationEmail: applicationContact.email,
        applicationPhone: applicationContact.phone,
        applicationReady: applicationReadiness.applicationReady,
        applicationAvailability: applicationReadiness.applicationAvailability,
        applicationUrl: applicationReadiness.applicationUrl,
        publicationDateEstimated: freshness.publicationDateEstimated,
        publicationDateSource: freshness.publicationDateSource,
        displayModel,
        sourceType: item.sourceType ?? "national",
      },
      payload: {
        ...payload,
        applicationEmail: applicationContact.email,
        applicationPhone: applicationContact.phone,
        displayModel,
      },
      captureMode: item.sourceCaptureMode ?? "http",
      status: "PENDING",
      discoveredAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (!rows.length) return {
    status: 200,
    body: { insertedOrRefreshed: 0, skipped, expired, countryCodes: [], estimatedDateCandidates: 0 },
  };

  const { error } = await admin.from("JobHarvestCapture").upsert(rows, {
    onConflict: "sourceKey,sourceUrl",
    ignoreDuplicates: false,
  });
  if (error) return { status: 500, body: { message: error.message, code: error.code } };

  return {
    status: 200,
    body: {
      insertedOrRefreshed: rows.length,
      skipped,
      expired,
      estimatedDateCandidates: rows.filter(x => x.applicationProfile.publicationDateEstimated === true).length,
      countryCodes: [...new Set(rows.map(x => x.applicationProfile.countryCode))],
    },
  };
}

async function handleRequest(req: Request) {
  if (req.method !== "POST") return json({ message: "POST required" }, 405);
  try {
    await authorize(req);
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return json({ insertedOrRefreshed: 0, skipped: 0, expired: 0 });
    if (items.length > 500) return json({ message: "Batch exceeds 500 items" }, 413);

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const serviceKey = secretKeys.default;
    if (!serviceKey) return json({ message: "Supabase service key is not configured" }, 500);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const result = await ingestHarvestItems(admin, items);
    return json(result.body, result.status);
  } catch (e) {
    return json({ message: e instanceof Error ? e.message : String(e) }, 401);
  }
}

if (import.meta.main) Deno.serve(handleRequest);

