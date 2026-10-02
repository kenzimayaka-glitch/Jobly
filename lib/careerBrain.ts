import type { SupabaseClient } from "@supabase/supabase-js";

export type CareerBrainContext = {
  journey: Record<string, unknown> | null;
  goals: Array<Record<string, unknown>>;
  missions: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
  portfolio: Array<Record<string, unknown>>;
  assessments: Array<Record<string, unknown>>;
  scenarios: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  unavailableModules: string[];
  careerTwin: {
    currentLevel: number | null;
    targetLevel: number | null;
    readiness: number | null;
    targetRole: string | null;
    gaps: string[];
    nextBestAction: string | null;
    evidenceStrength: number;
    activeMissions: number;
    activeGoals: number;
    completedMissions: number;
    latestReviewAt: string | null;
    latestOutcome: string | null;
  };
};

const safeError = (error: unknown) => error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : "unavailable";

const rows = async (sb: SupabaseClient, table: string, userId: string, journeyId: string, orderBy?: string, limit?: number) => {
  let query = sb.from(table).select("*").eq("userId", userId).eq("journeyId", journeyId);
  if (orderBy) query = query.order(orderBy, { ascending: false });
  if (limit) query = query.limit(limit);
  const result = await query;
  if (result.error) throw new Error(safeError(result.error));
  return (result.data ?? []) as Array<Record<string, unknown>>;
};

export async function buildCareerBrainContext(sb: SupabaseClient, userId: string): Promise<CareerBrainContext> {
  const unavailableModules: string[] = [];
  const journeyResult = await sb.from("CareerJourney").select("*").eq("userId", userId).maybeSingle();

  if (journeyResult.error) {
    return {
      journey: null, goals: [], missions: [], recommendations: [], evidence: [], portfolio: [],
      assessments: [], scenarios: [], reviews: [], unavailableModules: ["CareerJourney"],
      careerTwin: {
        currentLevel: null, targetLevel: null, readiness: null, targetRole: null, gaps: [],
        nextBestAction: null, evidenceStrength: 0, activeMissions: 0, activeGoals: 0,
        completedMissions: 0, latestReviewAt: null, latestOutcome: null,
      },
    };
  }

  const journey = (journeyResult.data ?? null) as Record<string, unknown> | null;
  if (!journey) {
    return {
      journey: null, goals: [], missions: [], recommendations: [], evidence: [], portfolio: [],
      assessments: [], scenarios: [], reviews: [], unavailableModules: [],
      careerTwin: {
        currentLevel: null, targetLevel: null, readiness: null, targetRole: null, gaps: [],
        nextBestAction: null, evidenceStrength: 0, activeMissions: 0, activeGoals: 0,
        completedMissions: 0, latestReviewAt: null, latestOutcome: null,
      },
    };
  }

  const journeyId = String(journey.id);
  const load = async (label: string, table: string, orderBy?: string, limit?: number) => {
    try {
      return await rows(sb, table, userId, journeyId, orderBy, limit);
    } catch {
      unavailableModules.push(label);
      return [] as Array<Record<string, unknown>>;
    }
  };

  const [goals, missions, recommendations, evidence, portfolio, assessments, scenarios, reviews] = await Promise.all([
    load("goals", "CareerGoal", "updatedAt"),
    load("missions", "CareerMission", "createdAt"),
    load("recommendations", "CareerRecommendation", "createdAt", 20),
    load("evidence", "CareerEvidence", "createdAt", 100),
    load("portfolio", "CareerPortfolioItem", "createdAt", 50),
    load("assessments", "CareerCompetencyAssessment", "createdAt", 50),
    load("scenarios", "CareerPathScenario", "createdAt", 20),
    load("reviews", "CareerReview", "periodEnd", 10),
  ]);

  const snapshot = (journey.latestSnapshot && typeof journey.latestSnapshot === "object")
    ? journey.latestSnapshot as Record<string, unknown>
    : {};
  const gaps = Array.isArray(snapshot.gaps) ? snapshot.gaps.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
  const readiness = typeof journey.latestReadiness === "number" ? journey.latestReadiness : typeof snapshot.readiness === "number" ? Number(snapshot.readiness) : null;
  const currentLevel = typeof snapshot.currentLevel === "number" ? Number(snapshot.currentLevel) : null;
  const targetLevel = typeof snapshot.targetLevel === "number" ? Number(snapshot.targetLevel) : null;
  const nextBestAction = typeof snapshot.nextBestAction === "string" ? snapshot.nextBestAction : null;
  const targetRole = typeof journey.targetRole === "string" ? journey.targetRole : null;

  const activeMissions = missions.filter((m) => ["ACCEPTED", "IN_PROGRESS"].includes(String(m.status))).length;
  const completedMissions = missions.filter((m) => String(m.status) === "COMPLETED").length;
  const activeGoals = goals.filter((g) => !["COMPLETED", "ABANDONED"].includes(String(g.status))).length;
  const verifiedEvidence = evidence.filter((e) => Boolean(e.verified) || ["DOCUMENTED", "AI_EVALUATED", "CONVERGENT"].includes(String(e.provenance))).length;
  const evidenceStrength = evidence.length ? Math.round((verifiedEvidence / evidence.length) * 100) : 0;
  const latestReview = reviews[0] ?? null;

  return {
    journey, goals, missions, recommendations, evidence, portfolio, assessments, scenarios, reviews, unavailableModules,
    careerTwin: {
      currentLevel, targetLevel, readiness, targetRole, gaps, nextBestAction, evidenceStrength,
      activeMissions, activeGoals, completedMissions,
      latestReviewAt: typeof latestReview?.periodEnd === "string" ? latestReview.periodEnd : null,
      latestOutcome: typeof latestReview?.outcome === "string" ? latestReview.outcome : null,
    },
  };
}
