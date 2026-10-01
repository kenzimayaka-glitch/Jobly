import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const s = adminClient();
    const u = await ensureUser(s, auth);
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("SESSION_REQUIRED");
    const { data, error } = await s.rpc("recruitment360_lot8_finalize_signals", {
      p_session_id: sessionId,
      p_actor_user_id: u.id,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ signal: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}
