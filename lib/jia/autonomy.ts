/**
 * J’IA — free local autonomy engine.
 *
 * Loop: OBSERVE -> EVALUATE -> DECIDE -> ACT.
 * No paid model is required for the autonomous core.
 * Experience is kept as compact, non-sensitive local signals.
 */

export type JiaLang = "fr" | "en" | "es";

export type JiaObservation = {
  path: string;
  lastAction: string;
  idleMs: number;
  recentActions: string[];
  profileCompletion?: number;
  matchingOffers?: number;
  pendingApplications?: number;
  currentLanguage?: JiaLang;
  externalSignal?: { summary: string; confidence: number; status: "CONFIRMED" | "LIKELY" | "CONTESTED" | "UNKNOWN" };
};

export type JiaDecision = {
  id: string;
  reason: string;
  message: Record<JiaLang, string>;
  gesture: "curious" | "analyze" | "encourage" | "reassure" | "celebrate" | "proud" | "welcome";
  move:
    | "idle"
    | "listen_tilt"
    | "think_chin"
    | "explain_open"
    | "point_you"
    | "point_button"
    | "hand_chest"
    | "celebrate_jump";
  priority: number;
  speak: boolean;
};

type Experience = Record<string, { seen: number; lastAt: number }>;

const KEY = "jobly-jia-autonomy-v1";
const COOLDOWN_MS = 90_000;

function readExperience(): Experience {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) || "{}") as Experience; } catch { return {}; }
}

function writeExperience(value: Experience) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
}

function score(id: string, base: number, experience: Experience) {
  const item = experience[id];
  if (!item) return base;
  const age = Date.now() - item.lastAt;
  if (age < COOLDOWN_MS) return -Infinity;
  // Familiar situations become slightly easier to anticipate, but repetition is penalized.
  return base + Math.min(item.seen, 5) * 0.8 + Math.min(age / 300_000, 2);
}

export function observe(input: JiaObservation): JiaObservation {
  return {
    ...input,
    path: input.path.slice(0, 160),
    lastAction: input.lastAction.slice(0, 180),
    recentActions: input.recentActions.slice(-8),
  };
}

export function evaluate(o: JiaObservation) {
  const signals: Array<{ id: string; priority: number; reason: string }> = [];

  if (/\/jobs(?:\/|$)/.test(o.path) && o.idleMs >= 12_000 && (o.matchingOffers ?? 0) > 0) {
    signals.push({ id: "jobs_idle_match", priority: 8, reason: "L’utilisateur consulte des offres pertinentes sans agir." });
  }
  if (/\/candidatures/.test(o.path) && o.idleMs >= 10_000 && (o.pendingApplications ?? 0) > 0) {
    signals.push({ id: "application_followup", priority: 8, reason: "Une candidature semble nécessiter une prochaine étape." });
  }
  if ((o.profileCompletion ?? 100) < 70 && o.idleMs >= 8_000) {
    signals.push({ id: "profile_gap", priority: 7, reason: "Le profil présente encore un manque exploitable." });
  }
  if (/\/career|\/career-os/.test(o.path) && o.idleMs >= 10_000) {
    signals.push({ id: "career_next_step", priority: 6, reason: "Le parcours carrière est ouvert sans action récente." });
  }
  if (o.externalSignal && o.externalSignal.confidence >= 0.78 && o.externalSignal.status !== "CONTESTED") {
    signals.push({ id: "external_signal", priority: 9, reason: "Le Internet Brain a détecté une information externe suffisamment crédible pour une initiative." });
  }
  if (o.lastAction && /rechercher|search|filtr|filter|offre|job/i.test(o.lastAction) && o.idleMs >= 7_000) {
    signals.push({ id: "search_assist", priority: 7, reason: "Une intention de recherche vient d’être détectée." });
  }

  return signals;
}

const DECISIONS: Record<string, Omit<JiaDecision, "id">> = {
  jobs_idle_match: {
    reason: "anticipation d’une recherche d’offre",
    message: {
      fr: "J’ai repéré des offres qui semblent proches de ton profil. Je peux t’aider à les trier.",
      en: "I spotted jobs that seem close to your profile. I can help you narrow them down.",
      es: "He detectado empleos cercanos a tu perfil. Puedo ayudarte a filtrarlos.",
    },
    gesture: "curious", move: "point_button", priority: 8, speak: false,
  },
  application_followup: {
    reason: "anticipation d’une relance",
    message: {
      fr: "Je vois une candidature qui mérite peut-être une prochaine action. Je peux vérifier laquelle.",
      en: "I see an application that may need a next step. I can check which one.",
      es: "Veo una candidatura que puede necesitar un siguiente paso. Puedo revisarla.",
    },
    gesture: "analyze", move: "think_chin", priority: 8, speak: false,
  },
  profile_gap: {
    reason: "détection d’un manque de profil",
    message: {
      fr: "Ton profil peut encore gagner en visibilité. Je peux repérer le complément le plus utile.",
      en: "Your profile can become more visible. I can identify the most useful improvement.",
      es: "Tu perfil puede ganar visibilidad. Puedo identificar la mejora más útil.",
    },
    gesture: "encourage", move: "hand_chest", priority: 7, speak: false,
  },
  career_next_step: {
    reason: "anticipation de progression",
    message: {
      fr: "Tu es dans ton espace carrière. Je peux t’aider à choisir la prochaine étape.",
      en: "You are in your career space. I can help choose the next step.",
      es: "Estás en tu espacio profesional. Puedo ayudarte a elegir el siguiente paso.",
    },
    gesture: "reassure", move: "listen_tilt", priority: 6, speak: false,
  },
  external_signal: {
    reason: "signal externe vérifié par le Internet Brain",
    message: {
      fr: "J’ai détecté une information externe pertinente. Je peux t’aider à examiner ce qu’elle change.",
      en: "I detected a relevant external signal. I can help examine what it changes.",
      es: "He detectado una señal externa relevante. Puedo ayudarte a analizar qué cambia.",
    },
    gesture: "analyze", move: "explain_open", priority: 9, speak: false,
  },
  search_assist: {
    reason: "anticipation après recherche",
    message: {
      fr: "Tu sembles chercher quelque chose. Je peux affiner la recherche avant que tu continues.",
      en: "It looks like you are searching for something. I can refine it before you continue.",
      es: "Parece que buscas algo. Puedo afinar la búsqueda antes de que continúes.",
    },
    gesture: "analyze", move: "explain_open", priority: 7, speak: false,
  },
};

export function decide(observation: JiaObservation): JiaDecision | null {
  const experience = readExperience();
  const candidates = evaluate(observation)
    .map((signal) => ({ signal, value: score(signal.id, signal.priority, experience) }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value);

  const winner = candidates[0];
  if (!winner) return null;
  const template = DECISIONS[winner.signal.id];
  if (!template) return null;

  const decision: JiaDecision = {
    id: winner.signal.id,
    ...template,
    priority: winner.value,
  };
  experience[decision.id] = { seen: (experience[decision.id]?.seen || 0) + 1, lastAt: Date.now() };
  writeExperience(experience);
  return decision;
}

export const JIA_AUTONOMY_TEST_SCENARIOS = [
  "jobs_idle_match",
  "application_followup",
  "profile_gap",
] as const;
