import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// "Rester connecté" (14/09/2026) : quand la case n'est pas cochée, la session
// vit seulement dans sessionStorage (donc disparaît à la fermeture de
// l'onglet/navigateur). Quand elle est cochée, on utilise localStorage ET on
// pose une date d'expiration à 48h ; passé ce délai, l'utilisateur devra
// ressaisir son mot de passe.
export const REMEMBER_FLAG_KEY = "jobly-remember-me";
export const REMEMBER_UNTIL_KEY = "jobly-remember-until";
const REMEMBER_WINDOW_MS = 48 * 60 * 60 * 1000;

export function setRememberMe(remember: boolean) {
  try {
    if (remember) {
      window.localStorage.setItem(REMEMBER_FLAG_KEY, "1");
      window.localStorage.setItem(REMEMBER_UNTIL_KEY, String(Date.now() + REMEMBER_WINDOW_MS));
    } else {
      window.localStorage.setItem(REMEMBER_FLAG_KEY, "0");
      window.localStorage.removeItem(REMEMBER_UNTIL_KEY);
    }
  } catch {}
}

// Par défaut (aucun choix explicite fait sur l'écran de connexion — ex. juste
// après une inscription), on reste sur le comportement historique : session
// persistante (localStorage). Seul un "0" explicite (case décochée) bascule
// vers sessionStorage.
function isRemembered() {
  try {
    const value = window.localStorage.getItem(REMEMBER_FLAG_KEY);
    return value === null ? true : value === "1";
  } catch { return true; }
}

// Storage "hybride" : lit/écrit dans localStorage si "rester connecté" est
// coché, sinon dans sessionStorage. On regarde aussi l'autre stockage en
// lecture pour ne jamais perdre une session déjà posée avant un changement
// de préférence.
const hybridStorage = {
  getItem(key: string) {
    try {
      const primary = isRemembered() ? window.localStorage : window.sessionStorage;
      const secondary = isRemembered() ? window.sessionStorage : window.localStorage;
      return primary.getItem(key) ?? secondary.getItem(key);
    } catch { return null; }
  },
  setItem(key: string, value: string) {
    try { (isRemembered() ? window.localStorage : window.sessionStorage).setItem(key, value); } catch {}
  },
  removeItem(key: string) {
    try { window.localStorage.removeItem(key); window.sessionStorage.removeItem(key); } catch {}
  },
};

/**
 * Si "rester connecté" était coché mais que les 48h sont dépassées, on
 * déconnecte proprement au lieu de laisser une session localStorage vivre
 * indéfiniment.
 */
async function enforceRememberWindow(instance: SupabaseClient) {
  try {
    const until = Number(window.localStorage.getItem(REMEMBER_UNTIL_KEY) || 0);
    if (until && Date.now() > until) {
      setRememberMe(false);
      await instance.auth.signOut();
    }
  } catch {}
}

/**
 * Browser-side Supabase client.
 *
 * IMPORTANT: do not instantiate this at module import time. Next.js may load
 * client modules while prerendering during `next build`, where public
 * environment variables may not be available in the build context.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel."
    );
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? (hybridStorage as unknown as Storage) : undefined,
    },
  });

  if (typeof window !== "undefined") void enforceRememberWindow(client);

  return client;
}
