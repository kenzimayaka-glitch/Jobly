import { NextRequest, NextResponse } from "next/server";
import { getOrCreateJourney } from "@/lib/careerJourney";
import { getCareerJourneyEntitlements } from "@/lib/careerJourneyEntitlements";
import { assessCareer } from "@/lib/careerEngine";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrCreateJourney(request);
    const entitlements = await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id);
    if (!entitlements.canCareerRadar) return NextResponse.json({ message: "Career Radar est disponible à partir de Premium.", requiredPlan: "PREMIUM" }, { status: 403 });

    const assessment = assessCareer({
      experiences: ctx.context.experiences,
      skills: ctx.context.skills,
      education: ctx.context.education,
      targetRole: ctx.journey.targetRole ?? ctx.context.profile?.targetRoles?.[0] ?? null,
    });
    const target = (ctx.journey.targetRole ?? ctx.context.profile?.targetRoles?.[0] ?? "").toLowerCase();
    const { data: jobs, error } = await ctx.supabase.from("Job").select("id,title,location,contractType,lastSeenAt,createdAt").eq("isActive", true).order("lastSeenAt", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    const relevant = target ? (jobs ?? []).filter((job: any) => String(job.title || "").toLowerCase().includes(target) || target.split(/s+/).some((w) => w.length > 3 && String(job.title || "").toLowerCase().includes(w))) : [];
    const titleCounts = new Map<string, number>();
    for (const job of relevant) titleCounts.set(job.title, (titleCounts.get(job.title) ?? 0) + 1);
    const observedTitles = [...titleCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([title,count])=>({title,count}));
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      methodology: "Signaux observés dans les offres JOBLY actuellement accessibles; ce radar n'est pas une prédiction.",
      targetRole: ctx.journey.targetRole ?? ctx.context.profile?.targetRoles?.[0] ?? null,
      observedOfferCount: relevant.length,
      observedTitles,
      readiness: assessment.readiness,
      gaps: assessment.gaps,
      missingData: ctx.context.profile ? [] : ["profil"],
      caveats: ["La couverture des offres varie selon les sources.", "Les tendances observées ne garantissent ni disponibilité future ni recrutement."],
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible de charger Career Radar." }, { status: error?.status ?? 500 });
  }
}
