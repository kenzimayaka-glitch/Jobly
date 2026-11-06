import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (String(user.role || "").toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Accès administrateur requis." }, { status: 403 });
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-admin-funding-pending",
      identity: user.id,
      accountWindows: [{ limit: 20, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      ipWindows: [{ limit: 40, windowSeconds: 60 }, { limit: 400, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data, error } = await db.from("MobilityFundingTransaction")
      .select("id,allocationId,transactionType,amount,currency,provider,providerId,externalReference,status,evidenceUrl,createdAt,MobilityFundingAllocation(mobilityRequestId,approvedAmount,currency)")
      .eq("status", "PENDING_VERIFICATION")
      .order("createdAt", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return NextResponse.json({ transactions: data || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Transactions en attente indisponibles." }, { status: 500 });
  }
}
