"use client";

import JiaPresence from "./JiaPresence";

// Montage global unique de J’IA. La présence gère elle-même son positionnement fixe
// (au-dessus de la BottomNav, sous les modales) : aucune couche plein écran n’est
// nécessaire — l’ancienne (z-index 9999) recouvrait les modales et la navigation.
export default function JiaGlobal() {
  return <JiaPresence />;
}
