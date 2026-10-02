import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateJourney, updateMission } from "@/lib/careerJourney";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrCreateJourney(request);
    return NextResponse.json({ ok: true, missions: ctx.missions });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible de charger les missions." }, { status: error?.status ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ctx = await getOrCreateJourney(request);

    if (body.action === "UPDATE") {
      if (typeof body.missionId !== "string" || typeof body.missionAction !== "string") {
        return NextResponse.json({ message: "missionId et missionAction sont requis." }, { status: 400 });
      }
      const mission = await updateMission(ctx.supabase, ctx.user.id, body.missionId, body.missionAction, body);
      return NextResponse.json({ ok: true, mission });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const objective = typeof body.objective === "string" ? body.objective.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!title || !objective || !description) {
      return NextResponse.json({ message: "title, objective et description sont requis." }, { status: 400 });
    }

    const status = body.status === "ACCEPTED" ? "ACCEPTED" : "PROPOSED";
    const acceptedAt = status === "ACCEPTED" ? new Date().toISOString() : null;
    const { data, error } = await ctx.supabase.from("CareerMission").insert({
      id: crypto.randomUUID(),
      userId: ctx.user.id,
      journeyId: ctx.journey.id,
      goalId: typeof body.goalId === "string" ? body.goalId : null,
      recommendationId: typeof body.recommendationId === "string" ? body.recommendationId : null,
      title, objective, description,
      gapTarget: typeof body.gapTarget === "string" ? body.gapTarget.trim() : null,
      steps: Array.isArray(body.steps) ? body.steps.slice(0, 10) : [],
      expectedResult: typeof body.expectedResult === "string" ? body.expectedResult.trim() : null,
      expectedEvidence: typeof body.expectedEvidence === "string" ? body.expectedEvidence.trim() : null,
      dueAt: body.dueAt || null,
      followUpAt: body.followUpAt || null,
      status,
      acceptedAt,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, mission: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible d'enregistrer la mission." }, { status: error?.status ?? 500 });
  }
}
