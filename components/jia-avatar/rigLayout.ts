// Un calque par tenue : chaque tenue (public/jia/outfits/<outfit>/) est un jeu de fichiers
// recadré sur le même canevas partagé (1408×1472), qu'elle vienne de la photo d'origine
// (blue), d'une photo au même format (white), ou d'une image recalée sur ce canevas à partir
// d'une source différente (yellow — voir son README). Les rectangles ci-dessous sont donc
// communs aux 3 tenues ; seule OUTFIT_LAYERS détermine quels fichiers existent réellement
// pour une tenue donnée (voir OUTFIT_HAS_SCARF / OUTFIT_HAS_LIMBS dans lib/jia/outfit.ts).

import type { Outfit } from "@/lib/jia/outfit";

export const CANVAS = { width: 1408, height: 1472 } as const;
const OUTFIT_SRC = "/jia/outfits";

export type LayerName = "torso" | "scarf" | "arm_L" | "arm_R" | "hand_L" | "hand_R" | "head" | "hair" | "glasses" | "eyebrows" | "eye_L" | "eye_R" | "mouth";
type LayerRect = { left: number; top: number; width: number; height: number };
type LayerDef = LayerRect & { file: string };

const RECT: Record<LayerName, LayerRect> = {
  torso: { left: 25.213, top: 43.75, width: 49.787, height: 56.25 },
  scarf: { left: 29.403, top: 43.75, width: 40.696, height: 56.25 },
  arm_L: { left: 7.528, top: 49.932, width: 28.48, height: 50.068 },
  arm_R: { left: 64.915, top: 43.75, width: 27.202, height: 56.25 },
  hand_L: { left: 7.528, top: 81.114, width: 23.509, height: 18.886 },
  hand_R: { left: 69.176, top: 81.114, width: 22.94, height: 18.886 },
  head: { left: 27.983, top: 9.783, width: 44.247, height: 39.606 },
  hair: { left: 18.821, top: 0.0, width: 61.222, height: 47.351 },
  glasses: { left: 34.375, top: 19.973, width: 31.108, height: 13.451 },
  eyebrows: { left: 37.571, top: 18.954, width: 25.071, height: 4.28 },
  eye_L: { left: 37.571, top: 23.03, width: 10.866, height: 4.959 },
  eye_R: { left: 51.776, top: 23.03, width: 10.866, height: 4.959 },
  mouth: { left: 43.608, top: 31.861, width: 15.128, height: 6.997 },
};

/** Résout le chemin de chaque calque pour une tenue donnée (tous les calques viennent de son propre dossier). */
export function layoutFor(outfit: Outfit): Record<LayerName, LayerDef> {
  const entries = (Object.keys(RECT) as LayerName[]).map((name) => {
    const src = `${OUTFIT_SRC}/${outfit}/${name}.webp`;
    return [name, { ...RECT[name], file: src }] as const;
  });
  return Object.fromEntries(entries) as Record<LayerName, LayerDef>;
}

// Pivots (articulations), communs aux 3 tenues (même convention de canevas).
export const PIVOT = {
  torso: { x: 50.1, y: 100 },
  scarf: { x: 49.7, y: 44.2 },
  head: { x: 50.1, y: 46.9 },
  arm_L: { x: 32.0, y: 52.7 },
  arm_R: { x: 68.2, y: 52.9 },
  hand_L: { x: 19.2, y: 82.2 },
  hand_R: { x: 80.7, y: 82.2 },
} as const;
