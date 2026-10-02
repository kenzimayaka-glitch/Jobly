import { adminClient } from "@/lib/server-auth";
import { publishTraceEvent } from "@/lib/jia/eventBus";
import {
  scoreWatchObservation,
  type WatchIntelligenceDecision,
} from "@/lib/jia/watchIntelligenceScoring";

type Observation = {
  facts?: string[];
  changes?: unknown[];
  confidence?: number;
  status?: string;
  context?: Record<string, unknown>;
  supportingSources?: string[];
  contradictingSources?: string[];
  sourcesUsed?: Array<{ url: string; title?: string; authority?: number; confidence?: number }>;
};

export async function evaluateWatchSignal(args: {
  runId: string;
  subscriptionId: string;
  userId: string;
  query: string;
  key: string;
  domain: string;
  changed: boolean;
  observation: Observation;
}) {
  const db = adminClient();
  const scored = scoreWatchObservation(args.observation, args.changed);
  const memoryKey = "external:" + args.query.trim().toLowerCase();

  const { data: memory } = await db
    .from("jia_memory")
    .select("id,recurrence_count,confidence,relevance,importance")
    .eq("user_id", args.userId)
    .eq("contradiction_key", memoryKey)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reason = !args.changed
    ? "Aucun changement substantiel détecté."
    : args.observation.status === "CONTESTED"
      ? "Signal nouveau mais contradictoire : validation humaine recommandée avant d'en faire une information ferme."
      : scored.decision === "NOTIFY"
        ? "Changement nouveau, suffisamment pertinent, impactant et fiable pour une alerte."
        : scored.decision === "DIGEST"
          ? "Changement utile mais insuffisamment prioritaire pour une alerte immédiate."
          : "Signal observé mais seuil de remontée non atteint.";

  let notificationId: string | null = null;
  const eligible = scored.decision === "NOTIFY" || scored.decision === "REVIEW";

  if (eligible) {
    const notificationKey = `JIA_WATCH:${args.subscriptionId}:${args.runId}`;
    const { data: existing } = await db
      .from("Notification")
      .select("id")
      .eq("userId", args.userId)
      .eq("entityId", notificationKey)
      .maybeSingle();

    if (existing?.id) {
      notificationId = existing.id;
    } else {
      const title = scored.decision === "REVIEW" ? "J’IA a détecté un signal à vérifier" : "J’IA a détecté un changement important";
      const firstFact = args.observation.facts?.[0] ?? "Un changement a été détecté dans votre veille.";
      const body = scored.decision === "REVIEW"
        ? `${firstFact} Sources contradictoires détectées : vérification recommandée.`
        : firstFact;

      const { data: notification, error } = await db.from("Notification").insert({
        userId: args.userId,
        type: "JIA_WATCH",
        title,
        body,
        entityId: notificationKey,
        actionType: "JIA_WATCH_REVIEW",
        actionPayload: {
          subscriptionId: args.subscriptionId,
          runId: args.runId,
          decision: scored.decision,
          confidence: args.observation.confidence ?? 0,
          relevance: scored.relevance,
          impact: scored.impact,
          contradictionScore: scored.contradictionScore,
          key: args.key,
          domain: args.domain,
        },
        channels: { push: false, email: false, inApp: true },
      }).select("id").single();

      if (error) throw new Error(error.message);
      notificationId = notification.id;
    }
  }

  const now = new Date().toISOString();
  await db.from("JiaWatchRun").update({
    intelligenceDecision: scored.decision,
    relevanceScore: scored.relevance,
    impactScore: scored.impact,
    noveltyScore: scored.novelty,
    contradictionScore: scored.contradictionScore,
    notificationEligible: eligible,
    decisionReason: reason,
    memoryId: memory?.id ?? null,
    evaluatedAt: now,
    notificationId,
  }).eq("id", args.runId);

  await publishTraceEvent(db, {
    userId: args.userId,
    type: "JIA_WATCH_INTELLIGENCE",
    ecosystem: args.domain,
    source: "JIA_WATCH_INTELLIGENCE",
    correlationId: args.runId,
    payload: { watchKey: args.key, query: args.query, decision: scored.decision },
  }, {
    stage: scored.decision === "SUPPRESS" ? "EVALUATION" : "INSIGHT",
    title: "Décision intelligente de veille",
    content: reason,
    confidence: scored.certainty >= 0.78 ? "HIGH" : scored.certainty >= 0.58 ? "MEDIUM" : "LOW",
    evidence: args.observation.sourcesUsed ?? [],
    status: "COMPLETED",
    metadata: {
      runId: args.runId,
      subscriptionId: args.subscriptionId,
      changed: args.changed,
      relevance: scored.relevance,
      impact: scored.impact,
      novelty: scored.novelty,
      contradictionScore: scored.contradictionScore,
      priority: scored.priority,
      memoryId: memory?.id ?? null,
      recurrenceCount: memory?.recurrence_count ?? 0,
      notificationId,
    },
  });

  return { ...scored, notificationEligible: eligible, notificationId, memoryId: memory?.id ?? null, reason };
}
