import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 7;
const MAX_AUDIT_ROWS = 100;
const MAX_PUBLIC_EVENTS = 20;
const VERIFIED_RECRUITER_ROLES = ["OWNER", "HR", "MANAGER"] as const;

/**
 * Publish only anonymous hire moments explicitly transitioned to HIRED by a
 * recruiter owner/HR/manager and still in the current HIRED state.
 * Candidate self-reported transitions are intentionally excluded.
 */
export async function GET() {
  try {
    const supabase = adminClient();
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60_000).toISOString();

    const { data: auditRows, error: auditError } = await supabase
      .from("RecruitmentAuditLog")
      .select("id,recruitmentId,applicationId,actorUserId,createdAt")
      .eq("action", "STATE_TRANSITION")
      .eq("toState", "HIRED")
      .gte("createdAt", since)
      .order("createdAt", { ascending: false })
      .limit(MAX_AUDIT_ROWS);
    if (auditError) throw auditError;

    if (!auditRows?.length) {
      return NextResponse.json(
        { events: [], updatedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=5" } },
      );
    }

    const applicationIds = [...new Set(auditRows.map((row) => row.applicationId).filter(Boolean))];
    const recruitmentIds = [...new Set(auditRows.map((row) => row.recruitmentId).filter(Boolean))];

    const [stateResult, roleResult] = await Promise.all([
      supabase
        .from("RecruitmentApplicationState")
        .select("applicationId")
        .in("applicationId", applicationIds)
        .eq("currentState", "HIRED"),
      supabase
        .from("RecruitmentRole")
        .select("recruitmentId,userId,role")
        .in("recruitmentId", recruitmentIds)
        .in("role", [...VERIFIED_RECRUITER_ROLES]),
    ]);
    if (stateResult.error) throw stateResult.error;
    if (roleResult.error) throw roleResult.error;

    const stillHired = new Set((stateResult.data ?? []).map((row) => row.applicationId));
    const recruiterActors = new Set(
      (roleResult.data ?? []).map((row) => `${row.recruitmentId}:${row.userId}`),
    );

    const events = auditRows
      .filter((row) =>
        stillHired.has(row.applicationId) &&
        recruiterActors.has(`${row.recruitmentId}:${row.actorUserId}`),
      )
      .slice(0, MAX_PUBLIC_EVENTS)
      .map((row) => ({
        id: createHash("sha256").update(String(row.id)).digest("hex").slice(0, 32),
        occurredAt: row.createdAt,
      }));

    return NextResponse.json(
      { events, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=5" } },
    );
  } catch {
    return NextResponse.json(
      { events: [], message: "Les événements de réussite sont momentanément indisponibles." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
