import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

const INCIDENTS: Record<string, { kind: string; severity: string }> = {
  TAB_HIDDEN: { kind: "TAB_SWITCH", severity: "WARNING" },
  WINDOW_BLUR: { kind: "WINDOW_BLUR", severity: "INFO" },
  FULLSCREEN_EXIT: { kind: "FULLSCREEN_EXIT", severity: "WARNING" },
  MULTIPLE_FACES: { kind: "MULTIPLE_FACES", severity: "HIGH" },
  CAMERA_DENIED: { kind: "CAMERA_DENIED", severity: "WARNING" },
  CAMERA_UNAVAILABLE: { kind: "CAMERA_UNAVAILABLE", severity: "INFO" },
};

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const s = adminClient();
    const u = await ensureUser(s, auth);
    const body = await req.json();
    if (!body.sessionId || !Array.isArray(body.events)) return NextResponse.json({ message: "SESSION_EVENTS_REQUIRED" }, { status: 400 });
    if (body.events.length > 100) return NextResponse.json({ message: "TOO_MANY_EVENTS" }, { status: 413 });
    const safeEvents = body.events.slice(0, 100).map((e: any) => ({
      event: String(e.event || "UNKNOWN").slice(0, 80),
      metadata: e.metadata && typeof e.metadata === "object" ? e.metadata : {},
      occurredAt: typeof e.occurredAt === "string" ? e.occurredAt : new Date().toISOString(),
    }));
    const { data, error } = await s.rpc("recruitment360_lot8_record_events", {
      p_session_id: body.sessionId, p_actor_user_id: u.id, p_events: safeEvents,
    });
    if (error) throw new Error(error.message);
    const incidents = safeEvents.filter((e: any) => INCIDENTS[e.event]).map((e: any) => ({
      sessionId: body.sessionId, kind: INCIDENTS[e.event].kind, severity: INCIDENTS[e.event].severity,
      details: { event: e.event, metadata: e.metadata, occurredAt: e.occurredAt },
    }));
    if (incidents.length) {
      const { error: incidentError } = await s.from("RecruitmentTestIncident").insert(incidents);
      if (incidentError) throw new Error(incidentError.message);
    }
    return NextResponse.json({ inserted: data ?? 0, incidents: incidents.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}
