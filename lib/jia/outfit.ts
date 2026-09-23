"use client";

import { useEffect, useState } from "react";

/**
 * Tenues de J'IA, choisies selon l'heure locale de la personne (pas l'heure serveur) :
 *   06:00–16:00  veste bleue     (blue)
 *   16:00–17:00  débardeur jaune (yellow)
 *   17:00–22:00  veste blanche   (white)
 *   22:00–06:00  débardeur jaune (yellow)
 *
 * Chaque tenue est un jeu de calques autonome dans public/jia/outfits/<outfit>/, recalé sur
 * le même canevas partagé (1408×1472) pour que rig et clips restent à la bonne échelle.
 */
export type Outfit = "blue" | "white" | "yellow";

export const OUTFIT_LABEL: Record<Outfit, string> = {
  blue: "Veste bleue",
  white: "Veste blanche",
  yellow: "Débardeur jaune",
};

/** Seule la veste bleue porte le foulard doré. */
export const OUTFIT_HAS_SCARF: Record<Outfit, boolean> = {
  blue: true,
  white: false,
  yellow: false,
};

/**
 * Bras/mains animables séparément. Le débardeur jaune n'a, pour l'instant, aucune prise
 * montrant les deux bras dégagés du buste (voir public/jia/outfits/yellow/README.md) :
 * le rig anime donc seulement tête + buste pour cette tenue, en attendant ces assets.
 */
export const OUTFIT_HAS_LIMBS: Record<Outfit, boolean> = {
  blue: true,
  white: true,
  yellow: false,
};

/** Les 3 tenues ont désormais leurs calques ; ajuster ici si une tenue future n'est pas prête. */
export const OUTFIT_ASSETS_READY: Record<Outfit, boolean> = {
  blue: true,
  white: true,
  yellow: true,
};

/** Les 3 tenues ont désormais des clips vidéo de gestes réels (voir public/jia/outfits/<outfit>/clips/). */
export const OUTFIT_HAS_CLIPS: Record<Outfit, boolean> = {
  blue: true,
  white: true,
  yellow: true,
};

/** Calcule la tenue attendue pour une heure locale donnée (0–23), selon les créneaux ci-dessus. */
export function outfitForHour(hour: number): Outfit {
  if (hour >= 6 && hour < 16) return "blue";
  if (hour >= 16 && hour < 17) return "yellow";
  if (hour >= 17 && hour < 22) return "white";
  return "yellow"; // 22h–6h
}

/** Tenue réellement affichable : celle du créneau si ses assets sont prêts, sinon repli sur le bleu. */
function resolveOutfit(hour: number): Outfit {
  const wanted = outfitForHour(hour);
  return OUTFIT_ASSETS_READY[wanted] ? wanted : "blue";
}

/**
 * Tenue courante de J'IA, recalculée chaque minute (pas de rechargement de page nécessaire
 * pour voir le changement à l'heure pile). Toujours "blue" pendant le premier rendu serveur
 * pour éviter un écart d'hydratation ; la vraie tenue s'applique juste après le montage.
 */
export function useOutfit(): Outfit {
  const [outfit, setOutfit] = useState<Outfit>("blue");
  useEffect(() => {
    const tick = () => setOutfit(resolveOutfit(new Date().getHours()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return outfit;
}
