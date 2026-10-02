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
  mobilityRequests: Array<Record<string, unknown>>;
  actionRuns: Array<Record<string, unknown>>;
  applicationOutcomes: { total: number; interviews: number; offers: number; rejections: number; pending: number };
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

const rows = async (sb: SupabaseClient, table: string, userId: string, journeyId: string, orderBy?: string, limit?: number, includeJourney = true) => {
  let query = sb.from(table).select("*").eq("userId", userId);
  if (includeJourney) query = query.eq("journeyId", journeyId);
  if (orderBy) query = query.order(orderBy, { ascending: false });
  if (limit) query = query.limit(limit);
  const result = await query;
  if (result.error) throw new Error(safeError(result.error));
  return (result.data ?? []) as Array<Record<string, unknown>>;
};

const emptyContext = (unavailableModules: string[] = []): CareerBrainContext => ({
  journey: null, goals: [], missions: [], recommendations: [], evidence: [], portfolio: [],
  assessments: [], scenarios: [], reviews: [], mobilityRequests: [], actionRuns: [],
  applicationOutcomes: { total: 0, interviews: 0, offers: 0, rejections: 0, pending: 0 },
  unavailableModules,
  careerTwin: {
    currentLevel: null, targetLevel: null, readiness: null, targetRole: null, gaps: [],
    nextBestAction: null, evidenceStrength: 0, activeMissions: 0, activeGoals: 0,
    completedMissions: 0, latestReviewAt: null, latestOutcome: null,
  },
});

export async function buildCareerBrainContext(sb: SupabaseClient, userId: string): Promise<CareerBrainContext> {
  const unavailableModules: string[] = [];
  const journeyResult = await sb.from("CareerJourney").select("*").eq("userId", userId).maybeSingle();

  if (journeyResult.error) return emptyContext(["CareerJourney"]);

  const journey = (journeyResult.data ?? null) as Record<string, unknown> | null;
  if (!journey) return emptyContext();

  const journeyId = String(journey.id);
  const load = async (label: string, table: string, orderBy?: string, limit?: number, includeJourney = true) => {
    try {
      return await rows(sb, table, userId, journeyId, orderBy, limit, includeJourney);
    } catch {
      unavailableModules.push(label);
      return [] as Array<Record<string, unknown>>;
    }
  };

  const [goals, missions, recommendations, evidence, portfolio, assessments, scenarios, reviews, mobilityRequests, actionRunsResult, applicationsResult] = await Promise.all([
    load("goals", "CareerGoal", "updatedAt"),
    load("missions", "CareerMission", "createdAt"),
    load("recommendations", "CareerRecommendation", "createdAt", 20),
    load("evidence", "CareerEvidence", "createdAt", 100),
    load("portfolio", "CareerPortfolioItem", "createdAt", 50, false),
    load("assessments", "CareerCompetencyAssessment", "createdAt", 50),
    load("scenarios", "CareerPathScenario", "createdAt", 20),
    load("reviews", "CareerReview", "periodEnd", 10),
    load("mobility", "MobilityRequest", "updatedAt", 5, false),
    sb.from("jia_action_runs").select("id,action,status,result,outcome,created_at,updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    sb.from("Application").select("id,status,updatedAt,createdAt,interviewAt,submittedAt").eq("userId", userId).order("updatedAt", { ascending: false }).limit(100),
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

  const actionRuns = actionRunsResult.error
    ? (unavailableModules.push("action-runs"), [] as Array<Record<string, unknown>>)
    : ((actionRunsResult.data ?? []) as Array<Record<string, unknown>>);
  const applications = applicationsResult.error
    ? (unavailableModules.push("applications"), [] as Array<Record<string, unknown>>)
    : ((applicationsResult.data ?? []) as Array<Record<string, unknown>>);

  const normalizedStatuses = applications.map((a) => String(a.status || "").toUpperCase());
  const applicationOutcomes = {
    total: applications.length,
    interviews: normalizedStatuses.filter((s) => s.includes("INTERVIEW") || Boolean(applications.find((a) => String(a.id) === String(a.id) && a.interviewAt))).length,
    offers: normalizedStatuses.filter((s) => s.includes("OFFER") || s.includes("HIRED") || s.includes("ACCEPTED")).length,
    rejections: normalizedStatuses.filter((s) => s.includes("REJECT") || s.includes("DECLIN")).length,
    pending: normalizedStatuses.filter((s) => !s.includes("INTERVIEW") && !s.includes("OFFER") && !s.includes("HIRED") && !s.includes("ACCEPTED") && !s.includes("REJECT") && !s.includes("DECLIN")).length,
  };

  const activeMissions = missions.filter((m) => ["ACCEPTED", "IN_PROGRESS"].includes(String(m.status))).length;
  const completedMissions = missions.filter((m) => String(m.status) === "COMPLETED").length;
  const activeGoals = goals.filter((g) => !["COMPLETED", "ABANDONED"].includes(String(g.status))).length;
  const verifiedEvidence = evidence.filter((e) => Boolean(e.verified) || ["DOCUMENTED", "AI_EVALUATED", "CONVERGENT"].includes(String(e.provenance))).length;
  const evidenceStrength = evidence.length ? Math.round((verifiedEvidence / evidence.length) * 100) : 0;
  const latestReview = reviews[0] ?? null;
  const latestApplication = applications[0] ?? null;
  const latestApplicationStatus = latestApplication ? String(latestApplication.status || "").toUpperCase() : null;
  const latestOutcome = latestApplicationStatus
    ? latestApplicationStatus
    : actionRuns[0]?.status === "VERIFIED"
      ? "J’IA_ACTION_VERIFIED"
      : null;

  return {
    journey, goals, missions, recommendations, evidence, portfolio, assessments, scenarios, reviews,
    mobilityRequests, actionRuns, applicationOutcomes, unavailableModules,
    careerTwin: {
      currentLevel, targetLevel, readiness, targetRole, gaps, nextBestAction, evidenceStrength,
      activeMissions, activeGoals, completedMissions,
      latestReviewAt: typeof latestReview?.periodEnd === "string" ? latestReview.periodEnd : null,
      latestOutcome,
    },
  };
}
