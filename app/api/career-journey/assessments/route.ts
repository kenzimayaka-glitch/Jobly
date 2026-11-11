import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getJourneyReadOnly, getOrCreateJourney, sanitizeAssessmentAnswers } from "@/lib/careerJourney";
import { getCareerJourneyEntitlements } from "@/lib/careerJourneyEntitlements";

const formats = new Set(["MCQ","CASE","ROLEPLAY","PRACTICAL","ORAL","PORTFOLIO"]);

async function rollbackAssessmentAttempt(args: {
  supabase: any;
  userId: string;
  assessment: any;
  attemptId: string;
  restoreAssessment: boolean;
}) {
  const failures: string[] = [];
  if (args.restoreAssessment) {
    const { error } = await args.supabase.from("CareerCompetencyAssessment").update({
      score: args.assessment.score,
      resultSummary: args.assessment.resultSummary,
      dimensions: args.assessment.dimensions,
      limitations: args.assessment.limitations,
    }).eq("id", args.assessment.id).eq("userId", args.userId);
    if (error) failures.push(`restauration de l'évaluation : ${error.message}`);
  }
  const { error: deleteError } = await args.supabase.from("CareerCompetencyAttempt")
    .delete().eq("id", args.attemptId).eq("userId", args.userId);
  if (deleteError) failures.push(`suppression de la tentative partielle : ${deleteError.message}`);
  return failures;
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getJourneyReadOnly(request);
    if (!ctx.journey) return NextResponse.json({ ok: true, assessments: [] });
    const { data, error } = await ctx.supabase.from("CareerCompetencyAssessment").select("*, CareerCompetencyAttempt(*)").eq("userId", ctx.user.id).eq("journeyId", ctx.journey.id).order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, assessments: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible de charger les évaluations." }, { status: error?.status ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ctx = await getOrCreateJourney(request);

    if (body.action === "ATTEMPT") {
      if (typeof body.assessmentId !== "string") return NextResponse.json({ message: "assessmentId requis." }, { status: 400 });
      const { data: assessment, error: lookupError } = await ctx.supabase.from("CareerCompetencyAssessment").select("*").eq("id", body.assessmentId).eq("userId", ctx.user.id).maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (!assessment) return NextResponse.json({ message: "Évaluation introuvable." }, { status: 404 });

      const { data: last, error: lastAttemptError } = await ctx.supabase.from("CareerCompetencyAttempt").select("attemptNumber").eq("assessmentId", assessment.id).order("attemptNumber", { ascending: false }).limit(1).maybeSingle();
      if (lastAttemptError) throw new Error(`Impossible de déterminer le numéro de tentative : ${lastAttemptError.message}`);
      const attemptNumber = (last?.attemptNumber ?? 0) + 1;
      const score = body.score == null ? null : Math.max(0, Math.min(100, Math.round(Number(body.score))));
      const answers = sanitizeAssessmentAnswers(body.answers);
      const feedback = body.feedback && typeof body.feedback === "object" ? body.feedback : {
        evaluated: assessment.competency,
        limitation: "Ce résultat porte uniquement sur cet exercice et ne constitue pas une certification officielle.",
      };
      const { data, error } = await ctx.supabase.from("CareerCompetencyAttempt").insert({
        id: crypto.randomUUID(), userId: ctx.user.id, assessmentId: assessment.id,
        attemptNumber, answers, score, feedback, completedAt: body.completed === false ? null : new Date().toISOString(),
      }).select("*").single();
      if (error) throw new Error(error.message);

      let evidenceId: string | null = null;
      if (score !== null) {
        const { data: updatedAssessment, error: updateAssessmentError } = await ctx.supabase
          .from("CareerCompetencyAssessment")
          .update({
            score, resultSummary: typeof body.resultSummary === "string" ? body.resultSummary.trim() : "Évaluation réalisée sur cet exercice.",
            dimensions: body.dimensions ?? null,
            limitations: ["Résultat limité aux conditions de l'exercice.", "Ne constitue pas une certification officielle."],
          })
          .eq("id", assessment.id)
          .eq("userId", ctx.user.id)
          .select("id")
          .maybeSingle();
        if (updateAssessmentError || !updatedAssessment) {
          const reason = updateAssessmentError?.message ?? "aucun enregistrement modifié";
          const rollbackFailures = await rollbackAssessmentAttempt({
            supabase: ctx.supabase, userId: ctx.user.id, assessment, attemptId: data.id, restoreAssessment: false,
          });
          throw new Error(`Impossible de sauvegarder le résultat de l'évaluation : ${reason}.${rollbackFailures.length ? ` Retour arrière incomplet : ${rollbackFailures.join("; ")}` : " Tentative partielle supprimée."}`);
        }

        const { data: evidence, error: evidenceError } = await ctx.supabase.from("CareerEvidence").insert({
          id: crypto.randomUUID(), userId: ctx.user.id, assessmentId: assessment.id,
          type: "ASSESSMENT", provenance: "AI_EVALUATED",
          title: `Évaluation — ${assessment.competency}`,
          description: typeof body.resultSummary === "string" ? body.resultSummary.trim() : "Résultat d'une évaluation facultative.",
          acceptedByUser: Boolean(body.acceptedByUser),
          metadata: { score, attemptNumber, format: assessment.format },
        }).select("id").single();
        if (evidenceError || !evidence) {
          const reason = evidenceError?.message ?? "aucune preuve retournée";
          const rollbackFailures = await rollbackAssessmentAttempt({
            supabase: ctx.supabase, userId: ctx.user.id, assessment, attemptId: data.id, restoreAssessment: true,
          });
          throw new Error(`Impossible de sauvegarder la preuve d'évaluation : ${reason}.${rollbackFailures.length ? ` Retour arrière incomplet : ${rollbackFailures.join("; ")}` : " Résultat et tentative annulés."}`);
        }
        evidenceId = evidence.id;
      }
      return NextResponse.json({ ok: true, attempt: data, evidenceId, note: "Le test reste facultatif et ne bloque ni le profil ni la candidature." });
    }

    const entitlements = await getCareerJourneyEntitlements(ctx.supabase, ctx.user.id);
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
    if (entitlements.assessmentsPerMonth !== Number.POSITIVE_INFINITY) {
      const { count } = await ctx.supabase.from("CareerCompetencyAssessment").select("id", { count: "exact", head: true }).eq("userId", ctx.user.id).gte("createdAt", monthStart.toISOString());
      if ((count ?? 0) >= entitlements.assessmentsPerMonth) return NextResponse.json({ message: "Le quota mensuel d’évaluations est atteint.", limit: entitlements.assessmentsPerMonth, plan: entitlements.plan }, { status: 403 });
    }
    const competency = typeof body.competency === "string" ? body.competency.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const objective = typeof body.objective === "string" ? body.objective.trim() : "";
    const format = typeof body.format === "string" ? body.format.toUpperCase() : "MCQ";
    if (!competency || !title || !objective || !formats.has(format)) {
      return NextResponse.json({ message: "competency, title, objective et un format valide sont requis." }, { status: 400 });
    }

    if (body.adaptive !== false && !entitlements.canAdaptiveAssessments) return NextResponse.json({ message: "Les évaluations adaptatives sont disponibles à partir de Premium.", requiredPlan: "PREMIUM" }, { status: 403 });
    const questions = Array.isArray(body.questions) ? body.questions.slice(0, 20).map((q: any) => ({
      prompt: typeof q?.prompt === "string" ? q.prompt.slice(0, 2000) : "",
      choices: Array.isArray(q?.choices) ? q.choices.filter((x: any) => typeof x === "string").slice(0, 4) : [],
      allowMultiple: Boolean(q?.allowMultiple),
      hasOther: true,
      voiceAllowed: body.voiceAllowed !== false,
    })).filter((q: any) => q.prompt) : [];

    const { data, error } = await ctx.supabase.from("CareerCompetencyAssessment").insert({
      id: crypto.randomUUID(), userId: ctx.user.id, journeyId: ctx.journey.id,
      competency, format, title, objective, adaptive: body.adaptive !== false, optional: true,
      conditions: { questions, voiceAllowed: body.voiceAllowed !== false },
    }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, assessment: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message ?? "Impossible d'enregistrer l'évaluation." }, { status: error?.status ?? 500 });
  }
}
