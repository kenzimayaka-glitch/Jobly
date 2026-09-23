"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANG, DICT, LANG_EVENT, LANG_STORAGE_KEY, type DictKey, type Lang } from "./dictionary";

export type { Lang, DictKey } from "./dictionary";

type Vars = Record<string, string | number>;
type Ctx = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey, vars?: Vars) => string;
  locale: string;
  formatDate: (value: string | number | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
};

function readStoredLang(): Lang {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return saved === "en" ? "en" : "fr";
  } catch {
    return DEFAULT_LANG;
  }
}

function interpolate(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

function translate(lang: Lang, key: DictKey, vars?: Vars) {
  const text = DICT[lang][key] ?? DICT[DEFAULT_LANG][key] ?? key;
  return interpolate(text, vars);
}

/** Traduction hors composant React (ex. messages d’erreur d’un helper). */
export function tStatic(lang: Lang, key: DictKey, vars?: Vars) {
  return translate(lang, key, vars);
}

const I18nContext = createContext<Ctx | null>(null);

/**
 * Fournisseur unique de langue. Il remplace l’ancien LanguageSync :
 *  - lit la langue choisie à l’accueil (`jobly-lang`) ;
 *  - synchronise <html lang> et data-lang (utilisés par la voix de J’IA) ;
 *  - se met à jour immédiatement quand la langue change (événement `jobly:lang`,
 *    autre onglet via `storage`), sans rechargement ni retour à la langue par défaut.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  const apply = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    document.documentElement.setAttribute("data-lang", next);
  }, []);

  useEffect(() => {
    apply(readStoredLang());
    const onChange = () => apply(readStoredLang());
    window.addEventListener(LANG_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LANG_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [apply]);

  const setLang = useCallback((next: Lang) => {
    try { window.localStorage.setItem(LANG_STORAGE_KEY, next); } catch {}
    apply(next);
    window.dispatchEvent(new Event(LANG_EVENT));
  }, [apply]);

  const value = useMemo<Ctx>(() => {
    const locale = lang === "en" ? "en-GB" : "fr-FR";
    return {
      lang,
      setLang,
      locale,
      t: (key, vars) => translate(lang, key, vars),
      formatDate: (input, opts) => {
        if (input === null || input === undefined || input === "") return "—";
        const d = input instanceof Date ? input : new Date(input);
        if (Number.isNaN(d.getTime())) return "—";
        return new Intl.DateTimeFormat(locale, opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(d);
      },
      formatNumber: (n, opts) => new Intl.NumberFormat(locale, opts).format(n),
      formatCurrency: (n, currency = "XAF") =>
        new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const FALLBACK: Ctx = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  locale: "fr-FR",
  t: (key, vars) => translate(DEFAULT_LANG, key, vars),
  formatDate: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—"),
  formatNumber: (n) => String(n),
  formatCurrency: (n, c = "XAF") => `${n} ${c}`,
};

/** Hook de traduction. Hors provider, retombe proprement sur le français. */
export function useI18n(): Ctx {
  return useContext(I18nContext) ?? FALLBACK;
}
