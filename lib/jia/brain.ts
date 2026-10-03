import type { AiOperation } from "../aiEconomics";
import { runAiOrchestrator } from "../ai/orchestrator";
import { adminClient } from "../server-auth";
import { actionForIntent, isFinancialRequest } from "./guard";
import { observeInternet } from "./internet";
import { buildJiaContext } from "@/lib/jiaContext";

export type JiaBrainInput = {
  userId: string;
  ecosystem?: "TALENT" | "RECRUITER" | "PARTNER";
  message?: string;
  path?: string;
  action?: string;
  proactive?: boolean;
  /** Langue de l’interface (FR par défaut) : pilote la langue de la réponse. */
  lang?: "fr" | "en";
  recentDialogue?: string[];
};

export type JiaBrainResult = {
  message: string;
  intent: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  proposedAction?: { type: string; target?: string; requiresConfirmation: boolean };
  provider: string;
  sources?: Array<{ title: string; url: string; snippet: string }>;
  traceId?: string;
};

const EMPTY: Record<"fr" | "en", string> = {
  fr: "Je suis prête. Donne-moi ton objectif, ta situation actuelle et ce qui te bloque ; je relierai ta demande à ton parcours, tes compétences et la prochaine action utile.",
  en: "I’m ready. Tell me your goal, current situation, and what is blocking you; I’ll connect it to your career context and the next useful action.",
};

const CONTEXTUAL_FALLBACKS: Record<string, string[]> = {
  OPPORTUNITY: [
    "Je vais croiser cette recherche avec ton profil et tes critères, puis te dire quelles opportunités méritent vraiment ton attention.",
    "Je peux comparer les opportunités, repérer les écarts de compétences et te proposer une stratégie plutôt qu’une simple liste d’offres.",
    "Je vais regarder au-delà du titre du poste : niveau attendu, environnement, progression possible et adéquation avec ta trajectoire.",
    "Je peux classer les pistes par pertinence, expliquer les compromis et te dire laquelle mérite une candidature en premier.",
    "Cette recherche peut devenir un plan concret : sélection, adaptation du profil, candidature et suivi des réponses.",
    "Je vais vérifier ce qui est réellement demandé sur le marché et distinguer une opportunité prometteuse d’une offre simplement visible.",
  ],
  APPLICATION: [
    "Je vais regarder où se situe ta candidature dans le parcours et préparer la prochaine relance ou amélioration utile.",
    "Je peux relier cette candidature à ton expérience, adapter ton argumentaire et identifier ce qui augmente réellement tes chances.",
    "Je vais analyser le poste, ton profil et le message envoyé pour trouver le point précis à renforcer.",
    "Si la candidature stagne, je peux proposer une relance adaptée au délai, au recruteur et au contexte de l’offre.",
    "Je peux transformer cette candidature en apprentissage : ce qui a fonctionné, ce qui manque et ce que l’on teste ensuite.",
    "Je vais t’aider à construire une candidature crédible, spécifique au poste, sans inventer d’expérience que tu n’as pas.",
  ],
  INTERVIEW: [
    "Je vais partir du poste visé et de ton expérience pour te faire travailler les réponses qui comptent vraiment.",
    "On peut simuler l’entretien, repérer tes points faibles et construire des réponses crédibles à partir de ton parcours.",
    "Je peux anticiper les questions liées au poste, préparer tes exemples et t’aider à répondre avec plus de précision.",
    "Je vais distinguer le contenu de ta réponse, ta posture et la preuve apportée pour travailler le bon levier.",
    "Tu peux me donner une offre ou une question difficile : je la relierai à ton expérience plutôt que de fournir une réponse standard.",
    "Je peux préparer une simulation progressive, avec un retour après chaque réponse et un plan d’amélioration mesurable.",
  ],
  LEARNING: [
    "Je vais relier cette compétence à ton objectif professionnel et construire un apprentissage qui produit une preuve concrète.",
    "Je peux t’aider à choisir quoi apprendre, dans quel ordre, et comment le démontrer dans ton profil.",
    "Je vais identifier la compétence qui débloque le plus ta trajectoire, plutôt que de te proposer une formation au hasard.",
    "On peut transformer cet apprentissage en projet, résultat ou portfolio que tu pourras réellement présenter.",
    "Je vais comparer le niveau demandé, ton niveau actuel et le chemin le plus court pour réduire l’écart.",
    "Je peux créer un plan réaliste selon ton temps disponible, ton objectif et la preuve attendue par les recruteurs.",
  ],
  MOBILITY: [
    "Je vais comparer les options de mobilité avec ton projet, tes contraintes et les opportunités réellement accessibles.",
    "Je peux analyser les marchés, les compétences demandées et les compromis avant de te recommander une destination.",
    "Je vais croiser la mobilité avec le coût, la langue, le secteur et les perspectives, pas seulement avec une carte.",
    "Je peux te montrer ce qui change selon la ville ou le pays : salaire, accès aux offres et compétences recherchées.",
    "Avant de recommander un départ, je vais vérifier si ton profil est prêt et quelles étapes réduisent le risque.",
    "Je peux comparer plusieurs scénarios de mobilité et te laisser choisir selon tes priorités réelles.",
  ],
  CAREER: [
    "Je vais prendre en compte ton parcours, tes signaux récents et ton objectif pour te proposer une prochaine étape précise.",
    "Je ne veux pas te donner un conseil générique : donne-moi le résultat que tu vises et je relierai les choix à ta trajectoire.",
    "Je vais regarder ce qui a changé récemment dans ton parcours pour identifier une décision utile maintenant.",
    "Je peux t’aider à passer d’une intention à un plan : objectif, écart, action, échéance et preuve de progression.",
    "Si tu hésites entre plusieurs directions, je peux les comparer avec tes compétences, tes contraintes et tes perspectives.",
    "Je vais partir de ta situation réelle, pas d’un modèle de carrière abstrait, pour déterminer le prochain mouvement pertinent.",
  ],
};
const FINANCIAL_REPLY: Record<"fr" | "en", string> = {
  fr: "Je peux expliquer ou guider un paiement, mais je ne peux jamais l’exécuter ni le confirmer.",
  en: "I can explain or guide you through a payment, but I can never run or confirm it.",
};

function clean(value: unknown, max = 1200) {
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

function needsWebResearch(message: string) {
  return /\b(aujourd'hui|actualit|dernier|dernière|récent|maintenant|sur internet|en ligne|cherche|recherche|compare|prix|salaire|marché|offre|emploi|formation|événement|réglementation|202[4-9])\b/i.test(message);
}


export async function runJiaBrain(input: JiaBrainInput): Promise<JiaBrainResult> {
  const sb = adminClient();
  const [{ context: userContext }, assessment] = await Promise.all([
    buildJiaContext(sb, input.userId, { operation: "BRAIN" }),
    sb.from("CareerAssessment").select("readiness,gaps,nextBestAction,computedAt").eq("userId", input.userId).order("computedAt",{ascending:false}).limit(1).maybeSingle(),
  ]);
  const memory = userContext?.memory || [];
  const events = userContext?.behavior?.recent || [];
  const lang: "fr" | "en" = input.lang === "en" ? "en" : "fr";
  const context = {
    responseLanguage: lang === "en" ? "English" : "français",
    ecosystem: input.ecosystem || "TALENT",
    path: clean(input.path, 160),
    action: clean(input.action, 240),
    message: clean(input.message, 1200),
    proactive: Boolean(input.proactive),
    memory,
    recentEvents: events,
    assessment: assessment.data || null,
    recentDialogue: (input.recentDialogue || []).filter(Boolean).slice(-6),
  };

  const greeting = /^(bonjour|bonsoir|salut|hello|coucou|hey|bjr)\b[!?., ]*$/i.test(context.message);
  if (greeting) {
    const greetingReplies = lang === "en"
      ? ["Hello. I’m here with you. Tell me what you want to accomplish today.", "Hello. I’m ready to pick up your career context. What would you like to move forward?", "Hi. I’m listening. We can explore an opportunity, unblock an application, or plan your next step."]
      : ["Bonjour. Je suis avec toi. Dis-moi ce que tu veux accomplir aujourd’hui.", "Bonjour. Je suis prête à reprendre ton contexte de carrière. Qu’aimerais-tu faire avancer ?", "Bonjour. Je t’écoute. On peut explorer une opportunité, débloquer une candidature ou préparer la suite de ton parcours."];
    const message = greetingReplies[context.message.length % greetingReplies.length];
    const trace = await sb.from("JiaIntelligenceTrace").insert({
      userId: input.userId, stage: "INSIGHT", title: "J’IA greeting", content: message,
      confidence: "HIGH", evidence: { path: context.path }, sourceType: "JIA_BRAIN", sourceRef: "lib/jia/brain",
      status: "COMPLETED", metadata: { provider: "DETERMINISTIC", ecosystem: context.ecosystem },
    }).select("id").single();
    return { message, intent: "GREETING", confidence: "HIGH", provider: "DETERMINISTIC", ...(trace.data?.id ? { traceId: String(trace.data.id) } : {}) };
  }

  const webSignal = needsWebResearch(context.message) ? await observeInternet(context.message, { mode: "READ", maxQueries: 3, maxSources: 5 }) : null;
  const sources = webSignal?.observation.sourcesUsed.map((source) => ({ title: source.title, url: source.url, snippet: source.content.slice(0, 500), trust: source.authority >= 0.8 ? "HIGH" : "MEDIUM" as const })) || [];
  const webResearch = sources.length > 0
    ? `Sources web vérifiées par Internet Brain; elles restent des preuves, pas des faits garantis:\n${sources.map((source) => `- [${source.trust}] ${source.title} — ${source.url}\n  ${source.snippet}`).join("\n")}`
    : (webSignal?.observation.limitations?.join("; ") || "Aucune source web exploitable trouvée.");

  const operation: AiOperation =
    input.ecosystem === "RECRUITER" ? "OFFER_INTELLIGENCE" :
    input.ecosystem === "PARTNER" ? "CAREER_COMPANION" : "CAREER_COMPANION";

  let provider = "DETERMINISTIC";
  let generated: Record<string, unknown> | null = null;
  try {
    const result = await runAiOrchestrator(
      operation,
      { message: context.message, webResearch },
      { ...context, webResearch },
      "QUALITY",
    );
    provider = result.provider;
    generated = extractJson(result.output);
  } catch {}

  const intent = normalizeIntent(context.message);
  const financialRequest = isFinancialRequest(context.message);
  // Barrière financière : évaluée AVANT toute action (cf. lib/jia/guard.ts).
  const fallbackAction = financialRequest ? undefined : actionForIntent(intent, context.message);
  const fallbackPool = CONTEXTUAL_FALLBACKS[intent] || CONTEXTUAL_FALLBACKS.CAREER;
  const fallbackMessage = fallbackPool[(context.message.length + events.length) % fallbackPool.length];
  let message = financialRequest
    ? FINANCIAL_REPLY[lang]
    : (clean(generated?.message, 1200) || (sources.length > 0
      ? (lang === "en" ? `I found ${sources.length} relevant web sources. I can compare them with your career context.` : `J’ai trouvé ${sources.length} sources web pertinentes. Je peux maintenant les comparer à ton contexte de carrière.`)
      : clean(assessment.data?.nextBestAction, 1200) || (lang === "en" ? fallbackMessage : fallbackMessage)));
  const previousAnswer = context.recentDialogue[context.recentDialogue.length - 1]?.trim().toLocaleLowerCase();
  if (message.trim().toLocaleLowerCase() === previousAnswer) {
    const alternative = fallbackPool.find((candidate) => candidate.trim().toLocaleLowerCase() !== previousAnswer) || EMPTY[lang];
    message = alternative;
  }

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
    evidence: { path: context.path, action: context.action, intent, memoryCount: memory.length || 0, eventCount: events.length, webSources: sources.map((source) => source.url), webConfidence: webSignal?.observation.confidence ?? 0, webStatus: webSignal?.observation.status ?? "UNKNOWN", contradictions: webSignal?.observation.contradictingSources ?? [] },
    sourceType: "JIA_BRAIN",
    sourceRef: "lib/jia/brain",
    status: "COMPLETED",
    metadata: { provider, ecosystem: context.ecosystem, proactive: context.proactive },
  }).select("id").single();

  return { message, intent, confidence, proposedAction, provider, sources, ...(trace.data?.id ? { traceId:String(trace.data.id) } : {}) };
}
