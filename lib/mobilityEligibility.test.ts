import { calculateMobilityEligibility } from "./mobilityEligibility";

const eligible = calculateMobilityEligibility({
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 90000, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (eligible.status !== "ELIGIBLE" || eligible.burdenPercent !== 30) throw new Error("50% eligibility positive case failed");

const boundary = calculateMobilityEligibility({
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 150000, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (boundary.status !== "ELIGIBLE" || boundary.burdenPercent !== 50) throw new Error("50% boundary case failed");

const rejected = calculateMobilityEligibility({
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 150001, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (rejected.status !== "INELIGIBLE") throw new Error("50% rejection case failed");

const missing = calculateMobilityEligibility({
  approvedSalary: null,
  costs: [{ category: "TRANSPORT", amount: 90000, currency: "XAF" }],\n  companyMobilityAgreementAccepted: true,\n  recruiterGuaranteeAccepted: true,
});
if (missing.status !== "NEEDS_INFO" || !missing.missingInformation.includes("APPROVED_SALARY")) throw new Error("missing salary case failed");

const paidBoundary = calculateMobilityEligibility({
  approvedSalary: 300000, salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 150000, currency: "XAF" }],
  companyMobilityAgreementAccepted: true, recruiterGuaranteeAccepted: true,
  userCreatedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  activePaidPlan: true,
});
if (paidBoundary.status !== "ELIGIBLE" || paidBoundary.burdenPercent !== 50) throw new Error("50% boundary case failed");
console.log("Mobility eligibility tests: OK");


test("refuse un utilisateur de moins de 3 mois", () => {
  const d = calculateMobilityEligibility({
    approvedSalary: 300000, salaryCurrency: "XAF",
    costs: [{ category: "TRANSPORT", amount: 90000, currency: "XAF" }],
    companyMobilityAgreementAccepted: true, recruiterGuaranteeAccepted: true,
    userCreatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    activePaidPlan: true,
  });
  expect(d.status).toBe("INELIGIBLE");
});

test("refuse sans pack payant actif", () => {
  const d = calculateMobilityEligibility({
    approvedSalary: 300000, salaryCurrency: "XAF",
    costs: [{ category: "TRANSPORT", amount: 90000, currency: "XAF" }],
    companyMobilityAgreementAccepted: true, recruiterGuaranteeAccepted: true,
    userCreatedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    activePaidPlan: false,
  });
  expect(d.status).toBe("INELIGIBLE");
});
