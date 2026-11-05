export const MOBILITY_ELIGIBILITY_VERSION = "mobility-eligibility-v6";
export const DEFAULT_MOBILITY_THRESHOLD_PERCENT = 50;
export const DEFAULT_REPAYMENT_MONTHS = 3;
export const DEFAULT_MIN_USER_TENURE_MONTHS = 3;

export type MobilityEligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "NEEDS_INFO";

export type MobilityCostItem = {
  category: "TRANSPORT" | "HOUSING" | "INSTALLATION" | "LOCAL_TRANSPORT" | "COST_OF_LIVING" | "OTHER";
  amount: number;
  currency: string;
  source?: "SYSTEM_ESTIMATE" | "TALENT_DECLARED" | "PARTNER_QUOTE" | "VERIFIED";
  confidence?: number;
};

export type MobilityEligibilityInput = {
  approvedSalary?: number | null;
  salaryCurrency?: string | null;
  costs: MobilityCostItem[];
  companyMobilityAgreementAccepted?: boolean;
  recruiterGuaranteeAccepted?: boolean;
  userCreatedAt?: string | null;
  requiredUserTenureMonths?: number;
  repaymentMonths?: number;
  thresholdPercent?: number;
};

export type MobilityEligibilityDecision = {
  version: string;
  status: MobilityEligibilityStatus;
  approvedSalary: number | null;
  salaryCurrency: string;
  totalMobilityCost: number;
  thresholdPercent: number;
  maximumEligibleCost: number | null;
  burdenPercent: number | null;
  companyMobilityAgreementAccepted: boolean;
  recruiterGuaranteeAccepted: boolean;
  repaymentMonths: number;
  repaymentMonthlyAmount: number | null;
  userTenureMonths: number | null;
  minimumUserTenureMonths: number;
  reason: string;
  missingInformation: string[];
  calculatedAt: string;
};

const round = (value: number) => Math.round(value * 100) / 100;
const roundPercent = (value: number) => Math.round(value * 10000) / 10000;

export function calculateMobilityEligibility(input: MobilityEligibilityInput): MobilityEligibilityDecision {
  const now = new Date().toISOString();
  const threshold = input.thresholdPercent ?? DEFAULT_MOBILITY_THRESHOLD_PERCENT;
  const repaymentMonths = input.repaymentMonths ?? DEFAULT_REPAYMENT_MONTHS;
  const minimumTenure = input.requiredUserTenureMonths ?? DEFAULT_MIN_USER_TENURE_MONTHS;

  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) {
    throw new RangeError("Le seuil Mobility doit être compris entre 0 et 100 %.");
  }
  if (!Number.isInteger(repaymentMonths) || repaymentMonths < 1 || repaymentMonths > 3) {
    throw new RangeError("La durée de remboursement doit être comprise entre 1 et 3 mois.");
  }
  if (!Number.isInteger(minimumTenure) || minimumTenure < 0) {
    throw new RangeError("L'ancienneté minimale doit être un nombre entier positif.");
  }

  const rawSalary = input.approvedSalary ?? null;
  const approvedSalary = typeof rawSalary === "number" && Number.isFinite(rawSalary) && rawSalary > 0
    ? rawSalary
    : null;
  const salaryCurrency = String(input.salaryCurrency || "XAF").trim().toUpperCase();
  const validCosts = input.costs.filter((item) => Number.isFinite(item.amount) && item.amount >= 0);
  const invalidCosts = validCosts.length !== input.costs.length;
  const totalMobilityCost = round(validCosts.reduce((sum, item) => sum + item.amount, 0));
  const currencyMismatch = validCosts.some((item) => String(item.currency || "").trim().toUpperCase() !== salaryCurrency);

  const createdAt = input.userCreatedAt ? new Date(input.userCreatedAt) : null;
  const currentDate = new Date();
  let completedMonths: number | null = null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    completedMonths = (currentDate.getUTCFullYear() - createdAt.getUTCFullYear()) * 12
      + currentDate.getUTCMonth() - createdAt.getUTCMonth();
    if (currentDate.getUTCDate() < createdAt.getUTCDate()) completedMonths -= 1;
    completedMonths = Math.max(0, completedMonths);
  }
  const userTenureMonths = completedMonths;
  const tenureFailure = userTenureMonths !== null && userTenureMonths < minimumTenure;
  const companyAgreementAccepted = input.companyMobilityAgreementAccepted === true;
  const recruiterGuaranteeAccepted = input.recruiterGuaranteeAccepted === true;

  const missingInformation: string[] = [];
  if (approvedSalary === null) missingInformation.push("APPROVED_SALARY");
  if (input.costs.length === 0) missingInformation.push("MOBILITY_COSTS");
  if (invalidCosts) missingInformation.push("INVALID_MOBILITY_COSTS");
  if (currencyMismatch) missingInformation.push("MOBILITY_COST_CURRENCY_MISMATCH");
  if (!createdAt || Number.isNaN(createdAt.getTime())) missingInformation.push("USER_CREATED_AT");
  if (tenureFailure) missingInformation.push("USER_TENURE_3_MONTHS");
  if (!companyAgreementAccepted) missingInformation.push("COMPANY_MOBILITY_AGREEMENT");
  if (!recruiterGuaranteeAccepted) missingInformation.push("RECRUITER_GUARANTEE");

  const maximumEligibleCost = approvedSalary === null ? null : round(approvedSalary * threshold / 100);
  const canCompareCurrency = approvedSalary !== null && !currencyMismatch && !invalidCosts && input.costs.length > 0;
  const burdenPercent = canCompareCurrency ? roundPercent((totalMobilityCost / approvedSalary) * 100) : null;
  const base = {
    version: MOBILITY_ELIGIBILITY_VERSION,
    approvedSalary,
    salaryCurrency,
    totalMobilityCost,
    thresholdPercent: threshold,
    maximumEligibleCost,
    burdenPercent,
    companyMobilityAgreementAccepted: companyAgreementAccepted,
    recruiterGuaranteeAccepted,
    repaymentMonths,
    repaymentMonthlyAmount: totalMobilityCost > 0 ? round(totalMobilityCost / repaymentMonths) : null,
    userTenureMonths,
    minimumUserTenureMonths: minimumTenure,
    calculatedAt: now,
  };

  if (tenureFailure) {
    return {
      ...base,
      status: "INELIGIBLE",
      reason: `Ancienneté Jobly insuffisante : ${userTenureMonths} mois, ${minimumTenure} mois requis.`,
      missingInformation,
    };
  }

  if (missingInformation.length > 0) {
    return {
      ...base,
      status: "NEEDS_INFO",
      reason: "La décision reste en attente : le salaire de l'offre acceptée, les coûts comparables, l'ancienneté, la convention employeur et la garantie doivent être vérifiés.",
      missingInformation,
    };
  }

  const eligible = canCompareCurrency && (totalMobilityCost / approvedSalary!) * 100 <= threshold;
  return {
    ...base,
    status: eligible ? "ELIGIBLE" : "INELIGIBLE",
    reason: eligible
      ? `Coût Mobility : ${burdenPercent}% du salaire officiellement approuvé. Le seuil de ${threshold}% est respecté.`
      : `Coût Mobility : ${burdenPercent}% du salaire officiellement approuvé. Le seuil de ${threshold}% est dépassé.`,
    missingInformation: [],
  };
}
