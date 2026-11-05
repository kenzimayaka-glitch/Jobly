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
      reflections,
      actionRuns,
      selfState,
    ] = await Promise.all([
      supabase.from("JiaMemory").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("JiaIntelligenceTrace").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("JiaEvent").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("jia_memory").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_beliefs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_predictions").select("id,outcome", { count: "exact" }).eq("user_id", user.id).limit(1000),
      supabase.from("jia_reflections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jia_action_runs").select("id,status", { count: "exact" }).eq("user_id", user.id).limit(1000),
      supabase.from("jia_self_state").select("state").eq("user_id", user.id).maybeSingle(),
    ]);

    const failed = [memory, traces, events, cognitiveMemory, beliefs, predictions, reflections, actionRuns, selfState]
      .find((check) => check.error);
    if (failed?.error) throw new Error(failed.error.message);

    const verifiedActionRuns = (actionRuns.data ?? []).filter((run) => run.status === "VERIFIED").length;
    const predictionOutcomes = (predictions.data ?? []).filter((prediction) => prediction.outcome !== null).length;
    const outcomeLoopObserved = verifiedActionRuns > 0 || predictionOutcomes > 0;
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
      counts: {
        memory: memory.count ?? 0,
        cognitiveMemory: cognitiveMemory.count ?? 0,
        beliefs: beliefs.count ?? 0,
        traces: traces.count ?? 0,
        events: events.count ?? 0,
        predictions: predictions.count ?? predictions.data?.length ?? 0,
        predictionOutcomes,
        reflections: reflections.count ?? 0,
        actionRuns: actionRuns.count ?? actionRuns.data?.length ?? 0,
        verifiedActionRuns,
      },
      runtimeEvidence: {
        internetAvailable,
        outcomeLoopObserved,
        explanation: outcomeLoopObserved
          ? "Au moins une action vérifiée ou une prédiction évaluée est persistée."
          : "Aucune action vérifiée ni issue de prédiction n'est encore persistée pour ce compte.",
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Diagnostic J’IA indisponible." }, { status: 500 });
  }
}
