import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../../../lib/mobilityServer";
import { calculateMobilityEligibility } from "../../../../../lib/mobilityEligibility";
import { mayGuaranteeMobilityRequest } from "../../../../../lib/mobilityAccess";

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId || "").trim();
    if (!requestId) return NextResponse.json({ message: "requestId requis." }, { status: 400 });

    const { data: request, error: requestError } = await sb.from("MobilityRequest")
      .select("id,userId,recruiterUserId,applicationId,costTotal,companyAgreementId,recruiterGuaranteeId,salaryApproved,salaryCurrency,eligibilityThresholdPercent,currentStep")
      .eq("id", requestId)
      .maybeSingle();
    if (requestError) throw new Error("MOBILITY_REQUEST_LOOKUP_FAILED: " + requestError.message);
    if (!request) return NextResponse.json({ message: "Dossier Mobility introuvable." }, { status: 404 });
    if (request.recruiterGuaranteeId) {
      return NextResponse.json({ message: "Une garantie est déjà enregistrée pour ce dossier." }, { status: 409 });
    }

    let applicationRecruiterUserId: string | null = null;
    if (request.applicationId) {
      const { data: application, error } = await sb.from("Application")
        .select("recruiterJobId")
        .eq("id", request.applicationId)
        .maybeSingle();
      if (error) throw new Error("MOBILITY_APPLICATION_LOOKUP_FAILED: " + error.message);
      if (application?.recruiterJobId) {
        const { data: job, error: jobError } = await sb.from("RecruiterJob")
          .select("recruiterUserId")
          .eq("id", application.recruiterJobId)
          .maybeSingle();
        if (jobError) throw new Error("MOBILITY_RECRUITER_JOB_LOOKUP_FAILED: " + jobError.message);
        applicationRecruiterUserId = job?.recruiterUserId ? String(job.recruiterUserId) : null;
      }
    }

    const { data: agreement, error: agreementError } = request.companyAgreementId
      ? await sb.from("MobilityCompanyAgreement").select("*")
        .eq("id", request.companyAgreementId)
        .maybeSingle()
      : { data: null, error: null };
    if (agreementError) throw new Error("MOBILITY_AGREEMENT_LOOKUP_FAILED: " + agreementError.message);

    const authorized = mayGuaranteeMobilityRequest(user.role, String(user.id), {
      requestRecruiterUserId: request.recruiterUserId ? String(request.recruiterUserId) : null,
      agreementRecruiterUserId: agreement?.recruiterUserId ? String(agreement.recruiterUserId) : null,
      applicationRecruiterUserId,
    });
    if (!authorized) {
      return NextResponse.json({ message: "Seul l'administrateur ou le recruteur lié à ce dossier peut accepter la garantie." }, { status: 403 });
    }
    if (!agreement || agreement.accepted !== true || agreement.repaymentGuaranteed !== true) {
      return NextResponse.json({ message: "La convention employeur acceptée et sa clause de garantie sont obligatoires." }, { status: 422 });
    }

    const { data: talent, error: talentError } = await sb.from("User")
      .select("createdAt")
      .eq("id", request.userId)
      .maybeSingle();
    if (talentError) throw new Error("MOBILITY_TALENT_LOOKUP_FAILED: " + talentError.message);
    const { data: costItems, error: costsError } = await sb.from("MobilityCostItem")
      .select("category,amount,currency,source")
      .eq("mobilityRequestId", request.id);
    if (costsError) throw new Error("MOBILITY_COSTS_LOOKUP_FAILED: " + costsError.message);

    const repaymentMonths = Number(agreement.payrollDeductionMonths || 3);
    const eligibility = calculateMobilityEligibility({
      approvedSalary: request.salaryApproved === null ? null : Number(request.salaryApproved),
      salaryCurrency: request.salaryCurrency || "XAF",
      costs: (costItems || []).map((item: any) => ({
        category: item.category,
        amount: Number(item.amount),
        currency: item.currency || request.salaryCurrency || "XAF",
        source: item.source,
      })),
      companyMobilityAgreementAccepted: true,
      recruiterGuaranteeAccepted: true,
      userCreatedAt: talent?.createdAt || null,
      repaymentMonths,
      thresholdPercent: 50,
    });

    if (eligibility.status !== "ELIGIBLE") {
      return NextResponse.json({
        message: eligibility.status === "INELIGIBLE"
          ? "La garantie ne peut pas contourner une inéligibilité Mobility."
          : "Le dossier reste incomplet : aucune garantie ne peut être enregistrée.",
        eligibility,
      }, { status: 422 });
    }

    const { data: guarantee, error: guaranteeError } = await sb.from("MobilityRecruiterGuarantee").insert({
      mobilityRequestId: request.id,
      recruiterUserId: applicationRecruiterUserId || request.recruiterUserId,
      guaranteedAmount: eligibility.totalMobilityCost,
      currency: eligibility.salaryCurrency,
      repaymentMonths,
      terminationStillDue: true,
      accepted: true,
      acceptedAt: new Date().toISOString(),
      status: "ACCEPTED",
    }).select("*").single();
    if (guaranteeError) throw new Error("MOBILITY_GUARANTEE_CREATE_FAILED: " + guaranteeError.message);

    const { data: decision, error: decisionError } = await sb.from("MobilityEligibilityDecision").insert({
      mobilityRequestId: request.id,
      version: eligibility.version,
      status: eligibility.status,
      approvedSalary: eligibility.approvedSalary,
      salaryCurrency: eligibility.salaryCurrency,
      totalMobilityCost: eligibility.totalMobilityCost,
      thresholdPercent: eligibility.thresholdPercent,
      maximumEligibleCost: eligibility.maximumEligibleCost,
      burdenPercent: eligibility.burdenPercent,
      companyMobilityAgreementAccepted: true,
      recruiterGuaranteeAccepted: true,
      repaymentMonths,
      repaymentMonthlyAmount: eligibility.repaymentMonthlyAmount,
      reason: eligibility.reason,
      missingInformation: [],
      calculatedAt: eligibility.calculatedAt,
    }).select("id").single();
    if (decisionError) {
      await sb.from("MobilityRecruiterGuarantee").delete().eq("id", guarantee.id);
      throw new Error("MOBILITY_ELIGIBILITY_DECISION_SAVE_FAILED: " + decisionError.message);
    }

    const { data: updated, error: updateError } = await sb.from("MobilityRequest").update({
      recruiterGuaranteed: true,
      recruiterGuaranteeId: guarantee.id,
      eligibilityStatus: eligibility.status,
      eligibilityThresholdPercent: eligibility.thresholdPercent,
      eligibilityBurdenPercent: eligibility.burdenPercent,
      eligibilityReason: eligibility.reason,
      eligibilityCalculatedAt: eligibility.calculatedAt,
      eligibilityVersion: eligibility.version,
      currentStep: Math.max(3, Number(request.currentStep || 3)),
      status: "GUARANTEED",
      updatedAt: new Date().toISOString(),
    }).eq("id", request.id).select("*").single();
    if (updateError) {
      await sb.from("MobilityEligibilityDecision").delete().eq("id", decision.id);
      await sb.from("MobilityRecruiterGuarantee").delete().eq("id", guarantee.id);
      throw new Error("MOBILITY_REQUEST_GUARANTEE_UPDATE_FAILED: " + updateError.message);
    }

    const { error: eventError } = await sb.from("MobilityProcessEvent").insert({
      mobilityRequestId: request.id,
      actorUserId: String(user.id),
      actorRole: String(user.role || "RECRUITER"),
      eventType: "RECRUITER_GUARANTEE_ACCEPTED",
      fromStatus: "DRAFT",
      toStatus: "GUARANTEED",
      title: "Garantie recruteur acceptée",
      description: "La garantie est enregistrée après contrôle de la convention, du salaire approuvé et du seuil Mobility.",
      metadata: { guaranteeId: guarantee.id, eligibilityDecisionId: decision.id },
      visibleToTalent: true,
      visibleToRecruiter: true,
      visibleToInstitution: true,
    });
    if (eventError) {
      await sb.from("MobilityRequest").update({
        recruiterGuaranteed: false,
        recruiterGuaranteeId: null,
        status: "DRAFT",
        updatedAt: new Date().toISOString(),
      }).eq("id", request.id);
      await sb.from("MobilityEligibilityDecision").delete().eq("id", decision.id);
      await sb.from("MobilityRecruiterGuarantee").delete().eq("id", guarantee.id);
      throw new Error("MOBILITY_GUARANTEE_AUDIT_FAILED: " + eventError.message);
    }

    return NextResponse.json({
      request: updated,
      guarantee,
      repayment: {
        months: repaymentMonths,
        monthlyAmount: eligibility.repaymentMonthlyAmount,
        totalAmount: eligibility.totalMobilityCost,
      },
    });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Garantie Mobility impossible.",
    }, { status: 500 });
  }
}
