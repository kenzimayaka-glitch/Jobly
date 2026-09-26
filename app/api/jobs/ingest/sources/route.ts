import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient } from "../../../../lib/server-auth";
import { collectPublicJobSources } from "../../../../lib/jobSourceCollector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET || process.env.JOB_SOURCE_INGEST_SECRET;
  if (!configured) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return header === configured;
}

function normalizeCompany(value: string | null): string | null {
  const clean = (value || "").replace(/\s+/g, " ").trim();
  return clean.length >= 2 ? clean.slice(0, 180) : null;
}

function isExpired(deadline: string | null): boolean {
  return Boolean(deadline && Number.isFinite(new Date(deadline).getTime()) && new Date(deadline).getTime() < Date.now());
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ message: "Non autorisé." }, { status: 401 });

  try {
    const { offers, sources } = await collectPublicJobSources();
    const supabase = adminClient();
    const now = new Date().toISOString();
    let created = 0, updated = 0, skipped = 0;

    for (const offer of offers) {
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
            website: null,
            logoUrl: null,
          }).select("id").single();
          if (createdCompany.error) throw new Error(createdCompany.error.message);
          companyId = createdCompany.data.id;
        }
      }

      const existing = await supabase.from("Job")
        .select("id,contentHash,createdAt")
        .eq("sourceKey", offer.sourceKey)
        .eq("externalId", offer.externalId)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);

      const contact = offer.applicationProfile;
      const applicationReady = Boolean(contact.applicationEmail || contact.applicationPhone);
      const source = offer.sourceKey === "MINAJOBS" ? "MinaJobs" : "JobInfoCamer";
      const payload = {
        title: offer.title,
        description: offer.description,
        language: "fr",
        location: offer.location,
        contractType: offer.contractType,
        source,
        sourceUrl: offer.sourceUrl,
        sourceKey: offer.sourceKey,
        externalId: offer.externalId,
        contentHash: offer.contentHash,
        sourcePublishedAt: offer.publishedAt,
        lastSeenAt: now,
        isActive: !isExpired(offer.deadline),
        deadline: offer.deadline,
        applicationReady,
        applicationProfile: contact,
        applicationCheckedAt: now,
        aiProcessed: false,
        aiProcessedAt: null,
        companyId,
        updatedAt: now,
      };

      if (existing.data?.id) {
        if (existing.data.contentHash === offer.contentHash && !companyId) {
          const touch = await supabase.from("Job").update({
            lastSeenAt: now,
            isActive: !isExpired(offer.deadline),
            applicationReady,
            applicationProfile: contact,
            applicationCheckedAt: now,
            updatedAt: now,
          }).eq("id", existing.data.id);
          if (touch.error) throw new Error(touch.error.message);
        } else {
          const update = await supabase.from("Job").update(payload).eq("id", existing.data.id);
          if (update.error) throw new Error(update.error.message);
        }
        updated++;
      } else {
        const id = crypto.randomUUID();
        const insert = await supabase.from("Job").insert({
          id,
          createdAt: now,
          ...payload,
        });
        if (insert.error) throw new Error(insert.error.message);
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "free-public-sources",
      sources,
      discovered: offers.length,
      created,
      updated,
      skipped,
      ranAt: now,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Import impossible." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
