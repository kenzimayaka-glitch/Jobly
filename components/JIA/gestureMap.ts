import type { GestureId } from "@/lib/jia/gestures";
import type { JIA100Move } from "./movements";

/**
 * Pont entre le vocabulaire sémantique (lib/jia/gestures.ts — CONTRAT Brain ↔ rig)
 * et les 100 mouvements du rig anatomique (components/JIA/movements.ts).
 * Un geste = une intention = un mouvement. Pas de boucle gratuite.
 */
export const GESTURE_TO_MOVE: Record<GestureId, JIA100Move> = {
  greet: "wave_hi",
  analyze: "scanning",
  point_explain: "point_button",
  write_note: "writing",
  validate_check: "stamping",
  alert_warning: "stop",
  send_apply: "point_cv",
  celebrate_hired: "celebrate_jump",
  wink: "wink_left",
  reassure: "calm_down",
  encourage: "nod_slow",
  disappointed_motivating: "think_doubt",
  surprise_perfect_offer: "eyebrow_raise",
  curious: "look_around",
  tired_but_continue: "breathe_deep",
  proud: "proud",
  present_chart: "chart_up",
  handshake_partnership: "hand_shake",
  present_team: "explain_wide",
  explain_payos: "money",
  call_hr: "point_you",
  filter_sort: "point_button",
  secure_confidential: "hand_chest",
  goodbye_see_tomorrow: "wave_bye",
};
