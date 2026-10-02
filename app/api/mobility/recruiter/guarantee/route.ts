import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../../../lib/mobilityServer";
import { calculateMobilityEligibility } from "../../../../../lib/mobilityEligibility";

export async function POST(req: NextRequest) {
  try {
    const au = await authUser(req);
    if (!au) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const u = await ensureUser(sb, au);
    const b = await req.json();

    const { data: request } = await sb.from("MobilityRequest").select("id,userId,recruiterUserId,applicationId,costTotal,companyAgreementId,salaryApproved,salaryCurrency,eligibilityStatus,eligibilityThresholdPercent").eq("id", b.requestId).maybeSingle();
    if (!request) return NextResponse.json({ message: "Dossier Mobility introuvable." }, { status: 404 });

    let recruiterUserId = request.recruiterUserId;
    if (!recruiterUserId && request.applicationId) {
      const { data: application } = await sb.from("Application").select("recruiterJobId").eq("id", request.applicationId).maybeSingle();
      if (application?.recruiterJobId) {
        const { data: job } = await sb.from("RecruiterJob").select("recruiterUserId").eq("id", application.recruiterJobId).maybeSingle();
        recruiterUserId = job?.recruiterUserId || null;
      }
    }
    if (!recruiterUserId || recruiterUserId !== u.id) return NextResponse.json({ message: "Seul le recruteur garant du dossier peut accepter la garantie." }, { status: 403 });

    const { data: agreement } = await sb.from("MobilityCompanyAgreement").select("*").eq("id", request.companyAgreementId).eq("recruiterUserId", u.id).eq("accepted", true).eq("repaymentGuaranteed", true).maybeSingle();
    if (!agreement) return NextResponse.json({ message: "La convention Mobility de l'entreprise doit être acceptée avant la garantie." }, { status: 422 });

    const total = Number(request.costTotal || 0);
    const repaymentMonths = 3;
    const { data: guarantee, error: guaranteeError } = await sb.from("MobilityRecruiterGuarantee").insert({
      mobilityRequestId: request.id,
      recruiterUserId: u.id,
      guaranteedAmount: total,
      currency: b.currency || "XAF",
      repaymentMonths,
      terminationStillDue: true,
      accepted: true,
      acceptedAt: new Date().toISOString(),
      paymentProvider: b.paymentProvider || null,
      paymentDestinationRef: b.paymentDestinationRef || null,
      status: "ACCEPTED",
    }).select("*").single();
    if (guaranteeError) throw new Error(guaranteeError.message);

    const { data: talent } = await sb.from("User").select("createdAt").eq("id", request.userId).maybeSingle();
    const { data: costItems } = await sb.from("MobilityCostItem").select("category,amount,currency,source").eq("mobilityRequestId", request.id);
    const eligibility = calculateMobilityEligibility({
      approvedSalary: Number(request.salaryApproved || 0),
      salaryCurrency: request.salaryCurrency || "XAF",
      costs: (costItems || []).map((x:any) => ({ category: x.category, amount: Number(x.amount || 0), currency: x.currency || request.salaryCurrency || "XAF", source: x.source })),
      companyMobilityAgreementAccepted: true,
      recruiterGuaranteeAccepted: true,
      repaymentMonths,
      thresholdPercent: Number(request.eligibilityThresholdPercent || 50),
      userCreatedAt: talent?.createdAt || null,

    });
    if (eligibility.status === "INELIGIBLE") {
      await sb.from("MobilityRecruiterGuarantee").delete().eq("id", guarantee.id);
      return NextResponse.json({ message: "La garantie recruteur ne peut pas contourner une inéligibilité Mobility.", eligibility }, { status: 422 });
    }
    const monthly = Math.round(total / repaymentMonths);
    const { data: updated, error } = await sb.from("MobilityRequest").update({
      recruiterGuaranteed: true,
      recruiterGuaranteeId: guarantee.id,
      currentStep: Math.max(3, Number(b.currentStep || 3)),
      status: "GUARANTEED",
      eligibilityStatus: eligibility.status,
      eligibilityThresholdPercent: eligibility.thresholdPercent,
      eligibilityBurdenPercent: eligibility.burdenPercent,
      eligibilityReason: eligibility.reason,
      eligibilityCalculatedAt: eligibility.calculatedAt,
      eligibilityVersion: eligibility.version,
      updatedAt: new Date().toISOString(),
    }).eq("id", request.id).select("*").single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ request: updated, guarantee, repayment: { months: repaymentMonths, monthlyAmount: monthly, totalAmount: total } });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Garantie impossible." }, { status: 500 });
  }
}
