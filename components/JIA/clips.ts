import blueManifest from "./clipsManifest.blue.json";
import whiteManifest from "./clipsManifest.white.json";
import yellowManifest from "./clipsManifest.yellow.json";
import type { Outfit } from "@/lib/jia/outfit";

/**
 * Clips vidéo pour les grands gestes (approche hybride : rig pour le repos et la parole,
 * clip pour les gestes de mains/bras que les calques 2D ne peuvent pas rendre).
 * Un jeu de clips par tenue, dans public/jia/outfits/<outfit>/clips/ — voir lib/jia/outfit.ts
 * pour la tenue active et OUTFIT_HAS_CLIPS pour savoir si une tenue en a.
 *
 * Ajouter des clips : `python3 tools/process_clips.py <dossier_de_videos> <outfit>` (voir le
 * script). Un clip nommé comme un geste (surprised, call-hr, analyze…) est joué pour ce geste
 * contextuel ; un clip nommé comme un mouvement du rig (scarf_touch, clap, money…) est joué
 * pour ce mouvement. Suffixe `--2`, `--3`… = autre prise du même geste.
 */
export type ClipConfig = {
  webm: string;
  mp4: string;
  /** durée du clip en secondes */
  duration: number;
  /**
   * cadrage du clip dans le canvas du rig, en % du canvas (le clip est carré).
   * Le clip « avance » souvent vers la caméra : on le réduit progressivement (scaleFrom → scaleTo)
   * autour du visage (originY, en % de la hauteur du clip) pour garder la taille de la tête du rig.
   */
  fit: { left: number; top: number; width: number; scaleFrom: number; scaleTo: number; originY: number };
};

type ManifestEntry = { duration: number; scaleFrom: number; scaleTo: number };

const MANIFEST_BY_OUTFIT: Record<Outfit, Record<string, ManifestEntry>> = {
  blue: blueManifest as Record<string, ManifestEntry>,
  white: whiteManifest as Record<string, ManifestEntry>,
  yellow: yellowManifest as Record<string, ManifestEntry>,
};

// Cadrage commun (mesuré sur la largeur des cheveux : rig = 60 % du canvas partagé — les 3
// tenues sont recalées sur ce même canvas, voir components/JIA/rigLayout.ts). scaleFrom/scaleTo
// sont calculés par clip par le script. Si J'IA « saute » en début/fin de clip sur téléphone,
// ajuster ces 4 nombres.
const FIT = { left: 10.1, top: 3.6, width: 80, originY: 27 };

// Variantes par tenue : `think_chin`, `think_chin--2`… sont plusieurs prises du même geste ;
// on en tire une au hasard (jamais la même deux fois de suite) pour éviter la répétition.
const VARIANTS_BY_OUTFIT: Record<Outfit, Record<string, string[]>> = { blue: {}, white: {}, yellow: {} };
(Object.keys(MANIFEST_BY_OUTFIT) as Outfit[]).forEach((outfit) => {
  const variants = VARIANTS_BY_OUTFIT[outfit];
  Object.keys(MANIFEST_BY_OUTFIT[outfit]).forEach((key) => {
    const base = key.replace(/--\d+$/, "");
    (variants[base] = variants[base] ?? []).push(key);
  });
});
const lastPick: Record<Outfit, Record<string, string>> = { blue: {}, white: {}, yellow: {} };

/**
 * Choisit la prise à jouer pour un geste ou un mouvement, dans la tenue courante
 * (`undefined` s'il n'existe aucun clip de ce nom pour cette tenue — le rig prend alors
 * le relais tout seul, par exemple pour les bras du débardeur jaune qui n'en a pas).
 */
export function pickClipKey(name: string | undefined | null, outfit: Outfit): string | undefined {
  if (!name) return undefined;
  const list = VARIANTS_BY_OUTFIT[outfit][name];
  if (!list || list.length === 0) return undefined;
  const last = lastPick[outfit];
  const pool = list.length > 1 ? list.filter((k) => k !== last[name]) : list;
  const key = pool[Math.floor(Math.random() * pool.length)];
  last[name] = key;
  return key;
}

/** Configuration d'une prise précise (clé exacte, ex. `think_chin--2`) dans une tenue donnée. */
export function clipConfig(key: string | undefined | null, outfit: Outfit): ClipConfig | undefined {
  if (!key) return undefined;
  const e = MANIFEST_BY_OUTFIT[outfit][key];
  if (!e) return undefined;
  return {
    webm: `/jia/outfits/${outfit}/clips/${key}.webm`,
    mp4: `/jia/outfits/${outfit}/clips/${key}.mp4`,
    duration: e.duration,
    fit: { ...FIT, scaleFrom: e.scaleFrom, scaleTo: e.scaleTo },
  };
}

/** Un clip déclenché par un geste contextuel ne se rejoue pas avant ce délai (évite la répétition). */
export const CLIP_COOLDOWN_MS = 20_000;

/** Safari ignore la transparence des WebM : on lui donne le MP4 (fond blanc, proche du fond du widget). */
function isSafari() {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|chromium|android|crios|fxios).)*safari/i.test(navigator.userAgent);
}

export function pickClipSources(cfg: ClipConfig): { src: string; type: string }[] {
  const mp4 = { src: cfg.mp4, type: "video/mp4" };
  const webm = { src: cfg.webm, type: 'video/webm; codecs="vp9"' };
  return isSafari() ? [mp4] : [webm, mp4];
}

// On ne précharge que les clips les plus probables (données mobiles) ; les autres se chargent à la demande.
const PRELOAD: Record<Outfit, string[]> = {
  blue: ["wave_hi", "scarf_touch", "hand_chest"],
  white: ["arms_crossed", "present_laptop"],
  yellow: ["think_chin"],
};

const preloadedOutfits = new Set<Outfit>();
export function preloadClips(outfit: Outfit) {
  if (preloadedOutfits.has(outfit) || typeof window === "undefined") return;
  preloadedOutfits.add(outfit);
  const run = () => {
    PRELOAD[outfit].forEach((name) => {
      const cfg = clipConfig(pickClipKey(name, outfit), outfit);
      if (!cfg) return;
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.src = pickClipSources(cfg)[0].src;
    });
  };
  const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => void);
  if (idle) idle(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}
