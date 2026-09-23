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
    const checks = await Promise.all([
      supabase.from("JiaMemory").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("JiaIntelligenceTrace").select("id", { count: "exact", head: true }).eq("userId", user.id),
      supabase.from("JiaEvent").select("id", { count: "exact", head: true }).eq("userId", user.id),
    ]);
    const failed = checks.find((check) => check.error);
    if (failed?.error) throw new Error(failed.error.message);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      capabilities: { memory: true, reasoning: true, events: true, webResearch: true, guardedActions: true, outcomes: true },
      counts: { memory: checks[0].count ?? 0, traces: checks[1].count ?? 0, events: checks[2].count ?? 0 },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Diagnostic J’IA indisponible." }, { status: 500 });
  }
}
