/**
 * lib/jia/gestures.ts
 *
 * Vocabulaire sémantique de J'IA — 24 intentions gestuelles, tel que figé
 * dans README.md (checkpoint 20/09/2026) et Statut.md.
 *
 * Ce fichier est le CONTRAT partagé entre :
 *   - lib/jia/brain.ts        (décide QUOI dire / QUEL geste)
 *   - components/JIA/JIA.tsx   (exécute PHYSIQUEMENT le geste — voir components/JIA/gestureMap.ts)
 *
 * Règle de non-régression : ne pas ajouter de mouvement sans fonction
 * sémantique. Un geste = une intention. Pas de boucle gratuite.
 */

export type GestureCategory = "core" | "emotional" | "business";

export type MouthShape = "idle" | "smile" | "talk" | "oh" | "firm" | "warm";

export interface HeadPose {
  /** rotation gauche/droite en degrés (- = gauche) */
  yaw: number;
  /** rotation haut/bas en degrés (- = vers le haut) */
  pitch: number;
  /** inclinaison latérale en degrés */
  roll: number;
}

export interface GazeTarget {
  /** -1 (gauche) à 1 (droite) */
  x: number;
  /** -1 (haut) à 1 (bas) */
  y: number;
}

export interface GestureSpec {
  id: GestureId;
  category: GestureCategory;
  /** Description courte, utilisée pour les logs / debug uniquement. */
  label: string;
  /** Pose de tête cible (le rig interpole depuis la pose courante). */
  head: HeadPose;
  /** Direction du regard. */
  gaze: GazeTarget;
  /** 0 = neutre, 1 = sourcils haussés au maximum. */
  brow: number;
  /** Forme de bouche par défaut (écrasée par le lip-sync si voice=true). */
  mouth: MouthShape;
  /**
   * Clip main/bras optionnel. Correspond à un fichier
   * /public/jia/outfits/<outfit>/clips/<clipId>.webm (voir components/JIA/clips.ts).
   * Si le fichier est absent pour la tenue courante, le rig retombe automatiquement sur une
   * approximation "rig-only" (pas de crash, pas de 404 visible).
   */
  clipId?: string;
  /** Durée totale du geste en ms avant retour à la pose idle. */
  duration: number;
  /** Le geste doit-il se répéter tant que le message est affiché ? */
  sustain?: boolean;
}

export type GestureId =
  // CORE
  | "greet"
  | "analyze"
  | "point_explain"
  | "write_note"
  | "validate_check"
  | "alert_warning"
  | "send_apply"
  | "celebrate_hired"
  // ÉMOTIONNELS
  | "wink"
  | "reassure"
  | "encourage"
  | "disappointed_motivating"
  | "surprise_perfect_offer"
  | "curious"
  | "tired_but_continue"
  | "proud"
  // BUSINESS
  | "present_chart"
  | "handshake_partnership"
  | "present_team"
  | "explain_payos"
  | "call_hr"
  | "filter_sort"
  | "secure_confidential"
  | "goodbye_see_tomorrow";

const idle: HeadPose = { yaw: 0, pitch: 0, roll: 0 };
const center: GazeTarget = { x: 0, y: 0 };

export const GESTURES: Record<GestureId, GestureSpec> = {
  // ---------------------------------------------------------------- CORE
  greet: {
    id: "greet", category: "core", label: "Saluer / accueillir",
    head: { yaw: 6, pitch: -3, roll: 4 }, gaze: { x: 0.2, y: -0.1 },
    brow: 0.5, mouth: "smile", clipId: "wave", duration: 1800,
  },
  analyze: {
    id: "analyze", category: "core", label: "Analyser / réfléchir",
    head: { yaw: -8, pitch: 4, roll: -3 }, gaze: { x: -0.4, y: 0.3 },
    brow: 0.3, mouth: "firm", duration: 2200, sustain: true,
  },
  point_explain: {
    id: "point_explain", category: "core", label: "Pointer / expliquer",
    head: { yaw: 10, pitch: 0, roll: 0 }, gaze: { x: 0.6, y: 0 },
    brow: 0.4, mouth: "talk", clipId: "point", duration: 2400, sustain: true,
  },
  write_note: {
    id: "write_note", category: "core", label: "Écrire / prendre des notes",
    head: { yaw: -4, pitch: 8, roll: -2 }, gaze: { x: -0.2, y: 0.6 },
    brow: 0.1, mouth: "idle", clipId: "write", duration: 2200, sustain: true,
  },
  validate_check: {
    id: "validate_check", category: "core", label: "Valider / cocher",
    head: { yaw: 0, pitch: -4, roll: 0 }, gaze: center,
    brow: 0.4, mouth: "smile", clipId: "check", duration: 1400,
  },
  alert_warning: {
    id: "alert_warning", category: "core", label: "Alerter / attention",
    head: { yaw: 0, pitch: -6, roll: 0 }, gaze: center,
    brow: 0.8, mouth: "oh", clipId: "alert", duration: 1600,
  },
  send_apply: {
    id: "send_apply", category: "core", label: "Envoyer / postuler",
    head: { yaw: 4, pitch: -2, roll: 0 }, gaze: { x: 0.3, y: -0.2 },
    brow: 0.4, mouth: "smile", clipId: "send", duration: 1600,
  },
  celebrate_hired: {
    id: "celebrate_hired", category: "core", label: "Célébrer / embauché",
    head: { yaw: 0, pitch: -8, roll: 0 }, gaze: { x: 0, y: -0.3 },
    brow: 0.7, mouth: "smile", clipId: "celebrate", duration: 2000,
  },

  // --------------------------------------------------------- ÉMOTIONNELS
  wink: {
    id: "wink", category: "emotional", label: "Clin d'œil complice",
    head: { yaw: 4, pitch: 0, roll: 2 }, gaze: { x: 0.2, y: 0 },
    brow: 0.3, mouth: "smile", duration: 900,
  },
  reassure: {
    id: "reassure", category: "emotional", label: "Rassurer",
    head: { yaw: 0, pitch: 2, roll: 0 }, gaze: center,
    brow: 0.2, mouth: "warm", duration: 2000, sustain: true,
  },
  encourage: {
    id: "encourage", category: "emotional", label: "Encourager",
    head: { yaw: 3, pitch: -2, roll: 0 }, gaze: { x: 0.1, y: -0.1 },
    brow: 0.5, mouth: "smile", duration: 1800,
  },
  disappointed_motivating: {
    id: "disappointed_motivating", category: "emotional", label: "Déçue mais motivante",
    head: { yaw: -2, pitch: 6, roll: -2 }, gaze: { x: -0.2, y: 0.2 },
    brow: 0.2, mouth: "warm", duration: 2000,
  },
  surprise_perfect_offer: {
    id: "surprise_perfect_offer", category: "emotional", label: "Surprise / offre parfaite",
    head: { yaw: 0, pitch: -6, roll: 0 }, gaze: { x: 0, y: -0.2 },
    brow: 0.9, mouth: "oh", duration: 1200,
  },
  curious: {
    id: "curious", category: "emotional", label: "Curieuse",
    head: { yaw: -6, pitch: 2, roll: 6 }, gaze: { x: -0.3, y: 0 },
    brow: 0.6, mouth: "idle", duration: 1600,
  },
  tired_but_continue: {
    id: "tired_but_continue", category: "emotional", label: "Fatiguée mais continue",
    head: { yaw: 0, pitch: 6, roll: 2 }, gaze: { x: 0, y: 0.2 },
    brow: 0.1, mouth: "idle", clipId: "touch_hair", duration: 2200,
  },
  proud: {
    id: "proud", category: "emotional", label: "Fière",
    head: { yaw: 0, pitch: -5, roll: 0 }, gaze: { x: 0, y: -0.1 },
    brow: 0.4, mouth: "smile", duration: 1600,
  },

  // -------------------------------------------------------------- BUSINESS
  present_chart: {
    id: "present_chart", category: "business", label: "Présenter un graphique",
    head: { yaw: 8, pitch: 0, roll: 0 }, gaze: { x: 0.5, y: 0.1 },
    brow: 0.3, mouth: "talk", clipId: "point", duration: 2400, sustain: true,
  },
  handshake_partnership: {
    id: "handshake_partnership", category: "business", label: "Serrer la main / partenariat",
    head: { yaw: 4, pitch: 0, roll: 0 }, gaze: { x: 0.2, y: 0 },
    brow: 0.3, mouth: "smile", clipId: "handshake", duration: 1800,
  },
  present_team: {
    id: "present_team", category: "business", label: "Présenter une équipe",
    head: { yaw: -6, pitch: 0, roll: 0 }, gaze: { x: -0.4, y: 0 },
    brow: 0.3, mouth: "talk", clipId: "point", duration: 2000, sustain: true,
  },
  explain_payos: {
    id: "explain_payos", category: "business", label: "Expliquer PAY OS",
    head: { yaw: 0, pitch: 2, roll: 0 }, gaze: center,
    brow: 0.2, mouth: "talk", duration: 2400, sustain: true,
  },
  call_hr: {
    id: "call_hr", category: "business", label: "Appeler / relation RH",
    head: { yaw: -8, pitch: 0, roll: -4 }, gaze: { x: -0.3, y: 0 },
    brow: 0.2, mouth: "talk", clipId: "call", duration: 2200, sustain: true,
  },
  filter_sort: {
    id: "filter_sort", category: "business", label: "Filtrer / trier",
    head: { yaw: 0, pitch: 4, roll: 0 }, gaze: { x: 0, y: 0.3 },
    brow: 0.2, mouth: "idle", duration: 1400,
  },
  secure_confidential: {
    id: "secure_confidential", category: "business", label: "Sécuriser / confidentiel",
    head: { yaw: 0, pitch: 0, roll: 0 }, gaze: center,
    brow: 0.5, mouth: "firm", clipId: "secure", duration: 1600,
  },
  goodbye_see_tomorrow: {
    id: "goodbye_see_tomorrow", category: "business", label: "Dire au revoir / à demain",
    head: { yaw: -6, pitch: -2, roll: -3 }, gaze: { x: -0.2, y: -0.1 },
    brow: 0.4, mouth: "smile", clipId: "wave", duration: 1600,
  },
};

export const IDLE_POSE: HeadPose = idle;
export const IDLE_GAZE: GazeTarget = center;

export function getGesture(id: GestureId): GestureSpec {
  return GESTURES[id];
}
