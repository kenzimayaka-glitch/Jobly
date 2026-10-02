import lexicon from "@/data/jia/lexicon.json";

export const JIA_LEXICON = lexicon as Record<string, Record<string, { intent: string; action: string }>>;
export type JiaLexiconLanguage = keyof typeof JIA_LEXICON;
export const JIA_SUPPORTED_LANGUAGES = Object.keys(JIA_LEXICON) as JiaLexiconLanguage[];

export function normalizeJiaWord(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function understandJiaWord(input: string): { language: JiaLexiconLanguage; concept: string } | null {
  const word = normalizeJiaWord(input);
  for (const [language, entries] of Object.entries(JIA_LEXICON) as Array<[JiaLexiconLanguage, Record<string, {intent:string;action:string}>]>) {
    for (const concept of Object.keys(entries)) {
      if (normalizeJiaWord(concept) === word) return { language, concept };
    }
  }
  return null;
}
