import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { enforceApiRateLimit } from "@/lib/server-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only bridge from Career Journey evidence/portfolio into CV Studio.
 * It never writes CV content and only returns user-accepted evidence.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const limited = await enforceApiRateLimit(request, sb, {
      scope: "talent-cv-career-evidence",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 400, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const [evidenceResult, portfolioResult] = await Promise.all([
      sb.from("CareerEvidence")
        .select("id,missionId,assessmentId,portfolioId,type,provenance,title,description,sourceUrl,storageUrl,verified,acceptedByUser,metadata,createdAt")
        .eq("userId", user.id)
        .eq("acceptedByUser", true)
        .eq("verified", true)
        .order("createdAt", { ascending: false })
        .limit(50),
      sb.from("CareerPortfolioItem")
        .select("id,title,role,objective,actions,result,contribution,technologies,provenance,acceptedByUser,visibleOnCv,sourceUrl,createdAt")
        .eq("userId", user.id)
        .eq("acceptedByUser", true)
        .eq("visibleOnCv", true)
        .order("createdAt", { ascending: false })
        .limit(30),
    ]);

    if (evidenceResult.error) throw new Error(evidenceResult.error.message);
    if (portfolioResult.error) throw new Error(portfolioResult.error.message);

    return NextResponse.json({
      ok: true,
      sourceOfTruth: "CareerJourney",
      evidence: evidenceResult.data ?? [],
      portfolio: portfolioResult.data ?? [],
      policy: {
        readOnly: true,
        verifiedOnly: true,
        userAcceptedOnly: true,
        cvStudioMustRequestExplicitSelectionBeforePersisting: true,
      },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Impossible de charger les preuves Career Journey.",
    }, { status: 500 });
  }
}
