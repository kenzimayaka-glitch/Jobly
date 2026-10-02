import type { CareerBrainContext } from "@/lib/careerBrain";

export type CareerOsOpportunity = {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  relevance: number;
  reasons: string[];
};

export type CareerOsSnapshot = {
  architecture: "Career Journey 360 — Architecture B";
  sourceOfTruth: "CareerJourney";
  careerTwin: {
    currentLevel: number | null;
    targetLevel: number | null;
    targetRole: string | null;
    readiness: number | null;
    readinessBand: "UNKNOWN" | "BUILDING" | "NEAR_READY" | "READY";
    trajectory: "ADVANCING" | "STABLE" | "GAP_TO_CLOSE" | "UNKNOWN";
    evidenceStrength: number;
    evidenceCount: number;
    verifiedEvidenceCount: number;
    activeGoals: number;
    activeMissions: number;
    completedMissions: number;
  };
  gps: {
    destination: string | null;
    gaps: string[];
    nextBestAction: string | null;
    route: Array<{ order: number; type: "GAP" | "MISSION" | "EVIDENCE" | "REVIEW"; label: string }>;
  };
  readiness: {
    score: number | null;
    band: "UNKNOWN" | "BUILDING" | "NEAR_READY" | "READY";
    blockers: string[];
    evidenceStrength: number;
  };
  opportunity: {
    targetRole: string | null;
    opportunities: CareerOsOpportunity[];
    decision: "EXPLORE" | "PREPARE" | "APPLY" | "UNKNOWN";
  };
  learning: {
    priorities: Array<{ gap: string; missionType: "LEARN" | "BUILD_LEARNING_PLAN" | "START_INTERVIEW_COACHING"; rationale: string }>;
  };
  mobility: {
    requests: Array<Record<string, unknown>>;
    activeCount: number;
    latestStatus: string | null;
  };
  companion: {
    nextBestAction: string | null;
    proposalRequired: boolean;
    autonomousExternalAction: false;
  };
  outcomeLoop: {
    applications: CareerBrainContext["applicationOutcomes"];
    latestOutcome: string | null;
    latestReviewAt: string | null;
    reassessmentAvailable: boolean;
  };
  integrity: {
    parallelCareerState: false;
    generatedAt: string;
  };
};

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

const readinessBand = (score: number | null): CareerOsSnapshot["readiness"]["band"] => {
  if (typeof score !== "number") return "UNKNOWN";
  if (score >= 80) return "READY";
  if (score >= 60) return "NEAR_READY";
  return "BUILDING";
};

const trajectory = (twin: CareerBrainContext["careerTwin"]): CareerOsSnapshot["careerTwin"]["trajectory"] => {
  if (twin.currentLevel == null || twin.targetLevel == null) return "UNKNOWN";
  if (twin.currentLevel < twin.targetLevel && twin.gaps.length) return "GAP_TO_CLOSE";
  if (twin.currentLevel < twin.targetLevel) return "ADVANCING";
  return "STABLE";
};

const roleTokens = (role: string | null) =>
  normalize(role).split(/[^a-z0-9à-ÿ]+/i).filter((token) => token.length >= 3);

const scoreOpportunity = (
  targetRole: string | null,
  gapCount: number,
  job: Record<string, unknown>,
): CareerOsOpportunity => {
  const title = String(job.title ?? "");
  const location = job.location == null ? null : String(job.location);
  const contractType = job.contractType == null ? null : String(job.contractType);
  const tokens = roleTokens(targetRole);
  const haystack = normalize(title);
  const matched = tokens.filter((token) => haystack.includes(token));
  const roleScore = tokens.length ? Math.round((matched.length / tokens.length) * 70) : 25;
  const readinessPenalty = Math.min(20, gapCount * 4);
  const relevance = Math.max(0, Math.min(100, roleScore + 30 - readinessPenalty));
  const reasons = matched.length
    ? ["Correspondance avec le rôle cible : " + matched.slice(0, 4).join(", ")]
    : ["Opportunité conservée comme signal d'exploration ; correspondance de rôle limitée."];
  if (gapCount) reasons.push(gapCount + " écart(s) restent à fermer avant une candidature pleinement préparée.");
  return { id: String(job.id), title, location, contractType, relevance, reasons };
};

export function buildCareerOsSnapshot(
  brain: CareerBrainContext,
  input: { jobs?: Array<Record<string, unknown>> },
): CareerOsSnapshot {
  const twin = brain.careerTwin;
  const band = readinessBand(twin.readiness);
  const verifiedEvidenceCount = brain.evidence.filter(
    (e) => Boolean(e.verified) || ["DOCUMENTED", "AI_EVALUATED", "CONVERGENT"].includes(String(e.provenance)),
  ).length;

  const route: CareerOsSnapshot["gps"]["route"] = twin.gaps.slice(0, 5).map((gap, index) => ({
    order: index + 1,
    type: "GAP",
    label: gap,
  }));
  if (twin.nextBestAction) route.push({ order: route.length + 1, type: "MISSION", label: twin.nextBestAction });
  if (brain.evidence.length === 0) route.push({ order: route.length + 1, type: "EVIDENCE", label: "Ajouter une preuve vérifiable liée au prochain objectif." });
  if (brain.reviews.length === 0) route.push({ order: route.length + 1, type: "REVIEW", label: "Planifier une revue de progression après les prochaines missions." });

  const opportunities = (input.jobs ?? [])
    .filter((job) => Boolean(job.id) && Boolean(job.title))
    .map((job) => scoreOpportunity(twin.targetRole, twin.gaps.length, job))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10);

  const decision: CareerOsSnapshot["opportunity"]["decision"] =
    twin.readiness == null ? "UNKNOWN" :
    twin.readiness >= 80 && twin.gaps.length === 0 ? "APPLY" :
    twin.readiness >= 60 ? "PREPARE" : "EXPLORE";

  const priorities = twin.gaps.slice(0, 5).map((gap) => ({
    gap,
    missionType: /interview|entretien|pitch|présentation/i.test(gap)
      ? "START_INTERVIEW_COACHING" as const
      : /compétence|skill|formation|certif/i.test(gap)
        ? "BUILD_LEARNING_PLAN" as const
        : "LEARN" as const,
    rationale: "Priorité dérivée du gap déjà calculé par Career Journey ; aucune nouvelle évaluation d'état n'est créée.",
  }));

  const mobility = brain.mobilityRequests;
  const latestMobility = mobility[0];
  const activeMobility = mobility.filter((r) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(normalize(r.status).toUpperCase())).length;

  return {
    architecture: "Career Journey 360 — Architecture B",
    sourceOfTruth: "CareerJourney",
    careerTwin: {
      currentLevel: twin.currentLevel,
      targetLevel: twin.targetLevel,
      targetRole: twin.targetRole,
      readiness: twin.readiness,
      readinessBand: band,
      trajectory: trajectory(twin),
      evidenceStrength: twin.evidenceStrength,
      evidenceCount: brain.evidence.length,
      verifiedEvidenceCount,
      activeGoals: twin.activeGoals,
      activeMissions: twin.activeMissions,
      completedMissions: twin.completedMissions,
    },
    gps: { destination: twin.targetRole, gaps: twin.gaps, nextBestAction: twin.nextBestAction, route },
    readiness: { score: twin.readiness, band, blockers: twin.gaps.slice(0, 5), evidenceStrength: twin.evidenceStrength },
    opportunity: { targetRole: twin.targetRole, opportunities, decision },
    learning: { priorities },
    mobility: {
      requests: mobility,
      activeCount: activeMobility,
      latestStatus: latestMobility ? String(latestMobility.status ?? "") : null,
    },
    companion: {
      nextBestAction: twin.nextBestAction,
      proposalRequired: Boolean(twin.nextBestAction),
      autonomousExternalAction: false,
    },
    outcomeLoop: {
      applications: brain.applicationOutcomes,
      latestOutcome: twin.latestOutcome,
      latestReviewAt: twin.latestReviewAt,
      reassessmentAvailable: Boolean(brain.journey),
    },
    integrity: { parallelCareerState: false, generatedAt: new Date().toISOString() },
  };
}
