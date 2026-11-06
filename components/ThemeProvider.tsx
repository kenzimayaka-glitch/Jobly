"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "jobly:theme-mode";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isThemeMode(saved)) setMode(saved);
    } catch {
      // Le thème système reste disponible lorsque le stockage est bloqué.
    } finally {
      setPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const next: ResolvedTheme = mode === "system" ? (media.matches ? "dark" : "light") : mode;
      applyTheme(next);
      setResolvedTheme(next);
    };

    syncTheme();
    if (mode !== "system") return;
    media.addEventListener("change", syncTheme);
    return () => media.removeEventListener("change", syncTheme);
  }, [mode, preferenceLoaded]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setMode(isThemeMode(event.newValue) ? event.newValue : "system");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Le choix reste actif pour la session courante.
    }
  }, []);

  const value = useMemo(() => ({ mode, resolvedTheme, setThemeMode }), [mode, resolvedTheme, setThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
