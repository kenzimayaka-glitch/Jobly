import crypto from "node:crypto";
import { assessCareer } from "./careerEngine";
import { adminClient, ensureUser, getAuthUser } from "./server-auth";
import type { NextRequest } from "next/server";

export type JourneyAction =
  | "ACCEPT" | "REFUSE" | "DEFER" | "COMPLETE" | "ABANDON" | "REASSESS";

function cleanString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function loadContext(supabase: any, userId: string) {
  const [profile, experiences, skills, education, applications] = await Promise.all([
    supabase.from("Profile").select("*").eq("userId", userId).maybeSingle(),
    supabase.from("Experience").select("*").eq("userId", userId).order("startDate", { ascending: false }),
    supabase.from("Skill").select("*").eq("userId", userId).order("name"),
    supabase.from("Education").select("*").eq("userId", userId).order("startDate", { ascending: false }),
    supabase.from("Application").select("id,status,createdAt,updatedAt").eq("userId", userId).order("updatedAt", { ascending: false }).limit(100),
  ]);
  for (const r of [profile, experiences, skills, education, applications]) if (r.error) throw new Error(r.error.message);
  return {
    profile: profile.data,
    experiences: experiences.data ?? [],
    skills: skills.data ?? [],
    education: education.data ?? [],
    applications: applications.data ?? [],
  };
}

export async function getOrCreateJourney(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) throw Object.assign(new Error("Session requise."), { status: 401 });
  const supabase = adminClient();
  const user = await ensureUser(supabase, authUser);
  let { data: journey, error } = await supabase.from("CareerJourney").select("*").eq("userId", user.id).maybeSingle();
  if (error) throw new Error(error.message);

  const context = await loadContext(supabase, user.id);
  if (!journey) {
    const assessment = assessCareer({
      experiences: context.experiences,
      skills: context.skills,
      education: context.education,
      targetRole: context.profile?.targetRoles?.[0] ?? null,
    });
    const snapshot = {
      readiness: assessment.readiness,
      currentLevel: assessment.currentLevel,
      targetLevel: assessment.targetLevel,
      dimensions: assessment.dimensions,
      gaps: assessment.gaps,
      nextBestAction: assessment.nextBestAction,
      missingData: [
        ...(context.experiences.length ? [] : ["expériences"]),
        ...(context.skills.length ? [] : ["compétences"]),
        ...(context.education.length ? [] : ["formation"]),
        ...(context.profile?.targetRoles?.length ? [] : ["objectif professionnel"]),
      ],
    };
    const inserted = await supabase.from("CareerJourney").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      targetRole: context.profile?.targetRoles?.[0] ?? null,
      baselineReadiness: assessment.readiness,
      latestReadiness: assessment.readiness,
      baselineSnapshot: snapshot,
      latestSnapshot: snapshot,
    }).select("*").single();
    if (inserted.error) throw new Error(inserted.error.message);
    journey = inserted.data;
  }

  const [goals, missions, recommendations, scenarios, reviews] = await Promise.all([
    supabase.from("CareerGoal").select("*").eq("journeyId", journey.id).order("priority"),
    supabase.from("CareerMission").select("*").eq("journeyId", journey.id).order("createdAt", { ascending: false }),
    supabase.from("CareerRecommendation").select("*").eq("journeyId", journey.id).order("createdAt", { ascending: false }).limit(10),
    supabase.from("CareerPathScenario").select("*").eq("journeyId", journey.id).order("createdAt", { ascending: false }),
    supabase.from("CareerReview").select("*").eq("journeyId", journey.id).order("periodEnd", { ascending: false }).limit(5),
  ]);
  for (const r of [goals, missions, recommendations, scenarios, reviews]) if (r.error) throw new Error(r.error.message);

  return { supabase, user, context, journey, goals: goals.data ?? [], missions: missions.data ?? [], recommendations: recommendations.data ?? [], scenarios: scenarios.data ?? [], reviews: reviews.data ?? [] };
}

export async function createRecommendation(supabase: any, userId: string, journeyId: string, input: {
  type: string; title: string; rationale: string; gap?: string | null; expectedOutcome?: string | null; goalId?: string | null; alternatives?: unknown; assumptions?: unknown; missingData?: unknown;
}) {
  const allowed = new Set(["APPLY","DEFER_APPLICATION","UPDATE_CV","LEARN","PRACTICE","PROJECT","PORTFOLIO","INTERVIEW_PREP","EXPLORE_PATH","REASSESS","READY_TO_APPLY"]);
  if (!allowed.has(input.type)) throw new Error("Type de recommandation invalide.");
  const row = {
    id: crypto.randomUUID(), userId, journeyId, goalId: input.goalId ?? null,
    type: input.type, title: input.title.trim(), rationale: input.rationale.trim(),
    gap: input.gap ?? null, expectedOutcome: input.expectedOutcome ?? null,
    alternatives: input.alternatives ?? [], assumptions: input.assumptions ?? [], missingData: input.missingData ?? [],
  };
  const { data, error } = await supabase.from("CareerRecommendation").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function generateJourneyRecommendations(ctx: Awaited<ReturnType<typeof getOrCreateJourney>>) {
  const { supabase, user, context, journey } = ctx;
  const assessment = assessCareer({
    experiences: context.experiences,
    skills: context.skills,
    education: context.education,
    targetRole: journey.targetRole ?? context.profile?.targetRoles?.[0] ?? null,
  });
  const missingData = [
    ...(context.experiences.length ? [] : ["expériences"]),
    ...(context.skills.length ? [] : ["compétences"]),
    ...(context.education.length ? [] : ["formation"]),
    ...(journey.targetRole ? [] : ["objectif professionnel"]),
  ];
  const created = [];
  if (assessment.gaps[0]) {
    created.push(await createRecommendation(supabase, user.id, journey.id, {
      type: assessment.readiness >= 70 ? "READY_TO_APPLY" : "PRACTICE",
      title: assessment.readiness >= 70 ? "Vérifier la préparation avant de postuler" : "Réduire l'écart prioritaire",
      rationale: assessment.nextBestAction,
      gap: assessment.gaps[0],
      expectedOutcome: "Obtenir un nouvel élément exploitable pour la prochaine réévaluation.",
      missingData,
      assumptions: ["Analyse fondée uniquement sur les informations actuellement disponibles."],
      alternatives: ["Mettre à jour le profil", "Explorer une autre trajectoire", "Postuler malgré l'incertitude"],
    }));
  } else {
    created.push(await createRecommendation(supabase, user.id, journey.id, {
      type: "READY_TO_APPLY",
      title: "Prêt à explorer des candidatures",
      rationale: "Les informations disponibles ne font pas apparaître d'écart critique dans l'analyse actuelle.",
      expectedOutcome: "Passer à la préparation de candidature ou d'entretien.",
      missingData,
      alternatives: ["Adapter le CV", "Préparer un entretien", "Explorer un autre objectif"],
    }));
  }
  await supabase.from("CareerJourney").update({
    latestReadiness: assessment.readiness,
    latestSnapshot: { readiness: assessment.readiness, currentLevel: assessment.currentLevel, targetLevel: assessment.targetLevel, dimensions: assessment.dimensions, gaps: assessment.gaps, nextBestAction: assessment.nextBestAction, missingData },
    lastReevaluatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).eq("id", journey.id).eq("userId", user.id);
  return { assessment, created };
}

export async function updateMission(supabase: any, userId: string, missionId: string, action: JourneyAction, patch: any = {}) {
  const { data: mission, error } = await supabase.from("CareerMission").select("*").eq("id", missionId).eq("userId", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!mission) throw Object.assign(new Error("Mission introuvable."), { status: 404 });

  const now = new Date().toISOString();
  const statusByAction: Record<JourneyAction, string | undefined> = {
    ACCEPT: "ACCEPTED", REFUSE: "ABANDONED", DEFER: "DEFERRED", COMPLETE: "COMPLETED", ABANDON: "ABANDONED", REASSESS: undefined,
  };
  const status = statusByAction[action];
  const progress = patch.progress == null ? mission.progressPercent : clamp(Number(patch.progress));
  const data: any = { progressPercent: progress, updatedAt: now };
  if (status) data.status = status;
  if (action === "ACCEPT") data.acceptedAt = now;
  if (action === "DEFER") data.deferredAt = now;
  if (action === "COMPLETE") { data.completedAt = now; data.progressPercent = 100; }
  if (action === "ABANDON" || action === "REFUSE") data.abandonedAt = now;
  if (patch.dueAt !== undefined) data.dueAt = patch.dueAt || null;
  if (patch.followUpAt !== undefined) data.followUpAt = patch.followUpAt || null;
  const updated = await supabase.from("CareerMission").update(data).eq("id", missionId).eq("userId", userId).select("*").single();
  if (updated.error) throw new Error(updated.error.message);
  await supabase.from("CareerMissionUpdate").insert({
    id: crypto.randomUUID(), missionId, status: status ?? null, progress: data.progressPercent,
    note: cleanString(patch.note), response: patch.response ?? null,
  });
  return updated.data;
}

export async function validateMissionOwnership(supabase: any, userId: string, missionId: string) {
  const { data, error } = await supabase.from("CareerMission").select("id,journeyId,goalId,status").eq("id", missionId).eq("userId", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw Object.assign(new Error("Mission introuvable."), { status: 404 });
  return data;
}

export function sanitizeAssessmentAnswers(input: unknown) {
  if (!input || typeof input !== "object") return {};
  const record = input as Record<string, unknown>;
  return Object.fromEntries(Object.entries(record).slice(0, 50).map(([key, value]) => {
    if (Array.isArray(value)) return [key, value.slice(0, 4)];
    if (typeof value === "string") return [key, value.slice(0, 4000)];
    if (typeof value === "number" || typeof value === "boolean") return [key, value];
    return [key, null];
  }));
}
