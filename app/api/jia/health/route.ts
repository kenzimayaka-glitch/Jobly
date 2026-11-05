import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ ok: false, message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const [
      memory,
      traces,
      events,
      cognitiveMemory,
      beliefs,
      predictions,
      predictionOutcomes,
      reflections,
      actionRuns,
      proposedActionRuns,
      verifiedActionRuns,
      verifiedOutcomeRuns,
      failedActionRuns,
      selfState,
    ] = await Promise.all([
      supabase.from("JiaMemory").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("JiaIntelligenceTrace").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("JiaEvent").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("jia_memory").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_beliefs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_predictions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_predictions").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("outcome", "is", null),
      supabase.from("jia_reflections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_action_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_action_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "PROPOSED"),
      supabase.from("jia_action_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "VERIFIED"),
      supabase.from("jia_action_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "VERIFIED").eq("outcome->>isOutcome", "true"),
      supabase.from("jia_action_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "FAILED"),
      supabase.from("jia_self_state").select("state").eq("user_id", user.id).maybeSingle(),
    ]);

    const checks = [
      memory, traces, events, cognitiveMemory, beliefs, predictions,
      predictionOutcomes, reflections, actionRuns, proposedActionRuns,
      verifiedActionRuns, verifiedOutcomeRuns, failedActionRuns, selfState,
    ];
    const failed = checks.find((check) => check.error);
    if (failed?.error) throw new Error(failed.error.message);

    const counts = {
      memory: memory.count ?? 0,
      cognitiveMemory: cognitiveMemory.count ?? 0,
      beliefs: beliefs.count ?? 0,
      traces: traces.count ?? 0,
      events: events.count ?? 0,
      predictions: predictions.count ?? 0,
      predictionOutcomes: predictionOutcomes.count ?? 0,
      reflections: reflections.count ?? 0,
      actionRuns: actionRuns.count ?? 0,
      proposedActionRuns: proposedActionRuns.count ?? 0,
      verifiedActionRuns: verifiedActionRuns.count ?? 0,
      verifiedOutcomeRuns: verifiedOutcomeRuns.count ?? 0,
      failedActionRuns: failedActionRuns.count ?? 0,
    };
    const outcomeLoopObserved = counts.verifiedOutcomeRuns > 0 || counts.predictionOutcomes > 0;
    const internetAvailable = Boolean(
      (selfState.data?.state as Record<string, unknown> | null)?.internetAvailable,
    );

    return NextResponse.json({
      ok: true,
      authenticated: true,
      capabilities: {
        memory: true,
        reasoning: true,
        events: true,
        webResearch: true,
        guardedActions: true,
        outcomes: outcomeLoopObserved,
      },
      counts,
      runtimeEvidence: {
        internetAvailable,
        outcomeLoopObserved,
        observed: {
          memory: counts.memory + counts.cognitiveMemory > 0,
          reasoning: counts.beliefs > 0 || counts.traces > 0,
          events: counts.events > 0,
          webResearch: internetAvailable,
          guardedActions: counts.actionRuns > 0,
          outcomes: outcomeLoopObserved,
        },
        explanation: outcomeLoopObserved
          ? "Au moins une action vérifiée ou une issue de prédiction est persistée."
          : "Aucune action vérifiée ni issue de prédiction n'est encore persistée pour ce compte.",
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Diagnostic J’IA indisponible." }, { status: 500 });
  }
}
