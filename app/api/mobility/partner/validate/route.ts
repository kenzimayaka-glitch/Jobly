import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds, institutionOwnsMobilityRequest } from "../../../../../lib/mobilityAccess";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 12 * 1024) return NextResponse.json({ message: "Validation de subvention trop volumineuse." }, { status: 413 });
    const limited = await enforceApiRateLimit(req, sb, {
      scope: "mobility-subsidy-validation",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }, { limit: 15, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId || "").trim();
    const percentage = Number(body.subventionPercent);

    if (!requestId) return NextResponse.json({ message: "requestId requis." }, { status: 400 });
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return NextResponse.json({ message: "Le taux de subvention doit être compris entre 0 et 100 %." }, { status: 400 });
    }

    const isAdmin = String(user.role || "").toUpperCase() === "ADMIN";
    if (!isAdmin) {
      const institutionIds = await getUserMobilityInstitutionIds(sb, String(user.id));
      let authorized = false;
      for (const institutionId of institutionIds) {
        if (await institutionOwnsMobilityRequest(sb, institutionId, requestId)) {
          authorized = true;
          break;
        }
      }
      if (!authorized) {
        return NextResponse.json({
          message: "Validation réservée à l'administrateur ou à un membre INSTITUTION_ADMIN lié au programme et à l'allocation du dossier.",
        }, { status: 403 });
      }
    }

    const { data: request, error: requestError } = await sb.from("MobilityRequest")
      .select("id,eligibilityStatus,eligibilityThresholdPercent,recruiterGuaranteed,subventionPercent,currentStep,status")
      .eq("id", requestId)
      .maybeSingle();
    if (requestError) throw new Error("MOBILITY_REQUEST_LOOKUP_FAILED: " + requestError.message);
    if (!request) return NextResponse.json({ message: "Dossier Mobility introuvable." }, { status: 404 });
    if (request.eligibilityStatus !== "ELIGIBLE" || request.recruiterGuaranteed !== true) {
      return NextResponse.json({
        message: "Aucune subvention ne peut être validée avant l'éligibilité métier et la garantie recruteur.",
      }, { status: 422 });
    }
    if (Number(request.eligibilityThresholdPercent || 50) !== 50) {
      return NextResponse.json({ message: "Le dossier ne respecte pas la règle Mobility courante de 50 %." }, { status: 422 });
    }

    const { data, error } = await sb.from("MobilityRequest").update({
      subventionPercent: percentage,
      currentStep: 4,
      status: "SUBSIDY_VALIDATED",
      updatedAt: new Date().toISOString(),
    }).eq("id", requestId).select("*").maybeSingle();
    if (error) throw new Error("MOBILITY_SUBSIDY_VALIDATION_FAILED: " + error.message);
    if (!data) return NextResponse.json({ message: "Dossier Mobility introuvable." }, { status: 404 });

    const { error: eventError } = await sb.from("MobilityProcessEvent").insert({
      mobilityRequestId: requestId,
      actorUserId: String(user.id),
      actorRole: String(user.role || "INSTITUTION_ADMIN"),
      eventType: "SUBSIDY_VALIDATED",
      fromStatus: "GUARANTEED",
      toStatus: "SUBSIDY_VALIDATED",
      title: "Subvention validée",
      description: "Le taux de subvention a été validé par un acteur institutionnel autorisé.",
      metadata: { subventionPercent: percentage },
      visibleToTalent: true,
      visibleToRecruiter: true,
      visibleToInstitution: true,
    });
    if (eventError) {
      const rollback = await sb.from("MobilityRequest").update({
        subventionPercent: request.subventionPercent ?? 0,
        currentStep: request.currentStep,
        status: request.status,
        updatedAt: new Date().toISOString(),
      }).eq("id", requestId);
      if (rollback.error) {
        return NextResponse.json({
          message: "Échec du journal d'audit et échec du retour arrière : " + rollback.error.message,
          auditError: eventError.message,
          rollbackError: true,
        }, { status: 500 });
      }
      return NextResponse.json({
        message: "La validation a été annulée car son événement d'audit n'a pas pu être écrit : " + eventError.message,
        auditError: true,
        rolledBack: true,
      }, { status: 500 });
    }
    return NextResponse.json({ request: data });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Validation Mobility impossible.",
    }, { status: 500 });
  }
}
