/**
 * J’IA — canonical character/runtime contract.
 *
 * This is the single source of truth for the visual and interaction conventions
 * agreed for Jobly. UI components may adapt presentation, but must not silently
 * change the character identity or interaction rules.
 */

export const JIA_CHARACTER = {
  name: "J’IA",
  role: "Jobly transversal AI companion",
  archetype: "modern griotte / keeper of memory",
  agePresentation: "late 20s",
  visual: {
    skin: "African",
    blazer: "blue",
    scarf: "amber-gold",
    glasses: "round gold",
    pin: "J’IA",
    style: "human, warm, contemporary, organic",
    prohibited: ["robotic appearance", "HR shield", "briefcase", "generic corporate mascot"],
  },
  motion: {
    rig: "V3",
    required: ["skeleton", "head", "eyes", "facial motion", "speech gestures", "idle", "walking"],
    rule: "semantic gestures only; no random autonomous movement",
  },
  presence: {
    draggable: true,
    randomPositioning: false,
    compactByDefault: true,
    nonBlocking: true,
  },
  voice: {
    wakeWord: "J’IA",
    wakeWordRequired: true,
    textAndVoiceModesIndependent: true,
    notificationModeIndependent: true,
  },
  safety: {
    mayGuidePayments: true,
    mayExecutePayments: false,
    financialActionExecution: false,
  },
} as const;

export type JiaEcosystem = "TALENT" | "RECRUITER" | "PARTNER";

export const JIA_ECOSYSTEMS: readonly JiaEcosystem[] = [
  "TALENT",
  "RECRUITER",
  "PARTNER",
];
