import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds } from "../../../../../../lib/mobilityAccess";

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId || "").trim();
    const serviceId = String(body.serviceId || "").trim();
    if (!requestId || !serviceId) return NextResponse.json({ message: "Dossier et service prestataire requis." }, { status: 400 });

    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!institutionIds.length) return NextResponse.json({ message: "Membre INSTITUTION_ADMIN actif requis." }, { status: 403 });

    const { data: service, error: serviceError } = await db.from("MobilityProviderService")
      .select("id,providerId,serviceType,city,priceAmount,currency,status,MobilityServiceProvider(providerType,status,kycStatus)")
      .eq("id", serviceId)
      .maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    if (!service || service.status !== "ACTIVE") return NextResponse.json({ message: "Service prestataire non disponible." }, { status: 404 });
    const provider = Array.isArray(service.MobilityServiceProvider) ? service.MobilityServiceProvider[0] : service.MobilityServiceProvider;
    if (!provider || provider.status !== "ACTIVE" || provider.kycStatus !== "VERIFIED") {
      return NextResponse.json({ message: "Le prestataire doit être actif et son KYC vérifié." }, { status: 422 });
    }
    const expectedServiceType: Record<string, string> = { FINANCE: "FINANCING", HOUSING: "HOUSING", TRANSPORT: "TRANSPORT" };
    if (expectedServiceType[provider.providerType] !== service.serviceType) {
      return NextResponse.json({ message: "Le service ne correspond pas à la catégorie du prestataire." }, { status: 422 });
    }

    const { data: request, error: requestError } = await db.from("MobilityRequest")
      .select("id,eligibilityStatus,eligibilityThresholdPercent,recruiterGuaranteed,recruiterGuaranteeId")
      .eq("id", requestId)
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request || request.eligibilityStatus !== "ELIGIBLE" || Number(request.eligibilityThresholdPercent) !== 50
      || request.recruiterGuaranteed !== true || !request.recruiterGuaranteeId) {
      return NextResponse.json({ message: "Le dossier doit être éligible à 50 % et garanti par le recruteur avant toute affectation." }, { status: 422 });
    }

    const { data: allocations, error: allocationError } = await db.from("MobilityFundingAllocation")
      .select("id,programId,status")
      .eq("mobilityRequestId", requestId)
      .in("status", ["APPROVED", "PARTIALLY_DISBURSED", "DISBURSED"]);
    if (allocationError) throw new Error(allocationError.message);
    if (!allocations?.length) return NextResponse.json({ message: "Une allocation approuvée dans un programme financé est requise avant l'affectation prestataire." }, { status: 422 });
    const programIds = [...new Set(allocations.map((row: { programId: string }) => row.programId))];
    const { data: programs, error: programError } = await db.from("MobilityProgram")
      .select("id,institutionId,status,commitmentVerifiedAt,code,name")
      .in("id", programIds);
    if (programError) throw new Error(programError.message);
    if (!(programs || []).some((program: any) => institutionIds.includes(String(program.institutionId))
      && program.status === "ACTIVE" && program.commitmentVerifiedAt
      && !String(program.code + " " + program.name).toUpperCase().includes("DEMO"))) {
      return NextResponse.json({ message: "Le dossier n'est pas financé par un programme actif et vérifié de cette institution." }, { status: 403 });
    }

    const agreedAmount = body.agreedAmount === null || body.agreedAmount === undefined || body.agreedAmount === ""
      ? (service.priceAmount === null ? null : Number(service.priceAmount))
      : Number(body.agreedAmount);
    if (agreedAmount !== null && (!Number.isFinite(agreedAmount) || agreedAmount < 0)) {
      return NextResponse.json({ message: "Montant de service invalide." }, { status: 400 });
    }
    const { data, error } = await db.from("MobilityProviderAssignment").insert({
      mobilityRequestId: requestId,
      providerId: service.providerId,
      serviceId,
      assignedByUserId: user.id,
      status: "PROPOSED",
      agreedAmount,
      currency: service.currency || "XAF",
    }).select("id,mobilityRequestId,providerId,serviceId,status,agreedAmount,currency,createdAt").single();
    if (error) throw new Error(error.message);
    const { error: eventError } = await db.from("MobilityProcessEvent").insert({
      mobilityRequestId: requestId,
      actorUserId: user.id,
      actorRole: "INSTITUTION_ADMIN",
      eventType: "PROVIDER_ASSIGNED",
      fromStatus: null,
      toStatus: "PROPOSED",
      title: "Prestataire Mobility proposé",
      description: "Un prestataire KYC vérifié a été affecté à un dossier financé.",
      metadata: { assignmentId: data.id, providerId: service.providerId, serviceId },
      visibleToTalent: true,
      visibleToRecruiter: true,
      visibleToInstitution: true,
    });
    if (eventError) {
      await db.from("MobilityProviderAssignment").delete().eq("id", data.id);
      throw new Error("MOBILITY_PROVIDER_ASSIGNMENT_AUDIT_FAILED: " + eventError.message);
    }
    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Affectation prestataire impossible." }, { status: 500 });
  }
}
