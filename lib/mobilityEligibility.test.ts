import { calculateMobilityEligibility } from "./mobilityEligibility";

const eligible = calculateMobilityEligibility({
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 90000, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (eligible.status !== "ELIGIBLE" || eligible.burdenPercent !== 30) throw new Error("35% eligibility positive case failed");

const boundary = calculateMobilityEligibility({
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 105000, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (boundary.status !== "ELIGIBLE" || boundary.burdenPercent !== 35) throw new Error("35% boundary case failed");

const rejected = calculateMobilityEligibility({
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 105001, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (rejected.status !== "INELIGIBLE") throw new Error("35% rejection case failed");

const missing = calculateMobilityEligibility({
  approvedSalary: null,
  costs: [{ category: "TRANSPORT", amount: 90000, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (missing.status !== "NEEDS_INFO" || !missing.missingInformation.includes("APPROVED_SALARY")) throw new Error("missing salary case failed");

console.log("Mobility eligibility tests: OK");
