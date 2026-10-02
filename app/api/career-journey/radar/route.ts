import { NextRequest, NextResponse } from "next/server";
import { getOrCreateJourney } from "@/lib/careerJourney";
import { getCareerJourneyEntitlements } from "@/lib/careerJourneyEntitlements";
import { assessCareer } from "@/lib/careerEngine";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrCreateJourney(request);
    const entitlements = await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id);
    if (!entitlements.canCareerRadar) {
      return NextResponse.json({ message: "Career Radar est disponible à partir de Premium.", requiredPlan: "PREMIUM" }, { status: 403 });
    }

    const assessment = assessCareer({
      experiences: ctx.context.experiences,
      skills: ctx.context.skills,
      education: ctx.context.education,
      targetRole: ctx.journey.targetRole ?? ctx.context.profile?.targetRoles?.[0] ?? null,
    });

    const targetRole = ctx.journey.targetRole ?? ctx.context.profile?.targetRoles?.[0] ?? null;
    const target = String(targetRole || "").toLowerCase();

    const { data: jobs, error } = await ctx.supabase
      .from("Job")
      .select("id,title,location,contractType,lastSeenAt,createdAt")
      .eq("isActive", true)
      .order("lastSeenAt", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const relevant = target
      ? (jobs ?? []).filter((job: any) => String(job.title || "").toLowerCase().includes(target) || target.split(/\s+/).some((w: string) => w.length > 3 && String(job.title || "").toLowerCase().includes(w)))
      : [];

    const titleCounts = new Map<string, number>();
    for (const job of relevant) titleCounts.set(job.title, (titleCounts.get(job.title) ?? 0) + 1);
    const observedTitles = [...titleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([title, count]) => ({ title, count }));

    // Career Radar must reuse the exact adaptive matching feed instead of creating
    // a second scoring engine. /api/jobs is the canonical matching surface.
    const headers: HeadersInit = {};
    const cookie = request.headers.get("cookie");
    const authorization = request.headers.get("authorization");
    if (cookie) headers.cookie = cookie;
    if (authorization) headers.authorization = authorization;

    let topMatches: Array<Record<string, unknown>> = [];
    let matchingUnavailable = false;
    try {
      const matchingUrl = new URL("/api/jobs?limit=20", request.url);
      const matchingResponse = await fetch(matchingUrl, { headers, cache: "no-store" });
      if (!matchingResponse.ok) throw new Error(`matching_http_${matchingResponse.status}`);
      const matchingBody = await matchingResponse.json();
      topMatches = Array.isArray(matchingBody?.jobs)
        ? matchingBody.jobs.slice(0, 10).map((job: any) => ({
            id: job.id,
            source: job.source,
            title: job.title,
            location: job.location,
            contractType: job.contractType,
            remoteMode: job.remoteMode,
            matchPercent: job.matchPercent,
            matchConfidence: job.matchConfidence,
            matchBreakdown: job.matchBreakdown,
            applicationReady: job.applicationReady,
            publishedAt: job.publishedAt,
          }))
        : [];
    } catch {
      matchingUnavailable = true;
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      methodology: "Signaux observés dans les offres JOBLY actuellement accessibles; ce radar n'est pas une prédiction.",
      targetRole,
      observedOfferCount: relevant.length,
      observedTitles,
      readiness: assessment.readiness,
      gaps: assessment.gaps,
      topMatches,
      matching: {
        source: "/api/jobs",
        engine: "adaptiveMatch",
        threshold: 50,
        unavailable: matchingUnavailable,
      },
      missingData: ctx.context.profile ? [] : ["profil"],
      caveats: [
        "La couverture des offres varie selon les sources.",
        "Les tendances observées ne garantissent ni disponibilité future ni recrutement.",
        "Le score de matching est celui du moteur adaptatif existant; Career Radar ne le recalcule pas.",
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible de charger Career Radar." }, { status: error?.status ?? 500 });
  }
}
