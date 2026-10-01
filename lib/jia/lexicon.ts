/**
 * Free, dependency-free starter lexicon.
 * Add a locale by extending the record; the runtime never depends on a paid API.
 */
export const JIA_LEXICON = {
  fr: { emploi: "job", profil: "profile", candidature: "application", carrière: "career", aide: "help" },
  en: { job: "emploi", profile: "profil", application: "candidature", career: "carrière", help: "aide" },
  es: { empleo: "emploi", perfil: "profil", candidatura: "candidature", carrera: "carrière", ayuda: "aide" },
} as const;

export type JiaLexiconLanguage = keyof typeof JIA_LEXICON;

export const JIA_SUPPORTED_LANGUAGES = Object.keys(JIA_LEXICON) as JiaLexiconLanguage[];

export function normalizeJiaWord(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function understandJiaWord(input: string): { language: JiaLexiconLanguage; concept: string } | null {
  const word = normalizeJiaWord(input);
  for (const [language, entries] of Object.entries(JIA_LEXICON) as Array<[JiaLexiconLanguage, Record<string, string>]>) {
    for (const concept of Object.keys(entries)) {
      if (normalizeJiaWord(concept) === word) return { language, concept };
    }
  }
  return null;
}
