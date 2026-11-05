import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthUser } from "@/lib/server-auth";
import { resolveEffectivePublicationDate } from "@/supabase/functions/_shared/job-freshness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAMPUS_TERMS = /\b(stage|stagiaire|intern(ship)?|alternance|apprenti(e)?|apprentissage|job étudiant|emploi étudiant|student job|graduate program|young graduate|trainee|service civique|volontariat)\b/i;

function isCampusOpportunity(values: unknown[]) {
  return CAMPUS_TERMS.test(values.filter(Boolean).map(String).join(" "));
}

function campusCategory(values: unknown[]) {
  const text = values.filter(Boolean).map(String).join(" ").toLowerCase();
  if (/alternance|apprent|apprentissage/.test(text)) return "ALTERNANCE";
  if (/stage|stagiaire|intern|trainee/.test(text)) return "INTERNSHIP";
  return "STUDENT_JOB";
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Session requise." }, { status: 401 });

  const db = adminClient();
  const jobs: any[] = [];

  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("Job")
      .select("*")
      .eq("isActive", true)
      .order("createdAt", { ascending: false })
      .range(from, from + 499);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const batch = data || [];
    jobs.push(...batch);
    if (batch.length < 500) break;
  }

  const candidates = jobs.filter((job) =>
    isCampusOpportunity([job.title, job.contractType, job.opportunityType, job.tags, job.description]),
  );

  const firstHarvestByJob = new Map<string, string>();
  const missingPublicationIds = candidates
    .filter((job) => !job.sourcePublishedAt)
    .map((job) => job.id as string)
    .filter(Boolean);

  for (let index = 0; index < missingPublicationIds.length; index += 300) {
    const ids = missingPublicationIds.slice(index, index + 300);
    const { data, error } = await db
      .from("JobHarvestCapture")
      .select("jobId,discoveredAt")
      .in("jobId", ids)
      .order("discoveredAt", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of data || []) {
      if (row.jobId && !firstHarvestByJob.has(row.jobId)) firstHarvestByJob.set(row.jobId, row.discoveredAt);
    }
  }

  const now = new Date().toISOString();
  const visibleCandidates = candidates.filter((job) =>
    resolveEffectivePublicationDate({
      sourcePublishedAt: job.sourcePublishedAt || null,
      firstHarvestAt: firstHarvestByJob.get(job.id) || null,
      createdAt: job.createdAt || null,
      deadline: job.deadline || null,
      now,
    }).visible,
  );

  const companyIds = Array.from(new Set(visibleCandidates.map((job) => job.companyId).filter(Boolean)));
  const companiesById = new Map<string, { name: string; logoUrl: string | null }>();
  for (let index = 0; index < companyIds.length; index += 300) {
    const { data, error } = await db
      .from("Company")
      .select("id,name,logoUrl")
      .in("id", companyIds.slice(index, index + 300));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const company of data || []) companiesById.set(company.id, { name: company.name, logoUrl: company.logoUrl });
  }

  const discovery = visibleCandidates.map((job) => {
    const freshness = resolveEffectivePublicationDate({
      sourcePublishedAt: job.sourcePublishedAt || null,
      firstHarvestAt: firstHarvestByJob.get(job.id) || null,
      createdAt: job.createdAt || null,
      deadline: job.deadline || null,
      now,
    });
    const company = job.companyId ? companiesById.get(job.companyId) : null;
    const category = campusCategory([job.title, job.contractType, job.opportunityType, job.tags]);
    return {
      id: job.id,
      source: "discovery",
      title: job.title,
      description: String(job.description || "").slice(0, 260),
      companyName: company?.name || null,
      logoUrl: company?.logoUrl || null,
      location: job.location || null,
      contractType: job.contractType || null,
      remoteMode: job.remoteMode || null,
      publishedAt: freshness.effectivePublishedAt,
      publicationDateEstimated: freshness.publicationDateEstimated,
      category,
      href: `/jobs/${encodeURIComponent(job.id)}?source=discovery`,
    };
  });

  const recruiterCutoff = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recruiterJobs, error: recruiterError } = await db
    .from("RecruiterJob")
    .select("id,title,companyName,description,location,contract,status,createdAt,sourceUrl,applicationReady")
    .eq("status", "published")
    .eq("applicationReady", true)
    .gte("createdAt", recruiterCutoff)
    .order("createdAt", { ascending: false })
    .limit(500);
  if (recruiterError) return NextResponse.json({ error: recruiterError.message }, { status: 500 });

  const recruiter = (recruiterJobs || [])
    .filter((job) => isCampusOpportunity([job.title, job.contract, job.description]))
    .map((job) => ({
      id: job.id,
      source: "recruiter",
      title: job.title,
      description: String(job.description || "").slice(0, 260),
      companyName: job.companyName || null,
      logoUrl: null,
      location: job.location || null,
      contractType: job.contract || null,
      remoteMode: null,
      publishedAt: job.createdAt,
      publicationDateEstimated: false,
      category: campusCategory([job.title, job.contract, job.description]),
      href: `/jobs/${encodeURIComponent(job.id)}?source=recruiter`,
    }));

  const items = [...discovery, ...recruiter]
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, 100);

  return NextResponse.json({
    items,
    count: items.length,
    totalAvailable: discovery.length + recruiter.length,
    generatedAt: now,
    source: "Jobly active opportunity feed",
  });
}
