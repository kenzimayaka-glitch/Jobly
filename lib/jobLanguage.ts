export type JobLanguageCode = "fr" | "en" | "es" | "pt" | "ar" | "sw";

export const JOBLY_LANGUAGES: Record<JobLanguageCode, { name: string; nativeName: string }> = {
  fr: { name: "French", nativeName: "Français" },
  en: { name: "English", nativeName: "English" },
  es: { name: "Spanish", nativeName: "Español" },
  pt: { name: "Portuguese", nativeName: "Português" },
  ar: { name: "Arabic", nativeName: "العربية" },
  sw: { name: "Swahili", nativeName: "Kiswahili" },
};

const ALIASES: Record<string, JobLanguageCode> = {
  fr: "fr", français: "fr", francais: "fr", french: "fr",
  en: "en", english: "en", anglais: "en",
  es: "es", español: "es", espanol: "es", spanish: "es", espagnol: "es",
  pt: "pt", português: "pt", portugues: "pt", portuguese: "pt", portugais: "pt",
  ar: "ar", العربية: "ar", arabic: "ar", arabe: "ar",
  sw: "sw", kiswahili: "sw", swahili: "sw",
};

export function normalizeJobLanguage(value: unknown): JobLanguageCode | null {
  const raw = String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
  return ALIASES[raw] ?? null;
}

export function detectJobLanguage(text: string, hint?: unknown): JobLanguageCode {
  const hinted = normalizeJobLanguage(hint);
  if (hinted) return hinted;
  const n = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, " ");
  if (/[\\u0600-\\u06ff]/.test(text) || /arabic|arabe|العربية/.test(text.toLowerCase())) return "ar";
  if (/kiswahili|swahili|nairobi|kampala|kigali/.test(n)) return "sw";
  if (/portugues|portuguese|portugais|vaga|candidatura|recrutamento/.test(n)) return "pt";
  if (/espanol|espanol|spanish|espagnol|vacante|candidatura|empleo/.test(n)) return "es";
  if (/english|anglais|job title|responsibilities|qualifications|requirements|apply now/.test(n)) return "en";
  return "fr";
}

export function detectLanguageRequirements(text: string): JobLanguageCode[] {
  const n = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, " ");
  const requirement = /(requis|requise|requis[e]?|exige|exigee|obligatoire|required|must|mandatory|fluent|courant|bilingue|professionnel|professional|maitrise|proficiency|nivel|nivel avanzado|obrigatorio|fluente|مطلوب|متقدم)/;
  const patterns: Array<[JobLanguageCode, RegExp]> = [
    ["en", /anglais|english/],
    ["fr", /francais|french/],
    ["es", /espanol|spanish|espagnol/],
    ["pt", /portugues|portuguese|portugais/],
    ["ar", /arabe|arabic|العربية/],
    ["sw", /swahili|kiswahili/],
  ];
  const out = patterns.filter(([, pattern]) => {
    const matches = [...n.matchAll(new RegExp(pattern.source, "g"))];
    return matches.some(m => {
      const start = Math.max(0, (m.index ?? 0) - 55);
      const end = Math.min(n.length, (m.index ?? 0) + m[0].length + 55);
      return requirement.test(n.slice(start, end));
    });
  }).map(([code]) => code);
  const bilingual = /(bilingue|bilingual)/.test(n);
  if (bilingual) {
    for (const code of ["fr", "en"] as JobLanguageCode[]) {
      if (patterns.some(([c, p]) => c === code && p.test(n))) out.push(code);
    }
  }
  return Array.from(new Set(out));
}
