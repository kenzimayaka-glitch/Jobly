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
  | "goodbye_see_tomorrow"
  | "blink_fast"
  | "blink_double"
  | "smile_shy"
  | "stretch"
  | "focus"
  | "listen_forward"
  | "nod_slow"
  | "nod_fast"
  | "nod_3x"
  | "shake_no"
  | "shake_soft"
  | "ear_touch"
  | "lean_in"
  | "think_up"
  | "think_side"
  | "think_frown"
  | "think_mouth"
  | "think_temple"
  | "think_glasses"
  | "think_chin_rub"
  | "think_pace"
  | "think_write"
  | "think_count"
  | "think_compare"
  | "think_idea"
  | "think_doubt"
  | "think_solve"
  | "point_bubble"
  | "point_score"
  | "point_cv"
  | "point_right"
  | "point_up"
  | "point_down"
  | "point_self"
  | "blink_slow"
  | "smile_soft"
  | "smile_wide"
  | "wink_right"
  | "lips_bite"
  | "yawn"
  | "think_chin"
  | "point_left"
  | "confused"
  | "reading";

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
  },  blink_fast: {
    id: "blink_fast", category: "emotional", label: "Clignement vif",
    head: { yaw: 0, pitch: 0, roll: 0 }, gaze: { x: 0, y: 0 },
    brow: 0.25, mouth: "idle", duration: 700,
  },
  blink_double: {
    id: "blink_double", category: "emotional", label: "Double clignement",
    head: { yaw: 0, pitch: -1, roll: 0 }, gaze: { x: 0, y: 0 },
    brow: 0.25, mouth: "smile", duration: 900,
  },
  smile_shy: {
    id: "smile_shy", category: "emotional", label: "Sourire timide",
    head: { yaw: 3, pitch: 4, roll: 5 }, gaze: { x: 0.1, y: 0.2 },
    brow: 0.25, mouth: "warm", duration: 1200,
  },
  stretch: {
    id: "stretch", category: "emotional", label: "S'étirer",
    head: { yaw: -2, pitch: -4, roll: 0 }, gaze: { x: 0, y: -0.1 },
    brow: 0.15, mouth: "idle", duration: 1500,
  },
  focus: {
    id: "focus", category: "emotional", label: "Concentration",
    head: { yaw: 0, pitch: -2, roll: 0 }, gaze: { x: 0.1, y: 0 },
    brow: 0.2, mouth: "firm", duration: 1500,
  },
  listen_forward: {
    id: "listen_forward", category: "emotional", label: "Écoute attentive",
    head: { yaw: 2, pitch: 4, roll: -3 }, gaze: { x: -0.1, y: 0.1 },
    brow: 0.45, mouth: "warm", duration: 1700,
  },
  nod_slow: {
    id: "nod_slow", category: "emotional", label: "Acquiescement lent",
    head: { yaw: 0, pitch: -3, roll: 0 }, gaze: { x: 0, y: -0.1 },
    brow: 0.35, mouth: "smile", duration: 1800,
  },
  nod_fast: {
    id: "nod_fast", category: "emotional", label: "Acquiescement énergique",
    head: { yaw: 0, pitch: -6, roll: 1 }, gaze: { x: 0.1, y: -0.1 },
    brow: 0.55, mouth: "smile", duration: 1200,
  },
  nod_3x: {
    id: "nod_3x", category: "emotional", label: "Triple acquiescement",
    head: { yaw: -2, pitch: -5, roll: -1 }, gaze: { x: -0.1, y: -0.1 },
    brow: 0.6, mouth: "smile", duration: 1500,
  },
  shake_no: {
    id: "shake_no", category: "emotional", label: "Désaccord doux",
    head: { yaw: -5, pitch: 2, roll: -2 }, gaze: { x: -0.25, y: 0 },
    brow: 0.25, mouth: "firm", duration: 1500,
  },
  shake_soft: {
    id: "shake_soft", category: "emotional", label: "Désaccord nuancé",
    head: { yaw: 5, pitch: 1, roll: 2 }, gaze: { x: 0.25, y: 0 },
    brow: 0.3, mouth: "warm", duration: 1500,
  },
  ear_touch: {
    id: "ear_touch", category: "emotional", label: "Écoute attentive",
    head: { yaw: -4, pitch: 1, roll: 4 }, gaze: { x: -0.2, y: 0 },
    brow: 0.35, mouth: "warm", duration: 1700,
  },
  lean_in: {
    id: "lean_in", category: "emotional", label: "Se rapprocher pour écouter",
    head: { yaw: 3, pitch: 5, roll: 0 }, gaze: { x: 0.15, y: -0.1 },
    brow: 0.4, mouth: "warm", duration: 1700,
  },
  think_up: {
    id: "think_up", category: "emotional", label: "Réflexion vers le haut",
    head: { yaw: 0, pitch: -6, roll: 2 }, gaze: { x: 0, y: -0.7 },
    brow: 0.2, mouth: "idle", duration: 1700,
  },
  think_side: {
    id: "think_side", category: "emotional", label: "Réflexion latérale",
    head: { yaw: -8, pitch: 1, roll: 3 }, gaze: { x: -0.65, y: 0 },
    brow: 0.15, mouth: "idle", duration: 1700,
  },
  think_frown: {
    id: "think_frown", category: "emotional", label: "Concentration critique",
    head: { yaw: 2, pitch: 2, roll: -2 }, gaze: { x: 0.2, y: 0.1 },
    brow: 0.1, mouth: "firm", duration: 1700,
  },
  think_mouth: {
    id: "think_mouth", category: "emotional", label: "Réflexion attentive",
    head: { yaw: -2, pitch: 2, roll: 1 }, gaze: { x: -0.1, y: 0.1 },
    brow: 0.2, mouth: "idle", duration: 1700,
  },
  think_temple: {
    id: "think_temple", category: "emotional", label: "Analyse approfondie",
    head: { yaw: 5, pitch: -1, roll: -4 }, gaze: { x: 0.4, y: -0.1 },
    brow: 0.3, mouth: "firm", duration: 1800,
  },
  think_glasses: {
    id: "think_glasses", category: "emotional", label: "Ajuster les lunettes",
    head: { yaw: -3, pitch: -1, roll: 2 }, gaze: { x: 0, y: 0.2 },
    brow: 0.45, mouth: "idle", duration: 1400,
  },
  think_chin_rub: {
    id: "think_chin_rub", category: "emotional", label: "Réflexion posée",
    head: { yaw: 4, pitch: 3, roll: 4 }, gaze: { x: 0.1, y: 0.3 },
    brow: 0.25, mouth: "warm", duration: 1800,
  },
  think_pace: {
    id: "think_pace", category: "emotional", label: "Évaluer plusieurs pistes",
    head: { yaw: -6, pitch: 1, roll: -3 }, gaze: { x: -0.5, y: 0.1 },
    brow: 0.15, mouth: "firm", duration: 1900,
  },
  think_write: {
    id: "think_write", category: "emotional", label: "Préparer une idée",
    head: { yaw: 2, pitch: 5, roll: -2 }, gaze: { x: 0.1, y: 0.55 },
    brow: 0.1, mouth: "idle", duration: 1700,
  },
  think_count: {
    id: "think_count", category: "emotional", label: "Compter les étapes",
    head: { yaw: 0, pitch: 3, roll: 1 }, gaze: { x: 0, y: 0.45 },
    brow: 0.5, mouth: "idle", duration: 1700,
  },
  think_compare: {
    id: "think_compare", category: "emotional", label: "Comparer deux options",
    head: { yaw: 7, pitch: -1, roll: 2 }, gaze: { x: 0.5, y: 0.05 },
    brow: 0.35, mouth: "firm", duration: 1800,
  },
  think_idea: {
    id: "think_idea", category: "emotional", label: "Éclair de compréhension",
    head: { yaw: -2, pitch: -7, roll: 0 }, gaze: { x: -0.1, y: -0.65 },
    brow: 0.85, mouth: "oh", duration: 1400,
  },
  think_doubt: {
    id: "think_doubt", category: "emotional", label: "Doute constructif",
    head: { yaw: 3, pitch: 4, roll: -4 }, gaze: { x: 0.2, y: 0.35 },
    brow: 0.15, mouth: "firm", duration: 1700,
  },
  think_solve: {
    id: "think_solve", category: "emotional", label: "Résolution du problème",
    head: { yaw: 0, pitch: -3, roll: 0 }, gaze: { x: 0, y: -0.2 },
    brow: 0.7, mouth: "smile", duration: 1500,
  },
  point_bubble: {
    id: "point_bubble", category: "core", label: "Pointer la conversation",
    head: { yaw: -4, pitch: 0, roll: 1 }, gaze: { x: -0.35, y: 0 },
    brow: 0.45, mouth: "talk", duration: 1400,
  },
  point_score: {
    id: "point_score", category: "core", label: "Pointer le score",
    head: { yaw: 5, pitch: -1, roll: 0 }, gaze: { x: 0.4, y: 0.05 },
    brow: 0.4, mouth: "smile", duration: 1400,
  },
  point_cv: {
    id: "point_cv", category: "core", label: "Pointer le CV",
    head: { yaw: 0, pitch: 3, roll: 0 }, gaze: { x: 0, y: 0.35 },
    brow: 0.35, mouth: "talk", duration: 1400,
  },
  point_right: {
    id: "point_right", category: "core", label: "Pointer à droite",
    head: { yaw: 7, pitch: 0, roll: 0 }, gaze: { x: 0.65, y: 0 },
    brow: 0.4, mouth: "talk", duration: 1300,
  },
  point_up: {
    id: "point_up", category: "core", label: "Pointer vers le haut",
    head: { yaw: 0, pitch: -6, roll: 0 }, gaze: { x: 0, y: -0.65 },
    brow: 0.5, mouth: "oh", duration: 1300,
  },
  point_down: {
    id: "point_down", category: "core", label: "Pointer vers le bas",
    head: { yaw: -2, pitch: 6, roll: 0 }, gaze: { x: 0, y: 0.65 },
    brow: 0.3, mouth: "talk", duration: 1300,
  },
  point_self: {
    id: "point_self", category: "core", label: "Se désigner",
    head: { yaw: 3, pitch: -1, roll: 2 }, gaze: { x: 0.2, y: -0.1 },
    brow: 0.45, mouth: "smile", duration: 1300,
  },  blink_slow: {
    id: "blink_slow", category: "emotional", label: "Clignement lent",
    head: { yaw: 0, pitch: 0, roll: 0 }, gaze: { x: 0, y: 0 },
    brow: 0.18, mouth: "idle", duration: 1200,
  },
  smile_soft: {
    id: "smile_soft", category: "emotional", label: "Sourire discret",
    head: { yaw: 0, pitch: -1, roll: 0 }, gaze: { x: 0, y: 0 },
    brow: 0.38, mouth: "warm", duration: 1200,
  },
  smile_wide: {
    id: "smile_wide", category: "emotional", label: "Grand sourire",
    head: { yaw: 0, pitch: -2, roll: 0 }, gaze: { x: 0, y: -0.1 },
    brow: 0.72, mouth: "smile", duration: 1300,
  },
  wink_right: {
    id: "wink_right", category: "emotional", label: "Clin d'œil droit",
    head: { yaw: -3, pitch: 0, roll: -2 }, gaze: { x: -0.1, y: 0 },
    brow: 0.4, mouth: "smile", duration: 900,
  },
  lips_bite: {
    id: "lips_bite", category: "emotional", label: "Réflexion concentrée",
    head: { yaw: 1, pitch: 1, roll: 0 }, gaze: { x: 0, y: 0.1 },
    brow: 0.12, mouth: "firm", duration: 1200,
  },
  yawn: {
    id: "yawn", category: "emotional", label: "Bâillement",
    head: { yaw: 0, pitch: 1, roll: 0 }, gaze: { x: 0, y: 0.2 },
    brow: 0.08, mouth: "oh", duration: 1500,
  },
  think_chin: {
    id: "think_chin", category: "emotional", label: "Réflexion, main au menton",
    head: { yaw: 2, pitch: 3, roll: 2 }, gaze: { x: 0.1, y: 0.4 },
    brow: 0.22, mouth: "idle", duration: 1700,
  },
  point_left: {
    id: "point_left", category: "core", label: "Pointer à gauche",
    head: { yaw: -8, pitch: 0, roll: 0 }, gaze: { x: -0.65, y: 0 },
    brow: 0.4, mouth: "talk", duration: 1300,
  },
  confused: {
    id: "confused", category: "emotional", label: "Perplexité",
    head: { yaw: -4, pitch: 2, roll: -4 }, gaze: { x: -0.3, y: 0.2 },
    brow: 0.18, mouth: "firm", duration: 1500,
  },
  reading: {
    id: "reading", category: "core", label: "Lire attentivement",
    head: { yaw: 0, pitch: 5, roll: 0 }, gaze: { x: 0, y: 0.45 },
    brow: 0.3, mouth: "idle", duration: 1600,
  },
};

export const IDLE_POSE: HeadPose = idle;
export const IDLE_GAZE: GazeTarget = center;

export function getGesture(id: GestureId): GestureSpec {
  return GESTURES[id];
}
