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
