import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateJourney, generateJourneyRecommendations } from "@/lib/careerJourney";
import { getCareerJourneyEntitlements } from "@/lib/careerJourneyEntitlements";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrCreateJourney(request);
    return NextResponse.json({
      ok: true,
      journey: ctx.journey,
      goals: ctx.goals,
      missions: ctx.missions,
      recommendations: ctx.recommendations,
      scenarios: ctx.scenarios,
      reviews: ctx.reviews,
      evidence: (await ctx.supabase.from("CareerEvidence").select("*").eq("userId", ctx.user.id).order("createdAt", { ascending: false }).limit(50)).data ?? [],
      portfolio: (await ctx.supabase.from("CareerPortfolioItem").select("*").eq("userId", ctx.user.id).order("createdAt", { ascending: false }).limit(20)).data ?? [],
      entitlements: await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id),
      profileContext: {
        targetRoles: ctx.context.profile?.targetRoles ?? [],
        preferredSectors: ctx.context.profile?.preferredSectors ?? [],
        targetCities: ctx.context.profile?.targetCities ?? [],
        remotePreference: ctx.context.profile?.remotePreference ?? "INDIFFERENT",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible de charger Career Journey." }, { status: error?.status ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ctx = await getOrCreateJourney(request);
    const journeyPatch: Record<string, unknown> = {};
    for (const key of ["targetRole","targetDescription","targetHorizonMonths","consentFollowUp","reviewFrequency","status"]) {
      if (body[key] !== undefined) journeyPatch[key] = body[key];
    }
    if (journeyPatch.targetHorizonMonths !== undefined) {
      journeyPatch.targetHorizonMonths = Math.max(1, Math.min(60, Number(journeyPatch.targetHorizonMonths)));
    }
    if (journeyPatch.consentFollowUp !== undefined) journeyPatch.consentFollowUp = Boolean(journeyPatch.consentFollowUp);
    if (Object.keys(journeyPatch).length) {
      const { data, error } = await ctx.supabase.from("CareerJourney").update({ ...journeyPatch, updatedAt: new Date().toISOString() }).eq("id", ctx.journey.id).eq("userId", ctx.user.id).select("*").single();
      if (error) throw new Error(error.message);
      ctx.journey = data;
    }

    if (body.action === "CREATE_REVIEW") {
      const entitlements = await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id);
      if (!entitlements.canPeriodicReview) return NextResponse.json({ message: "La revue périodique est disponible à partir de Start.", requiredPlan: "START" }, { status: 403 });
      if (!ctx.journey.consentFollowUp || ctx.journey.reviewFrequency === "OFF") return NextResponse.json({ message: "La revue périodique nécessite le consentement de suivi et une fréquence active." }, { status: 400 });
      const end = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - (ctx.journey.reviewFrequency === "WEEKLY" ? 7 : 30));
      const completed = ctx.missions.filter((m: any) => m.status === "COMPLETED" && new Date(m.updatedAt) >= start).length;
      const pending = ctx.missions.filter((m: any) => ["PROPOSED","ACCEPTED","IN_PROGRESS","DEFERRED"].includes(m.status)).length;
      const { data, error } = await ctx.supabase.from("CareerReview").insert({
        id: crypto.randomUUID(), userId: ctx.user.id, journeyId: ctx.journey.id,
        frequency: ctx.journey.reviewFrequency, periodStart: start.toISOString(), periodEnd: end.toISOString(),
        summary: `Revue ${ctx.journey.reviewFrequency === "WEEKLY" ? "hebdomadaire" : "mensuelle"} : ${completed} mission(s) terminée(s), ${pending} en attente.`,
        completedMissions: completed, pendingMissions: pending,
        readinessBefore: ctx.journey.latestReadiness, readinessAfter: ctx.journey.latestReadiness,
        nextPriorities: ctx.journey.latestSnapshot?.gaps ?? [],
      }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, review: data });
    }

    if (body.action === "REASSESS" || body.action === "RECOMMEND") {
      const result = await generateJourneyRecommendations(ctx);
      return NextResponse.json({ ok: true, journey: ctx.journey, assessment: result.assessment, recommendations: result.created });
    }

    if (body.action === "CREATE_GOAL") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return NextResponse.json({ message: "Le titre de l'objectif est requis." }, { status: 400 });
      const { data, error } = await ctx.supabase.from("CareerGoal").insert({
        id: crypto.randomUUID(), userId: ctx.user.id, journeyId: ctx.journey.id, title,
        description: typeof body.description === "string" ? body.description.trim() : null,
        horizonMonths: body.horizonMonths == null ? null : Math.max(1, Math.min(60, Number(body.horizonMonths))),
        priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0,
        constraints: body.constraints ?? null, successSignals: body.successSignals ?? null,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, goal: data }, { status: 201 });
    }

    if (body.action === "CREATE_MISSION") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const objective = typeof body.objective === "string" ? body.objective.trim() : "";
      if (!title || !objective) return NextResponse.json({ message: "Le titre et l'objectif de la mission sont requis." }, { status: 400 });
      const entitlements = await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id);
      const activeCount = ctx.missions.filter((m: any) => ["PROPOSED","ACCEPTED","IN_PROGRESS","DEFERRED"].includes(m.status)).length;
      if (activeCount >= entitlements.maxActiveMissions) return NextResponse.json({ message: "Quota de missions actives atteint.", requiredPlan: entitlements.plan === "FREE" ? "START" : "PREMIUM" }, { status: 403 });
      const performance = body.performance && typeof body.performance === "object" ? body.performance : null;
      const steps = Array.isArray(body.steps) ? body.steps.slice(0, 10) : [];
      const expectedEvidence = Array.isArray(body.expectedEvidence) ? body.expectedEvidence.slice(0, 10) : [];
      const { data, error } = await ctx.supabase.from("CareerMission").insert({
        id: crypto.randomUUID(), userId: ctx.user.id, journeyId: ctx.journey.id,
        goalId: body.goalId ?? null, recommendationId: body.recommendationId ?? null,
        title, objective, description: typeof body.description === "string" ? body.description.trim() : objective,
        gapTarget: typeof body.gapTarget === "string" ? body.gapTarget.trim() : null,
        steps: performance ? { performance, steps } : steps,
        expectedResult: typeof body.expectedResult === "string" ? body.expectedResult.trim() : null,
        expectedEvidence: JSON.stringify(expectedEvidence.length ? expectedEvidence : ["Un résultat réel", "Une preuve de terrain", "Un élément quantifiable"]),
        dueAt: body.dueAt ?? null, followUpAt: body.followUpAt ?? null,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mission: data }, { status: 201 });
    }

    if (body.action === "UPDATE_MISSION") {
      const { updateMission } = await import("@/lib/careerJourney");
      const missionId = typeof body.missionId === "string" ? body.missionId : "";
      if (!missionId) return NextResponse.json({ message: "missionId requis." }, { status: 400 });
      const result = await updateMission(ctx.supabase, ctx.user.id, missionId, body.missionAction, {
        progress: body.progress, note: body.note, response: body.response, dueAt: body.dueAt, followUpAt: body.followUpAt,
      });
      return NextResponse.json({ ok: true, mission: result });
    }

    if (body.action === "ADD_EVIDENCE") {
      const missionId = typeof body.missionId === "string" ? body.missionId : null;
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return NextResponse.json({ message: "Le titre de la preuve est requis." }, { status: 400 });
      if (missionId) {
        const owned = ctx.missions.find((m: any) => m.id === missionId);
        if (!owned) return NextResponse.json({ message: "Mission introuvable." }, { status: 404 });
      }
      const allowed = new Set(["DECLARATION","DOCUMENT","PORTFOLIO","PROJECT","EXPERIENCE","ASSESSMENT","FEEDBACK"]);
      const type = allowed.has(body.type) ? body.type : "DECLARATION";
      const metadata = {
        terrainKind: typeof body.terrainKind === "string" ? body.terrainKind.slice(0, 40) : "NOTE",
        metric: typeof body.metric === "string" ? body.metric.trim().slice(0, 200) : null,
        value: typeof body.value === "number" ? body.value : null,
        unit: typeof body.unit === "string" ? body.unit.slice(0, 30) : null,
        occurredAt: body.occurredAt ?? null,
        source: typeof body.source === "string" ? body.source.trim().slice(0, 500) : null,
      };
      const verified = body.verified === true;
      const { data, error } = await ctx.supabase.from("CareerEvidence").insert({
        id: crypto.randomUUID(), userId: ctx.user.id, missionId,
        type, provenance: body.provenance && ["DECLARED","DOCUMENTED","AI_EVALUATED","CONVERGENT"].includes(body.provenance) ? body.provenance : "DECLARED",
        title, description: typeof body.description === "string" ? body.description.trim() : null,
        sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : null,
        storageUrl: typeof body.storageUrl === "string" ? body.storageUrl.trim() : null,
        verified, acceptedByUser: body.acceptedByUser !== false, metadata,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, evidence: data }, { status: 201 });
    }

    if (body.action === "CREATE_PORTFOLIO_ITEM") {
      const entitlements = await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id);
      if (!entitlements.canAdvancedPortfolio) return NextResponse.json({ message: "Le portfolio avancé est disponible à partir de Premium.", requiredPlan: "PREMIUM" }, { status: 403 });
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return NextResponse.json({ message: "Le titre du cas est requis." }, { status: 400 });
      const { data, error } = await ctx.supabase.from("CareerPortfolioItem").insert({
        id: crypto.randomUUID(), userId: ctx.user.id, title,
        role: typeof body.role === "string" ? body.role.trim() : null,
        objective: typeof body.objective === "string" ? body.objective.trim() : null,
        actions: typeof body.actions === "string" ? body.actions.trim() : null,
        result: typeof body.result === "string" ? body.result.trim() : null,
        contribution: typeof body.contribution === "string" ? body.contribution.trim() : null,
        technologies: Array.isArray(body.technologies) ? body.technologies.slice(0, 12) : [],
        provenance: body.provenance && ["DECLARED","DOCUMENTED","AI_EVALUATED","CONVERGENT"].includes(body.provenance) ? body.provenance : "DECLARED",
        acceptedByUser: body.acceptedByUser !== false, visibleOnCv: body.visibleOnCv === true, visibleOnPortfolio: body.visibleOnPortfolio === true,
        sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : null,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, portfolioItem: data }, { status: 201 });
    }

    if (body.action === "QUANTIFY_EVIDENCE") {
      const { quantifyCareerEvidence } = await import("@/lib/careerJourney");
      const ids = Array.isArray(body.evidenceIds) ? body.evidenceIds.filter((id: unknown) => typeof id === "string").slice(0, 20) : [];
      const { data: evidence, error } = await ctx.supabase.from("CareerEvidence").select("*").eq("userId", ctx.user.id).in("id", ids);
      if (error) throw new Error(error.message);
      const normalized = (evidence ?? []).map((e: any) => ({ kind: e.metadata?.terrainKind ?? e.type, title: e.title, description: e.description, source: e.metadata?.source, metric: e.metadata?.metric, value: e.metadata?.value, unit: e.metadata?.unit, verified: e.verified }));
      const quantified = quantifyCareerEvidence({ action: typeof body.actionLabel === "string" ? body.actionLabel : "Réalisation professionnelle", context: body.context, evidence: normalized });
      return NextResponse.json({ ok: true, quantified });
    }

    if (body.action === "CREATE_SCENARIO") {
      const entitlements = await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id);
      if (!entitlements.canScenarioSimulation) return NextResponse.json({ message: "La simulation de trajectoire avancée est disponible à partir de Premium.", requiredPlan: "PREMIUM" }, { status: 403 });
      const targetRole = typeof body.targetRole === "string" ? body.targetRole.trim() : "";
      if (!targetRole) return NextResponse.json({ message: "Le rôle cible est requis." }, { status: 400 });
      const { data, error } = await ctx.supabase.from("CareerPathScenario").insert({
        id: crypto.randomUUID(), journeyId: ctx.journey.id, title: body.title?.trim() || `Scénario — ${targetRole}`,
        targetRole, assumptions: body.assumptions ?? null, gaps: body.gaps ?? null, steps: body.steps ?? null, constraints: body.constraints ?? null,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, scenario: data }, { status: 201 });
    }

    return NextResponse.json({ ok: true, journey: ctx.journey });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible d'enregistrer Career Journey." }, { status: error?.status ?? 500 });
  }
}
