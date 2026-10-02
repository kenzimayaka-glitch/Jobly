import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getOrCreateJourney, generateJourneyRecommendations } from "@/lib/careerJourney";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrCreateJourney(request);
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 30);

    const [applicationsResult, actionRunsResult] = await Promise.all([
      ctx.supabase.from("Application").select("id,status,updatedAt,createdAt,interviewAt,submittedAt").eq("userId", ctx.user.id).order("updatedAt", { ascending: false }).limit(50),
      ctx.supabase.from("jia_action_runs").select("id,action,status,outcome,created_at,updated_at").eq("user_id", ctx.user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (applicationsResult.error) throw new Error(applicationsResult.error.message);
    if (actionRunsResult.error) throw new Error(actionRunsResult.error.message);

    const applications = applicationsResult.data ?? [];
    const actionRuns = actionRunsResult.data ?? [];
    const before = typeof ctx.journey.latestReadiness === "number" ? ctx.journey.latestReadiness : null;

    const recentApplications = applications.filter((a: any) => {
      const at = new Date(a.updatedAt || a.createdAt).getTime();
      return Number.isFinite(at) && at >= start.getTime();
    });
    const latestApplication = applications[0] as any;
    const verifiedAction = actionRuns.find((r: any) => r.status === "VERIFIED") as any;
    const completed = ctx.missions.filter((m: any) => m.status === "COMPLETED" && new Date(m.updatedAt).getTime() >= start.getTime()).length;
    const pending = ctx.missions.filter((m: any) => ["PROPOSED", "ACCEPTED", "IN_PROGRESS", "DEFERRED"].includes(m.status)).length;

    const result = await generateJourneyRecommendations(ctx);
    const after = result.assessment.readiness;
    const outcomeSignals = [
      recentApplications.length ? `${recentApplications.length} candidature(s) actualisée(s)` : null,
      latestApplication?.status ? `dernière candidature : ${latestApplication.status}` : null,
      verifiedAction?.action ? `dernière action J’IA vérifiée : ${verifiedAction.action}` : null,
      completed ? `${completed} mission(s) terminée(s)` : null,
    ].filter(Boolean);

    const summary = outcomeSignals.length
      ? `Réévaluation basée sur les outcomes récents : ${outcomeSignals.join("; ")}.`
      : "Réévaluation basée sur l'état Career Journey et les données disponibles.";

    const review = await ctx.supabase.from("CareerReview").insert({
      id: crypto.randomUUID(),
      userId: ctx.user.id,
      journeyId: ctx.journey.id,
      frequency: ctx.journey.reviewFrequency,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summary,
      completedMissions: completed,
      pendingMissions: pending,
      readinessBefore: before,
      readinessAfter: after,
      nextPriorities: result.assessment.gaps,
    }).select("*").single();

    if (review.error) throw new Error(review.error.message);

    return NextResponse.json({
      ok: true,
      loop: "OUTCOME → REVIEW → REASSESSMENT",
      outcome: {
        applications: recentApplications.length,
        latestApplicationStatus: latestApplication?.status ?? null,
        verifiedJiaAction: verifiedAction?.action ?? null,
      },
      review: review.data,
      reassessment: {
        readinessBefore: before,
        readinessAfter: after,
        gaps: result.assessment.gaps,
        nextBestAction: result.assessment.nextBestAction,
        recommendations: result.created,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible de réévaluer le parcours." }, { status: error?.status ?? 500 });
  }
}
