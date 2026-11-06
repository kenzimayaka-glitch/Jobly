import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-program-directory",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 600, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const now = new Date();
    const { data, error } = await db.from("MobilityProgram")
      .select("id,institutionId,code,name,description,capacity,budgetTotal,currency,eligibilityRule,fundingModel,startsAt,endsAt,commitmentVerifiedAt")
      .eq("status", "ACTIVE")
      .not("commitmentVerifiedAt", "is", null)
      .eq("currency", "XAF")
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    const programs = (data || []).filter((program: any) => {
      const label = String(program.code || "") + " " + String(program.name || "");
      return !label.toUpperCase().includes("DEMO")
        && (!program.startsAt || new Date(program.startsAt) <= now)
        && (!program.endsAt || new Date(program.endsAt) >= now)
        && Number(program.budgetTotal || 0) > 0;
    });
    return NextResponse.json({ programs }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Programmes Mobility indisponibles." }, { status: 500 });
  }
}
