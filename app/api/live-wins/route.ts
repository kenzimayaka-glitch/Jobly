import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { isEligibleLiveWin, LIVE_WINS_LOOKBACK_MS } from "@/lib/live-wins-eligibility";

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

    const cutoff = new Date(Date.now() - LIVE_WINS_LOOKBACK_MS).toISOString();
    const { data, error } = await db
      .from("Application")
      .select("id,userId,status,statusSource,updatedAt,recruiterJob:RecruiterJob!inner(recruiterUserId)")
      .eq("status", "OFFER")
      .eq("statusSource", "RECRUITER")
      .gte("updatedAt", cutoff)
      .neq("userId", user.id)
      .neq("recruiterJob.recruiterUserId", user.id)
      .order("updatedAt", { ascending: false })
      .limit(80);

    if (error) throw new Error("Live Wins query failed.");

    const now = Date.now();
    const events = (data || [])
      .filter((candidate: any) => isEligibleLiveWin(candidate, user.id, now))
      .map((candidate: any) => ({
        eventKey: createHash("sha256").update(String(candidate.id)).digest("hex").slice(0, 20),
        occurredAt: Date.parse(candidate.updatedAt),
      }));

    return NextResponse.json({ role, events }, { headers: PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "Les réussites récentes sont momentanément indisponibles." },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }
}
