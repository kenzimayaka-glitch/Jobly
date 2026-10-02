import { getActivePlanCode } from "./entitlements";
import type { PlanCode } from "./billingCatalog";

export type CareerJourneyEntitlements = {
  plan: PlanCode;
  canReassess: boolean;
  maxActiveMissions: number;
  assessmentsPerMonth: number;
  canAdaptiveAssessments: boolean;
  canScenarioSimulation: boolean;
  canCareerRadar: boolean;
  canPeriodicReview: boolean;
  canAdvancedPortfolio: boolean;
};

export async function getCareerJourneyEntitlements(supabase: any, userId: string): Promise<CareerJourneyEntitlements> {
  const plan = await getActivePlanCode(supabase, userId, "TALENT");
  const map: Record<PlanCode, Omit<CareerJourneyEntitlements, "plan">> = {
    FREE: { canReassess: true, maxActiveMissions: 1, assessmentsPerMonth: 1, canAdaptiveAssessments: false, canScenarioSimulation: false, canCareerRadar: false, canPeriodicReview: false, canAdvancedPortfolio: false },
    START: { canReassess: true, maxActiveMissions: 3, assessmentsPerMonth: 3, canAdaptiveAssessments: false, canScenarioSimulation: false, canCareerRadar: false, canPeriodicReview: true, canAdvancedPortfolio: false },
    PREMIUM: { canReassess: true, maxActiveMissions: 10, assessmentsPerMonth: 10, canAdaptiveAssessments: true, canScenarioSimulation: true, canCareerRadar: true, canPeriodicReview: true, canAdvancedPortfolio: true },
    PRO: { canReassess: true, maxActiveMissions: Number.POSITIVE_INFINITY, assessmentsPerMonth: Number.POSITIVE_INFINITY, canAdaptiveAssessments: true, canScenarioSimulation: true, canCareerRadar: true, canPeriodicReview: true, canAdvancedPortfolio: true },
  };
  return { plan, ...map[plan] };
}
