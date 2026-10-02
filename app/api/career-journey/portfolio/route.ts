import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateJourney } from "@/lib/careerJourney";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrCreateJourney(request);
    const [portfolio, evidence] = await Promise.all([
      ctx.supabase.from("CareerPortfolioItem").select("*").eq("userId", ctx.user.id).order("createdAt", { ascending: false }),
      ctx.supabase.from("CareerEvidence").select("*").eq("userId", ctx.user.id).order("createdAt", { ascending: false }),
    ]);
    if (portfolio.error) throw new Error(portfolio.error.message);
    if (evidence.error) throw new Error(evidence.error.message);
    return NextResponse.json({ ok: true, portfolio: portfolio.data ?? [], evidence: evidence.data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible de charger le portfolio." }, { status: error?.status ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ctx = await getOrCreateJourney(request);

    if (body.action === "EVIDENCE") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return NextResponse.json({ message: "title requis." }, { status: 400 });
      const provenance = ["DECLARED","DOCUMENTED","AI_EVALUATED","CONVERGENT"].includes(body.provenance) ? body.provenance : "DECLARED";
      const type = ["DECLARATION","DOCUMENT","PORTFOLIO","PROJECT","EXPERIENCE","ASSESSMENT","FEEDBACK"].includes(body.type) ? body.type : "DECLARATION";
      const { data, error } = await ctx.supabase.from("CareerEvidence").insert({
        id: crypto.randomUUID(), userId: ctx.user.id, missionId: body.missionId || null, assessmentId: body.assessmentId || null,
        portfolioId: body.portfolioId || null, type, provenance, title,
        description: typeof body.description === "string" ? body.description.trim() : null,
        sourceUrl: body.sourceUrl || null, storageUrl: body.storageUrl || null,
        verified: Boolean(body.verified && provenance !== "DECLARED"),
        acceptedByUser: Boolean(body.acceptedByUser), metadata: body.metadata ?? null,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, evidence: data }, { status: 201 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ message: "title requis." }, { status: 400 });
    const { data, error } = await ctx.supabase.from("CareerPortfolioItem").insert({
      id: crypto.randomUUID(), userId: ctx.user.id, title,
      role: body.role || null, objective: body.objective || null, actions: body.actions || null,
      result: body.result || null, contribution: body.contribution || null,
      technologies: Array.isArray(body.technologies) ? body.technologies.filter((x: any) => typeof x === "string").slice(0, 30) : [],
      provenance: "DECLARED", acceptedByUser: false, visibleOnCv: false, visibleOnPortfolio: false, sourceUrl: body.sourceUrl || null,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, portfolioItem: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible d'enregistrer le portfolio." }, { status: error?.status ?? 500 });
  }
}
