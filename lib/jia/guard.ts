/**
 * lib/jia/guard.ts — Barrière financière de J’IA (NON NÉGOCIABLE).
 *
 * Aucune intention financière ne peut produire d’action, de geste « action » ni de
 * commande exécutée par J’IA : elle peut seulement expliquer ou guider.
 * Ce module est volontairement SANS dépendance serveur : il est importé à la fois
 * par le Brain (serveur) et par la présence J’IA (client) — défense en profondeur.
 *
 * Correctif du 21/09/2026 : les regex étaient auparavant écrites avec des antislashs
 * doublés (`\\b`, `\\s`), ce qui les faisait échouer silencieusement côté client
 * (le mot-clé « J’IA » n’était jamais reconnu). Ici : littéraux TS valides, un seul
 * antislash, et couverture FR + EN.
 */

const FINANCIAL =
  /\b(paie|paies|paye|payes|payer|paiement|paiements|virement|virer|transfere|transferer|transfert|argent|transaction|checkout|carte bancaire|pay|payment|payments|transfer|wire|money|credit card|purchase)\b/i;

/** Retire accents et apostrophes typographiques pour comparer de façon stable. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isFinancialRequest(message: string): boolean {
  return FINANCIAL.test(normalizeText(message));
}

export type JiaProposedAction =
  | { type: "SEARCH_JOBS"; requiresConfirmation: false }
  | { type: "PREPARE_APPLICATION"; requiresConfirmation: true }
  | { type: "START_INTERVIEW_COACHING"; requiresConfirmation: false }
  | { type: "BUILD_LEARNING_PLAN"; requiresConfirmation: false };

/** Le garde financier est évalué EN PREMIER, quelle que soit l’intention détectée. */
export function actionForIntent(intent: string, message: string): JiaProposedAction | undefined {
  if (isFinancialRequest(message)) return undefined;
  const m = normalizeText(message).toLowerCase();
  if (intent === "OPPORTUNITY" && /recherche|cherche|trouve|montre|search|find|show/.test(m)) return { type: "SEARCH_JOBS", requiresConfirmation: false };
  if (intent === "APPLICATION" && /postule|envoie|apply|send/.test(m)) return { type: "PREPARE_APPLICATION", requiresConfirmation: true };
  if (intent === "INTERVIEW") return { type: "START_INTERVIEW_COACHING", requiresConfirmation: false };
  if (intent === "LEARNING") return { type: "BUILD_LEARNING_PLAN", requiresConfirmation: false };
  return undefined;
}

/** Extrait la commande après le mot-clé « J’IA » (FR/EN). `null` si le mot-clé est absent. */
export function extractWakeCommand(transcript: string): string | null {
  const clean = normalizeText(transcript);
  const match = clean.match(/^(?:(?:hey|ok|salut|dis|hello)\s+)?j\s*'?\s*i\s*a(?=\s|,|\.|!|\?|$)/i);
  if (!match) return null;
  return clean.slice(match[0].length).replace(/^[,;:.!?\s]+/, "").trim();
}

export type VoiceIntent = "search_jobs" | "apply_job" | "open_job" | "save_job" | "filter_jobs" | "assistant_command";

/** Intention côté client (sert au routage local ; le Brain refait sa propre analyse serveur). */
export function commandIntent(command: string): VoiceIntent {
  const c = normalizeText(command).toLowerCase();
  if (/\b(recherche|cherche|trouve|montre|search|find|show)\b.*\b(offre|emploi|poste|job|jobs|offer|offers)\b|\b(offres|emplois|jobs)\b.*\b(compatible|correspond|match)/.test(c)) return "search_jobs";
  if (/\b(postule|postuler|candidature|apply|application)\b|\benvoie\b.*\b(cv|candidature)\b/.test(c)) return "apply_job";
  if (/\b(ouvre|ouvrir|affiche|open)\b.*\b(offre|poste|emploi|job|offer)\b/.test(c)) return "open_job";
  if (/\b(sauvegarde|enregistre|favori|garde|save|bookmark)\b.*\b(offre|poste|emploi|job|offer)\b/.test(c)) return "save_job";
  if (/\b(filtre|filtrer|uniquement|filter|only)\b/.test(c)) return "filter_jobs";
  return "assistant_command";
}
