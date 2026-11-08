import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { pickLiveWinsMessage, type LiveWinsRole } from "@/lib/jobly-live-wins-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401, headers: PRIVATE_NO_STORE });
    }

    const db = adminClient();
    const user = await ensureUser(db, auth);
    const role = String(user.role || "").toUpperCase();

    if (role !== "TALENT" && role !== "RECRUITER") {
      return NextResponse.json({ role: null, events: [] }, { headers: PRIVATE_NO_STORE });
    }

    const liveWinsRole = role as LiveWinsRole;
    return NextResponse.json({
      role: liveWinsRole,
      events: [{
        eventKey: randomUUID(),
        occurredAt: Date.now(),
        message: pickLiveWinsMessage(liveWinsRole),
      }],
    }, { headers: PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "Les notifications Live Wins sont momentanément indisponibles." },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }
}
