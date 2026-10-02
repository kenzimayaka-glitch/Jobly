export type WatchIntelligenceDecision = "SUPPRESS" | "DIGEST" | "NOTIFY" | "REVIEW";

export type WatchIntelligenceObservation = {
  confidence?: number;
  status?: string;
  context?: Record<string, unknown>;
  contradictingSources?: string[];
};

const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

function numberContext(context: Record<string, unknown> | undefined, key: string, fallback: number) {
  const value = Number(context?.[key]);
  return Number.isFinite(value) ? clamp(value) : fallback;
}

export function scoreWatchObservation(
  observation: WatchIntelligenceObservation,
  changed: boolean,
) {
  const confidence = clamp(Number(observation.confidence ?? 0));
  const relevance = numberContext(observation.context, "relevance", changed ? 0.7 : 0.2);
  const impact = numberContext(observation.context, "impact", changed ? 0.6 : 0.2);
  const contradictionCount = observation.contradictingSources?.length ?? 0;
  const contradictionScore = clamp(contradictionCount / 3);
  const novelty = changed ? 1 : 0;

  const certainty = clamp(confidence * (1 - contradictionScore * 0.45));
  const priority = clamp(
    relevance * 0.35 +
      impact * 0.30 +
      novelty * 0.20 +
      certainty * 0.15,
  );

  let decision: WatchIntelligenceDecision = "SUPPRESS";
  if (!changed) decision = "SUPPRESS";
  else if (observation.status === "CONTESTED" && impact >= 0.65) decision = "REVIEW";
  else if (priority >= 0.72 && certainty >= 0.60) decision = "NOTIFY";
  else if (priority >= 0.48 && certainty >= 0.45) decision = "DIGEST";

  return {
    decision,
    relevance,
    impact,
    novelty,
    contradictionScore,
    certainty,
    priority,
  };
}
