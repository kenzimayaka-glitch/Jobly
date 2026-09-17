export type AiPlan = "FREE" | "START" | "PREMIUM" | "PRO";
export type AiOperation = "INTERVIEW" | "LEARNING" | "APPLICATION_COPILOT" | "CAREER_COMPANION";

/**
 * P5 Free-First economic guardrail.
 * One internal AI credit is budgeted at a maximum of 1 XAF of variable AI spend.
 * This is a Jobly budget ceiling, not a provider price.
 */
export const AI_BUDGET_XAF_PER_CREDIT = 1;

export const AI_CREDITS_BY_PLAN: Record<AiPlan, number> = {
  FREE: 5,
  START: 30,
  PREMIUM: 120,
  PRO: 300,
};

export const AI_OPERATION_COST: Record<AiOperation, number> = {
  INTERVIEW: 3,
  LEARNING: 2,
  APPLICATION_COPILOT: 2,
  CAREER_COMPANION: 1,
};

export function monthlyAiBudgetXaf(plan: AiPlan): number {
  return AI_CREDITS_BY_PLAN[plan] * AI_BUDGET_XAF_PER_CREDIT;
}

export function operationCostXaf(operation: AiOperation): number {
  return AI_OPERATION_COST[operation] * AI_BUDGET_XAF_PER_CREDIT;
}

export function hasEnoughCredits(plan: AiPlan, usedCredits: number, operation: AiOperation): boolean {
  return usedCredits + AI_OPERATION_COST[operation] <= AI_CREDITS_BY_PLAN[plan];
}

/** Deterministic work should run before consuming any AI credit. */
export const P5_GUARDRAILS = {
  deterministicFirst: true,
  cacheBeforeRecompute: true,
  aiOnlyWhenMateriallyUseful: true,
  noAutomaticApplicationSubmission: true,
  userVisibleCreditConsumption: true,
  hardMonthlyQuota: true,
} as const;
