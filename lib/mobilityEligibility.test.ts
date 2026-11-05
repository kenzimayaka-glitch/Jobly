import { calculateMobilityEligibility } from "./mobilityEligibility";

const createdAt = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
const ready = {
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT" as const, amount: 90000, currency: "XAF" }],
  companyMobilityAgreementAccepted: true,
  recruiterGuaranteeAccepted: true,
  userCreatedAt: createdAt,
};

const eligible = calculateMobilityEligibility(ready);
if (eligible.status !== "ELIGIBLE" || eligible.burdenPercent !== 30) throw new Error("50% eligibility positive case failed");

const boundary = calculateMobilityEligibility({
  ...ready,
  costs: [{ category: "TRANSPORT", amount: 150000, currency: "XAF" }],
});
if (boundary.status !== "ELIGIBLE" || boundary.burdenPercent !== 50) throw new Error("50% boundary case failed");

const rejected = calculateMobilityEligibility({
  ...ready,
  costs: [{ category: "TRANSPORT", amount: 150001, currency: "XAF" }],
});
if (rejected.status !== "INELIGIBLE") throw new Error("50% rejection case failed");

const missingSalary = calculateMobilityEligibility({ ...ready, approvedSalary: null });
if (missingSalary.status !== "NEEDS_INFO" || !missingSalary.missingInformation.includes("APPROVED_SALARY")) {
  throw new Error("missing approved salary case failed");
}

const missingGuarantee = calculateMobilityEligibility({ ...ready, recruiterGuaranteeAccepted: false });
if (missingGuarantee.status !== "NEEDS_INFO" || !missingGuarantee.missingInformation.includes("RECRUITER_GUARANTEE")) {
  throw new Error("missing recruiter guarantee case failed");
}

const tooNew = calculateMobilityEligibility({
  ...ready,
  userCreatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
});
if (tooNew.status !== "INELIGIBLE" || !tooNew.missingInformation.includes("USER_TENURE_3_MONTHS")) {
  throw new Error("minimum user tenure case failed");
}

const currencyMismatch = calculateMobilityEligibility({
  ...ready,
  costs: [{ category: "TRANSPORT", amount: 90000, currency: "EUR" }],
});
if (currencyMismatch.status !== "NEEDS_INFO" || !currencyMismatch.missingInformation.includes("MOBILITY_COST_CURRENCY_MISMATCH")) {
  throw new Error("currency mismatch case failed");
}

console.log("Mobility eligibility tests: OK");
