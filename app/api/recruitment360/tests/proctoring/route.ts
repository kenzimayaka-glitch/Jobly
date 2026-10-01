import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const s = adminClient();
    const u = await ensureUser(s, auth);
    const body = await req.json();
    if (!body.sessionId || !Array.isArray(body.events)) {
      return NextResponse.json({ message: "SESSION_EVENTS_REQUIRED" }, { status: 400 });
    }
    if (body.events.length > 100) {
      return NextResponse.json({ message: "TOO_MANY_EVENTS" }, { status: 413 });
    }
    const safeEvents = body.events.slice(0, 100).map((e: any) => ({
      event: String(e.event || "UNKNOWN").slice(0, 80),
      metadata: e.metadata && typeof e.metadata === "object" ? e.metadata : {},
      occurredAt: typeof e.occurredAt === "string" ? e.occurredAt : new Date().toISOString(),
    }));
    const { data, error } = await s.rpc("recruitment360_lot8_record_events", {
      p_session_id: body.sessionId,
      p_actor_user_id: u.id,
      p_events: safeEvents,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ inserted: data ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}
