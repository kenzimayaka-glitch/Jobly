import { jwtVerify, createRemoteJWKSet } from "npm:jose@6";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildGeminiBatchPrompt,
  normalizeGeminiOffer,
  parseGeminiOffers,
  type OfferForAi,
} from "./normalizer.ts";

const REPOSITORY = "kenzimayaka-glitch/Jobly";
const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "jobly-harvest";
const JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});
const env = (name: string) => Deno.env.get(name) || "";
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function authorize(req: Request): Promise<void> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("Missing GitHub Actions OIDC token");
  const { payload } = await jwtVerify(header.slice(7), JWKS, { issuer: ISSUER, audience: AUDIENCE });
  if (payload.repository !== REPOSITORY || payload.ref !== "refs/heads/main") {
    throw new Error("Unauthorized repository/ref");
  }
}

async function markRetry(db: any, job: Record<string, any>, reason: string, retryHours: number): Promise<void> {
  const now = new Date();
  const normalized = asRecord(job.normalizedContent);
  const previous = asRecord(normalized.aiProcessing);
  const attempts = Number(previous.attempts || 0) + 1;
  const retryAt = new Date(now.getTime() + retryHours * 60 * 60 * 1000).toISOString();
  await db.from("Job").update({
    normalizedContent: {
      ...normalized,
      aiProcessing: {
        status: "RETRY",
        provider: "GEMINI",
        attempts,
        lastAttemptAt: now.toISOString(),
        retryAt,
        lastError: reason.slice(0, 500),
      },
    },
    updatedAt: now.toISOString(),
  }).eq("id", job.id);
}

async function callGemini(offers: OfferForAi[]): Promise<{ offers: Record<string, unknown>[]; model: string }> {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildGeminiBatchPrompt(offers) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    }),
    signal: AbortSignal.timeout(55000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(data?.error?.message || "Gemini API error");
    const error = new Error(`GEMINI_${response.status}: ${message.slice(0, 300)}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
  if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");
  return { offers: parseGeminiOffers(text), model: data?.modelVersion || model };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, message: "POST required" }, 405);
  try {
    await authorize(req);
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : "Unauthorized" }, 401);
  }

  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) {
    return json({
      ok: true,
      configured: false,
      provider: "GEMINI",
      processed: 0,
      reason: "GEMINI_API_KEY_MISSING_IN_SUPABASE_EDGE_SECRETS",
    });
  }

  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const projectUrl = env("SUPABASE_URL");
  if (!serviceKey || !projectUrl) return json({ ok: false, message: "Supabase service runtime is not configured." }, 500);

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.max(1, Math.min(Number(body?.batchSize) || 5, 10));
  const db = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: pending, error } = await db.from("Job")
    .select("id,title,companyId,description,location,source,sourceKey,sourceUrl,normalizedContent,normalizedVersion,aiProcessed,updatedAt")
    .eq("isActive", true)
    .or("aiProcessed.is.null,aiProcessed.eq.false")
    .order("updatedAt", { ascending: true })
    .limit(Math.max(batchSize * 8, 40));

  if (error) return json({ ok: false, message: "Pending offers could not be loaded: " + error.message }, 500);

  const due = (pending || []).filter((job: any) => {
    const retryAt = String(asRecord(asRecord(job.normalizedContent).aiProcessing).retryAt || "");
    return !retryAt || !Number.isFinite(Date.parse(retryAt)) || Date.parse(retryAt) <= now.getTime();
  });

  const selected = due.filter((job: any) => String(job.description || "").trim().length >= 40 && String(job.sourceUrl || "").trim()).slice(0, batchSize);
  if (!selected.length) {
    return json({ ok: true, configured: true, provider: "GEMINI", selected: 0, processed: 0, deferred: due.length ? pending.length - due.length : 0, remainingPending: pending?.length || 0 });
  }

  const offers: OfferForAi[] = selected.map((job: any) => ({
    id: String(job.id),
    title: String(job.title || ""),
    company: null,
    location: String(job.location || ""),
    description: String(job.description || ""),
    source: String(job.source || ""),
    sourceKey: String(job.sourceKey || ""),
    sourceUrl: String(job.sourceUrl || ""),
    normalizedContent: asRecord(job.normalizedContent),
  }));

  let result: { offers: Record<string, unknown>[]; model: string };
  try {
    result = await callGemini(offers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GEMINI_REQUEST_FAILED";
    const status = (error as Error & { status?: number }).status || 0;
    const retryHours = status === 429 ? 6 : status === 403 ? 12 : 2;
    await Promise.all(selected.map((job: any) => markRetry(db, job, message, retryHours)));
    return json({ ok: true, configured: true, provider: "GEMINI", selected: selected.length, processed: 0, retryScheduled: selected.length, reason: message.slice(0, 240) });
  }

  const byId = new Map(result.offers.map((item) => [String(item.id || ""), item]));
  let processed = 0;
  let retryScheduled = 0;
  const errors: Array<{ id: string; message: string }> = [];

  for (const job of selected as any[]) {
    const ai = byId.get(String(job.id));
    if (!ai) {
      await markRetry(db, job, "GEMINI_RESULT_MISSING_FOR_OFFER", 2);
      retryScheduled++;
      continue;
    }

    const processedAt = new Date().toISOString();
    const normalized = normalizeGeminiOffer(ai, {
      id: String(job.id),
      title: String(job.title || ""),
      company: null,
      location: String(job.location || ""),
      description: String(job.description || ""),
      source: String(job.source || ""),
      sourceKey: String(job.sourceKey || ""),
      sourceUrl: String(job.sourceUrl || ""),
      normalizedContent: asRecord(job.normalizedContent),
    }, result.model, processedAt);

    const classification = asRecord(normalized.aiClassification);
    const sections = asRecord(normalized.sections);
    const patch = {
      normalizedContent: normalized,
      normalizedVersion: "jobly-offer-ai-v1",
      normalizedAt: processedAt,
      aiProcessed: true,
      aiProcessedAt: processedAt,
      aiQualityScore: Number.isFinite(Number(classification.qualityScore)) ? Number(classification.qualityScore) : null,
      aiSummary: String(normalized.summary || "").slice(0, 1200) || String(job.description || "").slice(0, 700),
      aiFlags: Array.isArray(classification.flags) ? classification.flags : [],
      aiSkills: Array.isArray(sections.skills) ? sections.skills : [],
      updatedAt: processedAt,
    };
    const { error: updateError } = await db.from("Job").update(patch).eq("id", job.id);
    if (updateError) {
      errors.push({ id: String(job.id), message: updateError.message });
      await markRetry(db, job, updateError.message, 1);
      retryScheduled++;
      continue;
    }
    processed++;
  }

  return json({
    ok: true,
    configured: true,
    provider: "GEMINI",
    model: result.model,
    selected: selected.length,
    processed,
    retryScheduled,
    remainingPendingHint: (pending?.length || 0) - processed,
    errors,
  });
});
