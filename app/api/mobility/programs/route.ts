import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../lib/mobilityServer";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    await ensureUser(db, auth);
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
    return NextResponse.json({ programs });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Programmes Mobility indisponibles." }, { status: 500 });
  }
}
