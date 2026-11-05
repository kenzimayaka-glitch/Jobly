import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (String(user.role || "").toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Accès administrateur requis." }, { status: 403 });
    const { data, error } = await db.from("MobilityProgram")
      .select("id,institutionId,code,name,status,budgetTotal,currency,commitmentReference,commitmentEvidenceUrl,commitmentVerifiedAt,createdAt")
      .order("createdAt", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return NextResponse.json({ programs: data || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Registre des programmes indisponible." }, { status: 500 });
  }
}
