export const JIA_100 = {
  // 1. VIE DE BASE
  idle: "respire 3s", breathe_deep: "souffle profond", blink_slow: "cligne lent",
  blink_fast: "cligne nerveux", blink_double: "double clignement", smile_soft: "sourire doux",
  smile_wide: "grand sourire", smile_shy: "sourire timide", wink_left: "clin oeil gauche",
  wink_right: "clin oeil droit", lips_bite: "mordille lèvre", yawn: "baille discret",
  stretch: "s'étire", look_around: "regarde autour", focus: "regard fixe",

  // 2. ÉCOUTE ACTIVE
  listen_tilt: "penche tête 12°", listen_forward: "avance tête", nod_slow: "oui lent",
  nod_fast: "oui rapide", nod_3x: "triple oui", shake_no: "non", shake_soft: "non doux",
  ear_touch: "main oreille", lean_in: "se penche vers toi", eyebrow_raise: "sourcil levé",

  // 3. RÉFLEXION / INTELLIGENCE
  think_chin: "main menton", think_up: "regard plafond", think_side: "regard côté",
  think_frown: "fronce sourcils", think_mouth: "main bouche", think_temple: "touche tempe",
  think_glasses: "enlève lunettes", think_chin_rub: "frotte menton", think_pace: "va-et-vient tête",
  think_write: "écrit en l'air", think_count: "compte sur doigts", think_compare: "balance mains",
  think_idea: "ampoule, doigt en l'air", think_doubt: "moue doute", think_solve: "claque doigts",

  // 4. POINTAGE / GUIDAGE
  point_button: "pointe CTA", point_bubble: "pointe bulle", point_score: "pointe Career Score",
  point_cv: "pointe CV", point_left: "pointe gauche", point_right: "pointe droite",
  point_up: "pointe haut", point_down: "pointe bas", point_self: "pointe elle-même",
  point_you: "pointe utilisateur", point_2fingers: "2 doigts, regarde", point_circle: "entoure du doigt",
  point_tap: "tape sur bouton", point_swipe: "swipe vers bouton", point_laser: "pointe précise",

  // 5. RÉALISME / STYLE
  hair_touch: "touche afro", hair_flip: "secoue cheveux", scarf_adjust: "ajuste foulard",
  scarf_touch: "caresse foulard", glasses_push: "remonte lunettes", glasses_clean: "nettoie lunettes",
  blazer_adjust: "ajuste blazer", pin_touch: "touche pin J'IA", earring_touch: "touche boucle",
  lip_touch: "touche lèvres", neck_touch: "touche cou", hand_fold: "croise bras",
  hand_hip: "main hanche", hand_chest: "main coeur", hand_shake: "serre main invisible",

  // 6. COMMUNICATION / ÉMOTION
  explain_open: "mains ouvertes", explain_wide: "bras larges", explain_small: "mains petites, détail",
  explain_list: "énumère 1-2-3", calm_down: "mains calme", stop: "main stop", ok: "signe OK",
  heart: "coeur avec mains", clap: "applaudit", celebrate_jump: "saute", celebrate_fist: "poing en l'air",
  wave_hi: "coucou", wave_bye: "au revoir", shrug: "hausse épaules", confused: "perdue", proud: "fière",

  // 7. TRAVAIL / CAREER BRAIN
  typing: "tape CV", reading: "lit CV", scanning: "scanne yeux gauche-droite", writing: "écrit",
  searching: "cherche jobs", matching: "matche offre", checking: "coche liste",
  highlighting: "surligne", erasing: "efface", stamping: "tampon Validé", magnify: "loupe",
  chart_up: "montre courbe qui monte", money: "montre valeur", target: "vise cible", rocket: "boost",
} as const;

export type JIA100Move = keyof typeof JIA_100;

export const JIA_100_MOVES = Object.keys(JIA_100) as JIA100Move[];

const GROUPS: Record<string, JIA100Move[]> = {
  base: ["idle","breathe_deep","blink_slow","blink_fast","blink_double","smile_soft","smile_wide","smile_shy","wink_left","wink_right","lips_bite","yawn","stretch","look_around","focus"],
  listen: ["listen_tilt","listen_forward","nod_slow","nod_fast","nod_3x","shake_no","shake_soft","ear_touch","lean_in","eyebrow_raise"],
  think: ["think_chin","think_up","think_side","think_frown","think_mouth","think_temple","think_glasses","think_chin_rub","think_pace","think_write","think_count","think_compare","think_idea","think_doubt","think_solve"],
  point: ["point_button","point_bubble","point_score","point_cv","point_left","point_right","point_up","point_down","point_self","point_you","point_2fingers","point_circle","point_tap","point_swipe","point_laser"],
  style: ["hair_touch","hair_flip","scarf_adjust","scarf_touch","glasses_push","glasses_clean","blazer_adjust","pin_touch","earring_touch","lip_touch","neck_touch","hand_fold","hand_hip","hand_chest","hand_shake"],
  emotion: ["explain_open","explain_wide","explain_small","explain_list","calm_down","stop","ok","heart","clap","celebrate_jump","celebrate_fist","wave_hi","wave_bye","shrug","confused","proud"],
  career: ["typing","reading","scanning","writing","searching","matching","checking","highlighting","erasing","stamping","magnify","chart_up","money","target","rocket"],
};

export function playJIA(move: JIA100Move) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jobly:jia-move", { detail: { move } }));
}

export function chooseJIAByCareerScore(score: number): JIA100Move {
  const n = Math.max(0, Math.min(100, Number(score) || 0));
  if (n < 35) return n < 20 ? "think_doubt" : "searching";
  if (n < 55) return n < 45 ? "scanning" : "think_compare";
  if (n < 70) return n < 62 ? "checking" : "matching";
  if (n < 85) return n < 78 ? "highlighting" : "target";
  return n < 95 ? "celebrate_fist" : "rocket";
}

export function useJIA_Brain(careerScore?: number) {
  const move = chooseJIAByCareerScore(careerScore ?? 0);
  return { move, play: playJIA, groups: GROUPS };
}
