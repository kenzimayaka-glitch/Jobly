import type { AiOperation } from "../aiEconomics";
import { runAiOrchestrator } from "../ai/orchestrator";
import { adminClient } from "../server-auth";
import { actionForIntent, isFinancialRequest } from "./guard";

export type JiaBrainInput = {
  userId: string;
  ecosystem?: "TALENT" | "RECRUITER" | "PARTNER";
  message?: string;
  path?: string;
  action?: string;
  proactive?: boolean;
  /** Langue de l’interface (FR par défaut) : pilote la langue de la réponse. */
  lang?: "fr" | "en";
};

export type JiaBrainResult = {
  message: string;
  intent: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  proposedAction?: { type: string; target?: string; requiresConfirmation: boolean };
  provider: string;
  traceId?: string;
};

const EMPTY: Record<"fr" | "en", string> = {
  fr: "Je suis prête. Donne-moi ton objectif et je vais déterminer la prochaine action utile.",
  en: "I’m ready. Tell me your goal and I’ll work out the next useful step.",
};
const FINANCIAL_REPLY: Record<"fr" | "en", string> = {
  fr: "Je peux expliquer ou guider un paiement, mais je ne peux jamais l’exécuter ni le confirmer.",
  en: "I can explain or guide you through a payment, but I can never run or confirm it.",
};

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function extractJson(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return value && typeof value === "object" ? value as Record<string, unknown> : null;
  try { return JSON.parse(value.replace(/^\s*\`\`\`json\s*/i, "").replace(/\s*\`\`\`\s*$/i, "")); } catch { return null; }
}

function normalizeIntent(message: string) {
  const m = message.toLowerCase();
  if (/\b(offre|offres|emploi|emplois|poste|job|jobs|offer|offers|vacancy|vacancies)\b/.test(m)) return "OPPORTUNITY";
  if (/\b(candidature|postule|postuler|cv|apply|application|resume)\b/.test(m)) return "APPLICATION";
  if (/\b(entretien|interview)\b/.test(m)) return "INTERVIEW";
  if (/\b(apprendre|formation|skill|compétence)\b/.test(m)) return "LEARNING";
  if (/\b(mobilité|déménag|ville|pays)\b/.test(m)) return "MOBILITY";
  if (/\b(recrut|candidat|talent)\b/.test(m)) return "RECRUITMENT";
  if (/\b(partenaire|commission|parrain)\b/.test(m)) return "PARTNER";
  return "CAREER";
}

export async function runJiaBrain(input: JiaBrainInput): Promise<JiaBrainResult> {
  const sb = adminClient();
  const [memory, events, assessment] = await Promise.all([
    sb.from("JiaMemory").select("category,key,value,confidence,lastObservedAt").eq("userId", input.userId).order("confidence",{ascending:false}).order("lastObservedAt",{ascending:false}).limit(24),
    sb.from("JiaEvent").select("eventType,path,metadata,createdAt").eq("userId", input.userId).order("createdAt",{ascending:false}).limit(20),
    sb.from("CareerAssessment").select("readiness,gaps,nextBestAction,computedAt").eq("userId", input.userId).order("computedAt",{ascending:false}).limit(1).maybeSingle(),
  ]);

  const lang: "fr" | "en" = input.lang === "en" ? "en" : "fr";
  const context = {
    responseLanguage: lang === "en" ? "English" : "français",
    ecosystem: input.ecosystem || "TALENT",
    path: clean(input.path, 160),
    action: clean(input.action, 240),
    message: clean(input.message, 1200),
    proactive: Boolean(input.proactive),
    memory: memory.data || [],
    recentEvents: events.data || [],
    assessment: assessment.data || null,
  };

  const operation: AiOperation =
    input.ecosystem === "RECRUITER" ? "OFFER_INTELLIGENCE" :
    input.ecosystem === "PARTNER" ? "CAREER_COMPANION" : "CAREER_COMPANION";

  let provider = "DETERMINISTIC";
  let generated: Record<string, unknown> | null = null;
  try {
    const result = await runAiOrchestrator(operation, { message: context.message }, context, "QUALITY");
    provider = result.provider;
    generated = extractJson(result.output);
  } catch {}

  const intent = normalizeIntent(context.message);
  const financialRequest = isFinancialRequest(context.message);
  // Barrière financière : évaluée AVANT toute action (cf. lib/jia/guard.ts).
  const fallbackAction = financialRequest ? undefined : actionForIntent(intent, context.message);
  const message = financialRequest
    ? FINANCIAL_REPLY[lang]
    : (clean(generated?.message, 500) || clean(assessment.data?.nextBestAction, 500) || EMPTY[lang]);
  const confidence = generated?.confidence === "HIGH" || generated?.confidence === "MEDIUM" ? generated.confidence : "MEDIUM";
  const proposedAction = financialRequest ? undefined : (generated?.proposedAction && typeof generated.proposedAction === "object"
    ? generated.proposedAction as JiaBrainResult["proposedAction"]
    : fallbackAction);

  const trace = await sb.from("JiaIntelligenceTrace").insert({
    userId: input.userId,
    stage: input.proactive ? "RECOMMENDATION" : "INSIGHT",
    title: "J’IA Brain decision",
    content: message,
    confidence,
    evidence: { path: context.path, action: context.action, intent, memoryCount: memory.data?.length || 0, eventCount: events.data?.length || 0 },
    sourceType: "JIA_BRAIN",
    sourceRef: "lib/jia/brain",
    status: "COMPLETED",
    metadata: { provider, ecosystem: context.ecosystem, proactive: context.proactive },
  }).select("id").single();

  return { message, intent, confidence, proposedAction, provider, ...(trace.data?.id ? { traceId:String(trace.data.id) } : {}) };
}
