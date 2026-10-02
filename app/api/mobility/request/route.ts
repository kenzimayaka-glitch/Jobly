import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import sharp from "sharp";
import { requirePremium } from "../../../../lib/mobilityServer";
import { CAMEROON_CITIES, calculateMobilityCosts, type CameroonCityKey } from "../../../../lib/gps";
import { calculateMobilityEligibility } from "../../../../lib/mobilityEligibility";

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePremium(req);
    if ("error" in gate) return NextResponse.json({ message: gate.error }, { status: gate.status });
    const b = await req.json();
    const depart = (b.departKey || "YAOUNDE") as CameroonCityKey;
    const arrivee = (b.arriveeKey || "DOUALA") as CameroonCityKey;
    const type = b.typeLocal || "CHAMBRE";
    if (!CAMEROON_CITIES[depart] || !CAMEROON_CITIES[arrivee]) {
      return NextResponse.json({ message: "Ville invalide." }, { status: 400 });
    }

    const { data: offers } = await gate.sb
      .from("RecruitmentOffer")
      .select("id,applicationId,status,salaryProposed,salaryCurrency,serviceDate,recruitmentId")
      .eq("applicationId", b.applicationId || "")
      .order("createdAt", { ascending: false })
      .limit(10);
    const offer = (offers || []).find((o: any) => ["ACCEPTED", "ACCEPTED_BY_TALENT", "APPROVED", "VALIDATED"].includes(String(o.status).toUpperCase()));
    if (!offer) {
      return NextResponse.json({ message: "Aucune offre recruteur acceptée et validée n'est rattachée à cette candidature. Mobility ne peut pas inventer le salaire." }, { status: 422 });
    }

    const { data: application } = await gate.sb.from("Application").select("id,userId,recruiterJobId,status").eq("id", offer.applicationId).eq("userId", gate.user.id).maybeSingle();
    if (!application) return NextResponse.json({ message: "Candidature Mobility introuvable." }, { status: 404 });

    const { data: recruiterJob } = application.recruiterJobId
      ? await gate.sb.from("RecruiterJob").select("recruiterUserId,companyName,location").eq("id", application.recruiterJobId).maybeSingle()
      : { data: null };
    if (!recruiterJob?.recruiterUserId) {
      return NextResponse.json({ message: "Le recruteur garant de cette candidature n'est pas identifiable." }, { status: 422 });
    }

    const { data: agreement } = await gate.sb
      .from("MobilityCompanyAgreement")
      .select("*")
      .eq("recruiterUserId", recruiterJob.recruiterUserId)
      .eq("accepted", true)
      .eq("repaymentGuaranteed", true)
      .order("acceptedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!agreement) {
      return NextResponse.json({
        message: "L'entreprise n'a pas encore accepté la convention Mobility. Le dossier est donc inéligible.",
        reason: "COMPANY_MOBILITY_AGREEMENT_REQUIRED",
      }, { status: 422 });
    }

    const salary = Number(offer.salaryProposed || 0);
    const currency = String(offer.salaryCurrency || "XAF");
    const costs = calculateMobilityCosts(depart, arrivee, type, salary);
    const eligibility = calculateMobilityEligibility({
      approvedSalary: salary,
      salaryCurrency: currency,
      costs: [
        { category: "TRANSPORT", amount: costs.transportCost, currency, source: "SYSTEM_ESTIMATE" },
        { category: "HOUSING", amount: costs.housingCost, currency, source: "SYSTEM_ESTIMATE" },
        { category: "INSTALLATION", amount: costs.movingCost, currency, source: "SYSTEM_ESTIMATE" },
      ],
      companyMobilityAgreementAccepted: true,
      recruiterGuaranteeAccepted: false,
      repaymentMonths: 3,
    });

    let cniWatermarked = false;
    let cniWatermarkedDataUrl: string | null = null;
    if (typeof b.cniDataUrl === "string" && b.cniDataUrl.startsWith("data:image/")) {
      const base64 = b.cniDataUrl.split(",")[1];
      if (base64) {
        const svg = Buffer.from('<svg width="600" height="380"><style>text{font-family:Arial;font-size:28px;font-weight:700;fill:#0A3D9C;opacity:.22}</style><text x="30" y="350">JOBLY MOBILITY • DOCUMENT PROTÉGÉ</text></svg>');
        const out = await sharp(Buffer.from(base64, "base64")).composite([{ input: svg, gravity: "southeast" }]).jpeg({ quality: 82 }).toBuffer();
        cniWatermarked = true;
        cniWatermarkedDataUrl = `data:image/jpeg;base64,${out.toString("base64")}`;
      }
    }

    const requestId = crypto.randomUUID();
    const { data: request, error } = await gate.sb.from("MobilityRequest").insert({
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
      housingType: type,
      salary,
      salaryApproved: salary,
      salaryCurrency: currency,
      salarySource: "RECRUITER_OFFER",
      costTotal: costs.total,
      costMonthly: costs.monthly,
      mobilityFit: costs.mobilityFit,
      eligibilityThresholdPercent: 35,
      eligibilityBurdenPercent: eligibility.burdenPercent,
      eligibilityStatus: eligibility.status,
      eligibilityReason: "Convention employeur validée. Garantie recruteur encore requise avant financement.",
      eligibilityCalculatedAt: eligibility.calculatedAt,
      eligibilityVersion: eligibility.version,
      status: "DRAFT",
      currentStep: 1,
      subventionPercent: 0,
      cniWatermarked,
    }).select("*").single();
    if (error) throw new Error(error.message);

    await gate.sb.from("MobilityCostItem").insert([
      { mobilityRequestId: requestId, category: "TRANSPORT", amount: costs.transportCost, currency, source: "SYSTEM_ESTIMATE", eligibilityStatus: "PENDING" },
      { mobilityRequestId: requestId, category: "HOUSING", amount: costs.housingCost, currency, source: "SYSTEM_ESTIMATE", eligibilityStatus: "PENDING" },
      { mobilityRequestId: requestId, category: "INSTALLATION", amount: costs.movingCost, currency, source: "SYSTEM_ESTIMATE", eligibilityStatus: "PENDING" },
    ]);

    await gate.sb.from("MobilityEligibilityDecision").insert({
      mobilityRequestId: requestId,
      version: eligibility.version,
      status: eligibility.status,
      approvedSalary: salary,
      salaryCurrency: currency,
      totalMobilityCost: eligibility.totalMobilityCost,
      thresholdPercent: eligibility.thresholdPercent,
      maximumEligibleCost: eligibility.maximumEligibleCost,
      burdenPercent: eligibility.burdenPercent,
      companyMobilityAgreementAccepted: true,
      recruiterGuaranteeAccepted: false,
      repaymentMonths: 3,
      repaymentMonthlyAmount: eligibility.repaymentMonthlyAmount,
      reason: eligibility.reason,
      missingInformation: ["RECRUITER_GUARANTEE"],
      calculatedAt: eligibility.calculatedAt,
    });

    return NextResponse.json({
      request,
      costs,
      eligibility,
      recruiterGuaranteeRequired: true,
      cniWatermarkedDataUrl,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Création impossible." }, { status: 500 });
  }
}
