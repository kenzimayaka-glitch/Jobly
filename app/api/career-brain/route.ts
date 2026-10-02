import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { buildJiaContext } from "@/lib/jiaContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Career Brain is a computed orchestration surface over Career Journey 360.
 * It creates no parallel career state and writes nothing to the Career* domain.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const result = await buildJiaContext(sb, user.id, {
      operation: "CAREER_BRAIN",
      input: { source: "api/career-brain" },
    });

    if (result.error || !result.context) {
      return NextResponse.json({
        ok: true,
        available: false,
        message: result.error || "Career Brain indisponible.",
      });
    }

    return NextResponse.json({
      ok: true,
      available: true,
      generatedAt: new Date().toISOString(),
      architecture: "Career Journey 360 — Architecture B",
      sourceOfTruth: "CareerJourney",
      context: {
        careerTwin: result.context.careerBrain.careerTwin,
        journey: result.context.careerBrain.journey,
        goals: result.context.careerBrain.goals,
        missions: result.context.careerBrain.missions,
        recommendations: result.context.careerBrain.recommendations,
        evidence: result.context.careerBrain.evidence,
        portfolio: result.context.careerBrain.portfolio,
        assessments: result.context.careerBrain.assessments,
        scenarios: result.context.careerBrain.scenarios,
        reviews: result.context.careerBrain.reviews,
        mobilityRequests: result.context.careerBrain.mobilityRequests,
        actionRuns: result.context.careerBrain.actionRuns,
        applicationOutcomes: result.context.careerBrain.applicationOutcomes,
        unavailableModules: result.context.careerBrain.unavailableModules,
        profile: result.context.profile,
        skills: result.context.skills,
        experiences: result.context.experiences,
        behavior: result.context.behavior,
      },
      policy: {
        mode: "computed-read",
        createsParallelState: false,
        autonomousExternalAction: false,
        userDecisionRequiredForActions: true,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Career Brain indisponible.",
    }, { status: 500 });
  }
}
