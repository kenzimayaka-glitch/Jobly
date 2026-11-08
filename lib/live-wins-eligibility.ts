export const LIVE_WINS_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

type RecruiterJobLink = { recruiterUserId?: string | null } | Array<{ recruiterUserId?: string | null }> | null;

export type LiveWinApplicationCandidate = {
  id: string;
  userId?: string | null;
  status?: string | null;
  statusSource?: string | null;
  updatedAt?: string | null;
  recruiterJob?: RecruiterJobLink;
};

/**
 * Only a recruiter-confirmed OFFER is social-proof eligible.
 * The candidate and recruiter currently viewing Jobly are excluded.
 */
export function isEligibleLiveWin(
  candidate: LiveWinApplicationCandidate,
  currentUserId: string,
  now = Date.now(),
): boolean {
  if (!currentUserId || candidate.status !== "OFFER" || candidate.statusSource !== "RECRUITER") {
    return false;
  }

  const recruiter = Array.isArray(candidate.recruiterJob)
    ? candidate.recruiterJob[0]
    : candidate.recruiterJob;
  const recruiterUserId = recruiter?.recruiterUserId;
  const occurredAt = candidate.updatedAt ? Date.parse(candidate.updatedAt) : Number.NaN;

  return Boolean(
    candidate.id &&
    candidate.userId &&
    candidate.userId !== currentUserId &&
    recruiterUserId &&
    recruiterUserId !== currentUserId &&
    Number.isFinite(occurredAt) &&
    occurredAt <= now &&
    occurredAt >= now - LIVE_WINS_LOOKBACK_MS
  );
}
