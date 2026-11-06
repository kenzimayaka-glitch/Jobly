import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { requirePremium, authUser, adminClient, ensureUser } from "../../../../lib/mobilityServer";
import { CAMEROON_CITIES, calculateMobilityCosts, type CameroonCityKey } from "../../../../lib/gps";
import { calculateMobilityEligibility } from "../../../../lib/mobilityEligibility";
import { enforceApiRateLimit } from "../../../../lib/server-security";

const ACCEPTED_OFFER_STATUSES = new Set(["ACCEPTED", "ACCEPTED_BY_TALENT", "APPROVED", "VALIDATED"]);

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-talent-request-read",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 600, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const requestId = req.nextUrl.searchParams.get("requestId");
    if (!requestId) return NextResponse.json({ message: "requestId requis." }, { status: 400 });
    const { data: request, error: requestError } = await db.from("MobilityRequest")
      .select("*")
      .eq("id", requestId)
      .eq("userId", user.id)
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request) return NextResponse.json({ message: "Dossier Mobility introuvable." }, { status: 404 });
    const [{ data: costs, error: costsError }, { data: decisions, error: decisionError }, { data: applications, error: applicationError }] = await Promise.all([
      db.from("MobilityCostItem").select("id,category,amount,currency,source,confidence,eligibilityStatus").eq("mobilityRequestId", requestId),
      db.from("MobilityEligibilityDecision").select("id,version,status,approvedSalary,salaryCurrency,totalMobilityCost,thresholdPercent,maximumEligibleCost,burdenPercent,reason,missingInformation,calculatedAt").eq("mobilityRequestId", requestId).order("calculatedAt", { ascending: false }).limit(1),
      db.from("MobilityProgramApplication").select("id,programId,status,submittedAt,decidedAt,decisionReason,MobilityProgram(code,name)").eq("mobilityRequestId", requestId).eq("applicantUserId", user.id).order("submittedAt", { ascending: false }),
    ]);
    if (costsError) throw new Error(costsError.message);
    if (decisionError) throw new Error(decisionError.message);
    if (applicationError) throw new Error(applicationError.message);
    return NextResponse.json({ request, costs: costs || [], decision: decisions?.[0] || null, programApplications: applications || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Dossier Mobility indisponible." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePremium(req);
    if ("error" in gate) return NextResponse.json({ message: gate.error }, { status: gate.status });
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 24 * 1024) return NextResponse.json({ message: "Données Mobility trop volumineuses." }, { status: 413 });
    const limited = await enforceApiRateLimit(req, gate.sb, {
      scope: "mobility-talent-request-create",
      identity: gate.user.id,
      accountWindows: [{ limit: 3, windowSeconds: 3600 }, { limit: 6, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const body = await req.json().catch(() => ({}));
    const applicationId = String(body.applicationId || "").trim();
    const depart = String(body.departKey || "YAOUNDE") as CameroonCityKey;
    const arrivee = String(body.arriveeKey || "DOUALA") as CameroonCityKey;
    const housingType = String(body.typeLocal || "CHAMBRE");

    if (!applicationId) {
      return NextResponse.json({ message: "Une candidature avec offre acceptée est nécessaire pour ouvrir Mobility." }, { status: 400 });
    }
    if (!CAMEROON_CITIES[depart] || !CAMEROON_CITIES[arrivee]) {
      return NextResponse.json({ message: "Ville de départ ou d'arrivée invalide." }, { status: 400 });
    }
    if (!["CHAMBRE", "STUDIO", "APPART"].includes(housingType)) {
      return NextResponse.json({ message: "Type de logement invalide." }, { status: 400 });
    }

    const { data: application, error: applicationError } = await gate.sb.from("Application")
      .select("id,userId,recruiterJobId,status")
      .eq("id", applicationId)
      .eq("userId", gate.user.id)
      .maybeSingle();
    if (applicationError) throw new Error("APPLICATION_LOOKUP_FAILED: " + applicationError.message);
    if (!application) return NextResponse.json({ message: "Candidature introuvable pour ce Talent." }, { status: 404 });

    const { data: offers, error: offerError } = await gate.sb.from("RecruitmentOffer")
      .select("id,applicationId,status,salaryProposed,salaryCurrency,serviceDate,recruitmentId")
      .eq("applicationId", application.id)
      .order("createdAt", { ascending: false })
      .limit(10);
    if (offerError) throw new Error("RECRUITER_OFFER_LOOKUP_FAILED: " + offerError.message);
    const offer = (offers || []).find((item: any) => ACCEPTED_OFFER_STATUSES.has(String(item.status || "").toUpperCase()));
    if (!offer || !Number.isFinite(Number(offer.salaryProposed)) || Number(offer.salaryProposed) <= 0) {
      return NextResponse.json({
        message: "Aucune offre recruteur acceptée avec salaire approuvé n'est rattachée à cette candidature. Mobility ne peut pas utiliser un salaire saisi par le Talent.",
      }, { status: 422 });
    }

    const { data: recruiterJob, error: jobError } = application.recruiterJobId
      ? await gate.sb.from("RecruiterJob").select("recruiterUserId,companyName,location").eq("id", application.recruiterJobId).maybeSingle()
      : { data: null, error: null };
    if (jobError) throw new Error("RECRUITER_JOB_LOOKUP_FAILED: " + jobError.message);
    if (!recruiterJob?.recruiterUserId) {
      return NextResponse.json({ message: "Le recruteur responsable de cette candidature ne peut pas être identifié." }, { status: 422 });
    }

    const { data: agreement, error: agreementError } = await gate.sb.from("MobilityCompanyAgreement")
      .select("id,recruiterUserId,accepted,repaymentGuaranteed,payrollDeductionMonths")
      .eq("recruiterUserId", recruiterJob.recruiterUserId)
      .eq("accepted", true)
      .eq("repaymentGuaranteed", true)
      .order("acceptedAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (agreementError) throw new Error("COMPANY_AGREEMENT_LOOKUP_FAILED: " + agreementError.message);
    if (!agreement) {
      return NextResponse.json({
        message: "La convention Mobility de l'employeur n'est pas encore acceptée. Le Talent ne peut pas être présenté comme éligible.",
        reason: "COMPANY_MOBILITY_AGREEMENT_REQUIRED",
      }, { status: 422 });
    }

    const salary = Number(offer.salaryProposed);
    const salaryCurrency = String(offer.salaryCurrency || "XAF").trim().toUpperCase();
    const costs = calculateMobilityCosts(depart, arrivee, housingType as "CHAMBRE" | "STUDIO" | "APPART", salary);
    const mobilityCosts = [
      { category: "TRANSPORT" as const, amount: costs.transportCost, currency: "XAF", source: "SYSTEM_ESTIMATE" as const },
      { category: "HOUSING" as const, amount: costs.housingCost * 2, currency: "XAF", source: "SYSTEM_ESTIMATE" as const },
      { category: "INSTALLATION" as const, amount: costs.movingCost, currency: "XAF", source: "SYSTEM_ESTIMATE" as const },
    ];
    const eligibility = calculateMobilityEligibility({
      approvedSalary: salary,
      salaryCurrency,
      costs: mobilityCosts,
      companyMobilityAgreementAccepted: true,
      recruiterGuaranteeAccepted: false,
      userCreatedAt: gate.user.createdAt,
      repaymentMonths: Number(agreement.payrollDeductionMonths || 3),
      thresholdPercent: 50,
    });

    const requestId = crypto.randomUUID();
    const status = eligibility.status === "INELIGIBLE" ? "INELIGIBLE" : "DRAFT";
    const { data: request, error: requestError } = await gate.sb.from("MobilityRequest").insert({
      id: requestId,
      userId: gate.user.id,
      applicationId: application.id,
      recruiterUserId: recruiterJob.recruiterUserId,
      companyAgreementId: agreement.id,
      departCity: CAMEROON_CITIES[depart].name,
      arriveeCity: CAMEROON_CITIES[arrivee].name,
      departLat: CAMEROON_CITIES[depart].lat,
      departLng: CAMEROON_CITIES[depart].lng,
      arriveeLat: CAMEROON_CITIES[arrivee].lat,
      arriveeLng: CAMEROON_CITIES[arrivee].lng,
      distanceKm: costs.distanceKm,
      housingType,
      salary,
      salaryApproved: salary,
      salaryCurrency,
      salarySource: "RECRUITER_OFFER",
      costTotal: costs.total,
      costMonthly: costs.monthly,
      mobilityFit: costs.mobilityFit,
      eligibilityThresholdPercent: eligibility.thresholdPercent,
      eligibilityBurdenPercent: eligibility.burdenPercent,
      eligibilityStatus: eligibility.status,
      eligibilityReason: eligibility.reason,
      eligibilityCalculatedAt: eligibility.calculatedAt,
      eligibilityVersion: eligibility.version,
      status,
      currentStep: 1,
      subventionPercent: 0,
      recruiterGuaranteed: false,
      cniWatermarked: false,
    }).select("*").single();
    if (requestError) throw new Error("MOBILITY_REQUEST_CREATE_FAILED: " + requestError.message);

    const { error: costsError } = await gate.sb.from("MobilityCostItem").insert(
      mobilityCosts.map((item) => ({
        mobilityRequestId: requestId,
        category: item.category,
        amount: item.amount,
        currency: item.currency,
        source: item.source,
        eligibilityStatus: "PENDING",
      })),
    );
    if (costsError) {
      await gate.sb.from("MobilityRequest").delete().eq("id", requestId).eq("userId", gate.user.id);
      throw new Error("MOBILITY_COSTS_SAVE_FAILED: " + costsError.message);
    }

    const { error: decisionError } = await gate.sb.from("MobilityEligibilityDecision").insert({
      mobilityRequestId: requestId,
      version: eligibility.version,
      status: eligibility.status,
      approvedSalary: salary,
      salaryCurrency,
      totalMobilityCost: eligibility.totalMobilityCost,
      thresholdPercent: eligibility.thresholdPercent,
      maximumEligibleCost: eligibility.maximumEligibleCost,
      burdenPercent: eligibility.burdenPercent,
      companyMobilityAgreementAccepted: eligibility.companyMobilityAgreementAccepted,
      recruiterGuaranteeAccepted: eligibility.recruiterGuaranteeAccepted,
      repaymentMonths: eligibility.repaymentMonths,
      repaymentMonthlyAmount: eligibility.repaymentMonthlyAmount,
      reason: eligibility.reason,
      missingInformation: eligibility.missingInformation,
      calculatedAt: eligibility.calculatedAt,
    });
    if (decisionError) {
      await gate.sb.from("MobilityRequest").delete().eq("id", requestId).eq("userId", gate.user.id);
      throw new Error("MOBILITY_ELIGIBILITY_SAVE_FAILED: " + decisionError.message);
    }

    return NextResponse.json({
      request,
      costs,
      eligibility,
      recruiterGuaranteeRequired: eligibility.status === "NEEDS_INFO",
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Création du dossier Mobility impossible.",
    }, { status: 500 });
  }
}
