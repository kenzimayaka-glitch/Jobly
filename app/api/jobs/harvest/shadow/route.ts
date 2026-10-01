import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ITEMS = 500;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isExpired(publishedAt: string | null, now: Date): boolean {
  if (!publishedAt) return false;
  const parsed = new Date(publishedAt);
  return Number.isFinite(parsed.getTime()) && addMonths(parsed, 2).getTime() <= now.getTime();
}

function clean(value: unknown, max = 30_000): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function externalId(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 32);
}

function contentHash(item: { title: string; description: string; url: string }): string {
  return crypto.createHash("sha256")
    .update([item.title, item.description, item.url].join("\n"))
    .digest("hex");
}

async function authorized(request: NextRequest): Promise<boolean> {
  const configured = process.env.CRON_SECRET || process.env.JOB_SOURCE_INGEST_SECRET;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (configured && header === configured) return true;
  return Boolean(await getAuthUser(request));
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    if (!rawItems.length) {
      return NextResponse.json({ ok: true, received: 0, inserted: 0, refreshed: 0, expired: 0 });
    }
    if (rawItems.length > MAX_ITEMS) {
      return NextResponse.json({ message: `Maximum ${MAX_ITEMS} offres par lot.` }, { status: 413 });
    }

    const now = new Date();
    const supabase = adminClient();
    let inserted = 0;
    let refreshed = 0;
    let expired = 0;
    let quarantined = 0;

    for (const raw of rawItems) {
      const sourceKey = clean(raw?.sourceKey, 160);
      const sourceUrl = clean(raw?.url || raw?.sourceUrl, 2000);
      const title = clean(raw?.title, 300);
      if (!sourceKey || !sourceUrl || !title || !/^https?:\/\//i.test(sourceUrl)) continue;
      const safeSourceUrl = sourceUrl as string;
      const safeTitle = title as string;
      const description = clean(raw?.description, 30_000) || safeTitle;

      const publishedAt = parseDate(raw?.published || raw?.publishedAt);
      const deadline = parseDate(raw?.deadline);
      const sourceExpired = isExpired(publishedAt, now);
      const missingPublicationDate = !publishedAt;
      const payload = {
        countryCode: clean(raw?.countryCode, 2)?.toUpperCase() || null,
        opportunityType: clean(raw?.opportunityType, 40),
        shadowCapturedAt: now.toISOString(),
      };
      const row = {
        sourceKey,
        externalId: externalId(safeSourceUrl),
        sourceUrl: safeSourceUrl,
        title: safeTitle,
        company: clean(raw?.company, 180),
        location: clean(raw?.location, 300),
        contractType: null,
        remoteMode: null,
        description,
        deadline,
        publishedAt,
        applicationProfile: {},
        contentHash: contentHash({ title: safeTitle, description, url: safeSourceUrl }),
        rawHtml: null,
        renderedHtml: null,
        extractedText: description,
        captureMode: "http",
        payload,
        status: sourceExpired ? "EXPIRED" : missingPublicationDate ? "QUARANTINED" : "PENDING",
        attempts: 0,
        lastError: missingPublicationDate ? "MISSING_PUBLICATION_DATE" : null,
        processedAt: null,
        updatedAt: now.toISOString(),
        discoveredAt: now.toISOString(),
      };

      const existing = await supabase
        .from("JobHarvestCapture")
        .select("id,status,contentHash")
        .eq("sourceKey", sourceKey)
        .eq("sourceUrl", sourceUrl)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);

      if (existing.data) {
        const changed = existing.data.contentHash !== row.contentHash;
        const status = sourceExpired
          ? "EXPIRED"
          : missingPublicationDate
            ? "QUARANTINED"
            : changed || existing.data.status !== "PROCESSED"
              ? "PENDING"
              : "PROCESSED";
        const result = await supabase.from("JobHarvestCapture").update({
          ...row,
          status,
          attempts: status === "PENDING" ? 0 : existing.data.status === status ? undefined : 0,
        }).eq("id", existing.data.id);
        if (result.error) throw new Error(result.error.message);
        refreshed++;
      } else {
        const result = await supabase.from("JobHarvestCapture").insert(row);
        if (result.error) throw new Error(result.error.message);
        inserted++;
      }
      if (sourceExpired) expired++;
      if (missingPublicationDate) quarantined++;
    }

    return NextResponse.json({
      ok: true,
      received: rawItems.length,
      inserted,
      refreshed,
      expired,
      quarantined,
      capturedAt: now.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Import shadow impossible." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
