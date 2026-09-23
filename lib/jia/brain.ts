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

type WebSource = { title: string; url: string; snippet: string; domain: string; trust: "HIGH" | "MEDIUM" };

const TRUSTED_WEB_DOMAINS = new Set([
  "francetravail.fr", "service-public.fr", "legifrance.gouv.fr", "insee.fr", "who.int", "europa.eu",
  "linkedin.com", "indeed.com", "glassdoor.fr", "apec.fr", "oniseptv.onisep.fr", "onisep.fr",
]);

function normalizeWebUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol) || url.hostname === "localhost" || url.hostname.endsWith(".local")) return null;
    [...url.searchParams.keys()].forEach((key) => { if (/^utm_|^gclid$|^fbclid$/i.test(key)) url.searchParams.delete(key); });
    return url;
  } catch { return null; }
}

function needsWebResearch(message: string) {
  return /\b(aujourd'hui|actualit|dernier|dernière|récent|maintenant|sur internet|en ligne|cherche|recherche|compare|prix|salaire|marché|offre|emploi|formation|événement|réglementation|202[4-9])\b/i.test(message);
}

async function searchWeb(query: string): Promise<WebSource[]> {
  if (!query.trim()) return [];
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.slice(0, 300))}`, {
      headers: { "User-Agent": "Jobly-JIA/1.0" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const html = await response.text();
    const sources: WebSource[] = [];
    const pattern = /result__a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?result__snippet[^>]*>([\s\S]*?)<\/a?>/gi;
    for (const match of html.matchAll(pattern)) {
      const parsed = normalizeWebUrl(match[1].replace(/&amp;/g, "&"));
      if (!parsed || sources.some((source) => source.url === parsed.href) || sources.some((source) => source.domain === parsed.hostname)) continue;
      const cleanText = (value: string) => value.replace(/<[^>]+>/g, "").replace(/&(?:amp|quot|#39|lt|gt);/g, " ").replace(/\s+/g, " ").trim();
      const domain = parsed.hostname.replace(/^www\./, "");
      sources.push({ title: cleanText(match[2]).slice(0, 180), url: parsed.href, domain, trust: TRUSTED_WEB_DOMAINS.has(domain) ? "HIGH" : "MEDIUM", snippet: cleanText(match[3]).slice(0, 400) });
      if (sources.length === 5) break;
    }
    sources.sort((a, b) => Number(b.trust === "HIGH") - Number(a.trust === "HIGH"));
    return sources;
  } catch {
    return [];
  }
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

  const sources = needsWebResearch(context.message) ? await searchWeb(context.message) : [];
  const webResearch = sources.length > 0
    ? `Sources web récentes (à vérifier, jamais des faits garantis; confiance: HIGH = domaine institutionnel ou spécialisé connu, MEDIUM = source à vérifier):\n${sources.map((source) => `- [${source.trust}] ${source.title} — ${source.url}\n  ${source.snippet}`).join("\n")}`
    : "Aucune source web fiable trouvée.";

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
  const fallbackMessage = fallbackPool[(context.message.length + (events.data?.length || 0)) % fallbackPool.length];
  const message = financialRequest
    ? FINANCIAL_REPLY[lang]
    : (clean(generated?.message, 1200) || (sources.length > 0
      ? (lang === "en" ? `I found ${sources.length} relevant web sources. I can compare them with your career context.` : `J’ai trouvé ${sources.length} sources web pertinentes. Je peux maintenant les comparer à ton contexte de carrière.`)
      : clean(assessment.data?.nextBestAction, 1200) || (lang === "en" ? fallbackMessage : fallbackMessage)));
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
    evidence: { path: context.path, action: context.action, intent, memoryCount: memory.data?.length || 0, eventCount: events.data?.length || 0, webSources: sources.map((source) => source.url) },
    sourceType: "JIA_BRAIN",
    sourceRef: "lib/jia/brain",
    status: "COMPLETED",
    metadata: { provider, ecosystem: context.ecosystem, proactive: context.proactive },
  }).select("id").single();

  return { message, intent, confidence, proposedAction, provider, sources, ...(trace.data?.id ? { traceId:String(trace.data.id) } : {}) };
}
