"use client";

import { useEffect } from "react";
import { registerJoblyServiceWorker } from "../src/pwa";
// Réutilise le point d'entrée existant "app/pwa-init.ts" (attendu par
// scripts/check-pwa.mjs) plutôt que de dupliquer l'appel d'enregistrement.

// Monté une seule fois au niveau racine (app/layout.tsx).
// Corrige le bug d'audit du 13/09/2026 : pwa-init.ts existait mais
// n'était jamais importé nulle part, donc le service worker n'était
// jamais enregistré (mode hors-ligne / installabilité dégradés).
export default function PwaInit() {
  useEffect(() => {
    registerJoblyServiceWorker();
  }, []);

  return null;
}
