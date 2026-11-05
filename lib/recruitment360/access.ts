export const RECRUITMENT_READ_ROLES = ["OWNER", "HR", "MANAGER", "DELEGATE", "JURY", "DG_READONLY"] as const;
export const RECRUITMENT_WRITE_ROLES = ["OWNER", "HR", "MANAGER", "DELEGATE"] as const;
export const RECRUITMENT_STATE_ROLES = ["OWNER", "HR", "MANAGER", "DELEGATE", "JURY"] as const;

const STEP_NUMBER: Record<string, number> = {
  SENT: 0, RECEIVED: 1, REVIEW: 2, SELECTED: 3, TEST: 4, INTERVIEW: 5,
  FINALIST: 6, OFFER: 7, HIRED: 8, POOL: 9, REJECTED: 9, WITHDRAWN: 9, OFFER_DECLINED: 9,
};
const TERMINAL_STATES = new Set(["REJECTED", "WITHDRAWN", "HIRED", "OFFER_DECLINED"]);

export function hasRecruitmentRole(role: unknown, allowedRoles: readonly string[] = RECRUITMENT_READ_ROLES): boolean {
  return allowedRoles.includes(String(role ?? "").trim().toUpperCase());
}
export type TransitionActor = "RECRUITER" | "CANDIDATE";

export function validateApplicationTransition(
  actor: TransitionActor,
  currentStateValue: unknown,
  nextStateValue: unknown,
  exceptionReasonValue: unknown,
): string | null {
  const currentState = String(currentStateValue ?? "").trim().toUpperCase();
  const nextState = String(nextStateValue ?? "").trim().toUpperCase();
  const reason = String(exceptionReasonValue ?? "").trim();
  if (!Object.prototype.hasOwnProperty.call(STEP_NUMBER, nextState)) return "INVALID_APPLICATION_STATE";
  if (!Object.prototype.hasOwnProperty.call(STEP_NUMBER, currentState)) return "CURRENT_APPLICATION_STATE_INVALID";
  if (actor === "CANDIDATE") {
    if (nextState === "WITHDRAWN") return TERMINAL_STATES.has(currentState) ? "CANDIDATE_TRANSITION_FORBIDDEN" : null;
    return "CANDIDATE_TRANSITION_FORBIDDEN";
  }
  if (TERMINAL_STATES.has(currentState) && reason.length < 5) return "LOCKED_STATE_EXCEPTION_REASON_REQUIRED";
  if (STEP_NUMBER[nextState] < STEP_NUMBER[currentState] && reason.length < 5) return "BACKWARD_TRANSITION_REQUIRES_REASON";
  return null;
}
export function applicationStepNumber(stateValue: unknown): number {
  const state=String(stateValue ?? "").trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(STEP_NUMBER,state)?STEP_NUMBER[state]:-1;
}
