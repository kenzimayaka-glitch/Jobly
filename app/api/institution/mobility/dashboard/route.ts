import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds } from "../../../../../lib/mobilityAccess";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ error: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!institutionIds.length) return NextResponse.json({ error: "Membre INSTITUTION_ADMIN actif requis." }, { status: 403 });

    const [{ data: institutions, error: institutionsError }, { data: programs, error: programsError }] = await Promise.all([
      db.from("Institution").select("id,name,city,type,active").in("id", institutionIds),
      db.from("MobilityProgram").select("id,institutionId,code,name,description,status,capacity,budgetTotal,currency,eligibilityRule,fundingModel,commitmentReference,commitmentEvidenceUrl,commitmentVerifiedAt,startsAt,endsAt").in("institutionId", institutionIds).order("createdAt", { ascending: false }),
    ]);
    if (institutionsError) throw new Error(institutionsError.message);
    if (programsError) throw new Error(programsError.message);
    const programIds = (programs || []).map((program: { id: string }) => program.id);
    const [{ data: allocations, error: allocationError }, { data: communications, error: communicationError }] = await Promise.all([
      programIds.length
        ? db.from("MobilityFundingAllocation").select("id,programId,mobilityRequestId,approvedAmount,currency,status,approvedAt,createdAt").in("programId", programIds).order("createdAt", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      db.from("InstitutionCommunication").select("id,institutionId,programId,eventType,status,createdAt,deliveredAt").in("institutionId", institutionIds).order("createdAt", { ascending: false }).limit(100),
    ]);
    if (allocationError) throw new Error(allocationError.message);
    if (communicationError) throw new Error(communicationError.message);
    const requestIds = [...new Set((allocations || []).map((row: { mobilityRequestId: string }) => row.mobilityRequestId))];
    const { data: requests, error: requestError } = requestIds.length
      ? await db.from("MobilityRequest").select("id,departCity,arriveeCity,costTotal,status,eligibilityStatus,eligibilityBurdenPercent,createdAt").in("id", requestIds)
      : { data: [], error: null };
    if (requestError) throw new Error(requestError.message);
    const eligible = (requests || []).filter((row: { eligibilityStatus: string }) => row.eligibilityStatus === "ELIGIBLE").length;
    const committed = (allocations || []).filter((row: { status: string }) => !["REJECTED", "CANCELLED"].includes(row.status))
      .reduce((sum: number, row: { approvedAmount: number }) => sum + Number(row.approvedAmount || 0), 0);
    return NextResponse.json({
      user: { displayName: user.displayName, email: user.email, role: user.role },
      institutions: institutions || [],
      programs: programs || [],
      requests: requests || [],
      allocations: allocations || [],
      communications: communications || [],
      kpis: {
        programCount: (programs || []).length,
        requestCount: (requests || []).length,
        eligibleCount: eligible,
        allocationCount: (allocations || []).length,
        committedAmount: committed,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tableau institutionnel indisponible." }, { status: 500 });
  }
}
