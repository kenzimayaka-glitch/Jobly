export const MOBILITY_ELIGIBILITY_VERSION = "mobility-eligibility-v1";
export const DEFAULT_MOBILITY_THRESHOLD_PERCENT = 35;

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
  reason: string;
  missingInformation: string[];
  calculatedAt: string;
};

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateMobilityEligibility(input: MobilityEligibilityInput): MobilityEligibilityDecision {
  const now = new Date().toISOString();
  const threshold = input.thresholdPercent ?? DEFAULT_MOBILITY_THRESHOLD_PERCENT;
  const salary = input.approvedSalary ?? null;
  const currency = input.salaryCurrency || "XAF";
  const costs = input.costs.filter((item) => Number.isFinite(item.amount) && item.amount >= 0);
  const total = round(costs.reduce((sum, item) => sum + item.amount, 0));
  const missingInformation: string[] = [];

  if (!salary || salary <= 0) missingInformation.push("APPROVED_SALARY");
  if (costs.length === 0) missingInformation.push("MOBILITY_COSTS");

  if (missingInformation.length > 0) {
    return {
      version: MOBILITY_ELIGIBILITY_VERSION,
      status: "NEEDS_INFO",
      approvedSalary: salary,
      salaryCurrency: currency,
      totalMobilityCost: total,
      thresholdPercent: threshold,
      maximumEligibleCost: salary && salary > 0 ? round(salary * threshold / 100) : null,
      burdenPercent: salary && salary > 0 ? round((total / salary) * 100) : null,
      reason: "Le calcul ne peut pas être finalisé tant que les informations obligatoires ne sont pas disponibles.",
      missingInformation,
      calculatedAt: now,
    };
  }

  const maximumEligibleCost = round(salary * threshold / 100);
  const burdenPercent = round((total / salary) * 100);
  const eligible = burdenPercent <= threshold;

  return {
    version: MOBILITY_ELIGIBILITY_VERSION,
    status: eligible ? "ELIGIBLE" : "INELIGIBLE",
    approvedSalary: salary,
    salaryCurrency: currency,
    totalMobilityCost: total,
    thresholdPercent: threshold,
    maximumEligibleCost,
    burdenPercent,
    reason: eligible
      ? `Le coût Mobility représente ${burdenPercent}% du salaire approuvé, sous le seuil de ${threshold}%.`
      : `Le coût Mobility représente ${burdenPercent}% du salaire approuvé, au-dessus du seuil de ${threshold}%.`,
    missingInformation: [],
    calculatedAt: now,
  };
}
