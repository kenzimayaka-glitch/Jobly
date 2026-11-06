"use client";

import { useEffect } from "react";
import { registerJoblyServiceWorker } from "../src/pwa";
import { getJoblyDeviceId, getJoblyDeviceLabel } from "../lib/device-identity";
// Réutilise le point d'entrée existant "app/pwa-init.ts" (attendu par
// scripts/check-pwa.mjs) plutôt que de dupliquer l'appel d'enregistrement.

// Monté une seule fois au niveau racine (app/layout.tsx).
// Corrige le bug d'audit du 13/09/2026 : pwa-init.ts existait mais
// n'était jamais importé nulle part, donc le service worker n'était
// jamais enregistré (mode hors-ligne / installabilité dégradés).
export default function PwaInit() {
  useEffect(() => {
    registerJoblyServiceWorker();

    const nativeFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const rawUrl = input instanceof Request ? input.url : String(input);
        const url = new URL(rawUrl, window.location.href);
        if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
          const requestHeaders = input instanceof Request ? input.headers : undefined;
          const headers = new Headers(init?.headers ?? requestHeaders);
          headers.set("x-jobly-device-id", getJoblyDeviceId());
          headers.set("x-jobly-device-name", getJoblyDeviceLabel());
          return nativeFetch(input, { ...init, headers });
        }
      } catch {
        // Preserve native fetch behavior for requests that cannot be inspected.
      }
      return nativeFetch(input, init);
    }) as typeof window.fetch;

    return () => { window.fetch = nativeFetch; };
  }, []);

  return null;
}
