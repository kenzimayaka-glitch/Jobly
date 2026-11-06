import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (String(user.role || "").toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Accès administrateur requis." }, { status: 403 });
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-admin-program-list",
      identity: user.id,
      accountWindows: [{ limit: 20, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      ipWindows: [{ limit: 40, windowSeconds: 60 }, { limit: 400, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data, error } = await db.from("MobilityProgram")
      .select("id,institutionId,code,name,status,budgetTotal,currency,commitmentReference,commitmentEvidenceUrl,commitmentVerifiedAt,createdAt")
      .order("createdAt", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return NextResponse.json({ programs: data || [] }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Registre des programmes indisponible." }, { status: 500 });
  }
}
