/**
 * J’IA 360 — presentation and variation foundation.
 *
 * This module deliberately knows nothing about message text or business actions.
 * It resolves only presentation choices; canonical conversation data must remain
 * outside this engine and must never be rewritten when a layout changes.
 */

export const JIA_PRESENTATION_MODES = [
  "messenger",
  "gallery",
  "stage",
  "workspace",
  "explorer",
  "interactive",
] as const;

export type JiaPresentationMode = (typeof JIA_PRESENTATION_MODES)[number];

export const JIA_VARIATION_TARGET = 50;

export const JIA_VARIATION_FAMILIES = [
  "conversation-layouts",
  "scenes-and-ambiences",
  "avatar-appearances",
  "avatar-placement-and-framing",
  "body-gestures",
  "facial-expressions",
  "scene-transitions",
  "message-entrances",
  "stickers-and-reactions",
  "offer-presentations",
  "interactive-questions",
  "documents-and-cv",
] as const;

export type JiaVariationFamily = (typeof JIA_VARIATION_FAMILIES)[number];

export const JIA_PALETTE_ALLOCATION = {
  canaryBlue: 30,
  canaryYellow: 30,
  white: 20,
  orange: 5,
  green: 5,
  derivedSurfaces: 10,
} as const;

export type JiaMotionPreference = "immersive" | "soft" | "reduced";
export type JiaExperienceRole = "TALENT" | "RECRUITER" | "PARTNER" | "ADMIN";
export type JiaExperienceDevice = "mobile" | "tablet" | "desktop";

export type JiaExperienceIntent =
  | "conversation"
  | "opportunities"
  | "jobs"
  | "candidate_search"
  | "recruitment"
  | "document"
  | "profile"
  | "cv"
  | "application"
  | "questionnaire"
  | "onboarding"
  | "guided"
  | "exploration"
  | "mobility"
  | "market"
  | "program"
  | "presentation"
  | "explain"
  | "analytics"
  | "operations"
  | "success"
  | "error";

export type JiaExperienceContext = {
  role: JiaExperienceRole;
  intent?: JiaExperienceIntent;
  device: JiaExperienceDevice;
  lockedLayout?: JiaPresentationMode | null;
  compactAvatar?: boolean;
  motionPreference?: JiaMotionPreference;
  systemReducedMotion?: boolean;
};

export type JiaVariationItem = {
  id: string;
  label?: string;
  tags?: readonly string[];
};

export type JiaVariationCatalog = Partial<
  Record<JiaVariationFamily, readonly JiaVariationItem[]>
>;

export type JiaVariationCoverage = {
  family: JiaVariationFamily;
  available: number;
  required: number;
  complete: boolean;
};

export type JiaExperienceResolution = {
  layout: JiaPresentationMode;
  density: "compact" | "comfortable" | "spacious";
  avatarPresentation: "stage-aside" | "stage-inline" | "compact-launcher" | "contextual";
  motionPreference: JiaMotionPreference;
  decorativeMotionEnabled: boolean;
  preserveConversationState: true;
  transition: "adaptive" | "reduced";
};

const MODE_SET = new Set<string>(JIA_PRESENTATION_MODES);

export function isJiaPresentationMode(value: unknown): value is JiaPresentationMode {
  return typeof value === "string" && MODE_SET.has(value);
}

function layoutForIntent(
  role: JiaExperienceRole,
  intent: JiaExperienceIntent | undefined,
): JiaPresentationMode {
  switch (intent) {
    case "opportunities":
    case "jobs":
    case "candidate_search":
    case "recruitment":
      return "gallery";
    case "document":
    case "profile":
    case "cv":
    case "application":
    case "analytics":
    case "operations":
      return "workspace";
    case "questionnaire":
    case "onboarding":
    case "guided":
      return "interactive";
    case "exploration":
    case "mobility":
    case "market":
    case "program":
      return "explorer";
    case "presentation":
    case "explain":
      return "stage";
    case "success":
    case "error":
    case "conversation":
    default:
      // The role remains part of the resolution contract so future role-specific
      // presentations can be added without inferring permissions from a pathname.
      void role;
      return "messenger";
  }
}

/**
 * Resolve a layout without changing a single byte of conversation content.
 * A pinned user preference always wins over contextual recommendations.
 */
export function resolveJiaExperience(
  context: JiaExperienceContext,
): JiaExperienceResolution {
  const layout = isJiaPresentationMode(context.lockedLayout)
    ? context.lockedLayout
    : layoutForIntent(context.role, context.intent);

  const density =
    context.device === "mobile"
      ? "compact"
      : context.device === "tablet"
        ? "comfortable"
        : "spacious";

  const motionPreference: JiaMotionPreference = context.systemReducedMotion
    ? "reduced"
    : context.motionPreference ?? "immersive";

  const reduced = motionPreference === "reduced";
  let avatarPresentation: JiaExperienceResolution["avatarPresentation"];

  if (context.compactAvatar) {
    avatarPresentation = "compact-launcher";
  } else if (layout === "stage") {
    avatarPresentation = context.device === "mobile" ? "stage-inline" : "stage-aside";
  } else {
    avatarPresentation = "contextual";
  }

  return {
    layout,
    density,
    avatarPresentation,
    motionPreference,
    decorativeMotionEnabled: !reduced,
    preserveConversationState: true,
    transition: reduced ? "reduced" : "adaptive",
  };
}

/**
 * Selects a variation while avoiding the most recently used IDs.
 * The random source is injectable for deterministic tests; the input arrays
 * are never mutated. Returns undefined when no valid variation is available.
 */
export function pickJiaVariation<T extends JiaVariationItem>(
  variants: readonly T[],
  recentlyUsedIds: readonly string[] = [],
  random: () => number = Math.random,
): T | undefined {
  const unique = new Map<string, T>();
  for (const variant of variants) {
    if (variant && typeof variant.id === "string" && variant.id.trim()) {
      if (!unique.has(variant.id)) unique.set(variant.id, variant);
    }
  }

  const available = [...unique.values()];
  if (available.length === 0) return undefined;

  const lastId = recentlyUsedIds[recentlyUsedIds.length - 1];
  // Retain at most N-1 recent IDs, ensuring a candidate remains when N > 1.
  const recentCount = Math.min(recentlyUsedIds.length, Math.max(0, available.length - 1));
  const recent = new Set(recentlyUsedIds.slice(-recentCount));
  let candidates = available.filter((variant) => !recent.has(variant.id));

  if (candidates.length === 0) {
    candidates = available.filter((variant) => variant.id !== lastId);
  }
  if (candidates.length === 0) candidates = available;

  const raw = Number(random());
  const normalized = Number.isFinite(raw) ? Math.min(0.999999999, Math.max(0, raw)) : 0;
  const index = Math.floor(normalized * candidates.length);
  return candidates[index];
}

/**
 * Counts distinct registered variation IDs for every required family.
 * An empty/missing family is incomplete; catalogue completion is never inferred
 * from the theoretical number of combinations.
 */
export function getJiaVariationCoverage(
  catalog: JiaVariationCatalog,
): JiaVariationCoverage[] {
  return JIA_VARIATION_FAMILIES.map((family) => {
    const ids = new Set(
      (catalog[family] ?? [])
        .map((item) => item?.id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    );
    return {
      family,
      available: ids.size,
      required: JIA_VARIATION_TARGET,
      complete: ids.size >= JIA_VARIATION_TARGET,
    };
  });
}
