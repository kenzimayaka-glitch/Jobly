export type OfferSectionName =
  | "description" | "missions" | "profile" | "education" | "experience"
  | "skills" | "qualities" | "benefits" | "application";

export type OfferSections = Record<OfferSectionName, string[]>;

const SECTION_ORDER: OfferSectionName[] = [
  "description", "missions", "profile", "education", "experience",
  "skills", "qualities", "benefits", "application",
];

const APPLICATION_MARKER =
  /(?:comment\s+postuler|pour\s+postuler|modalit[eé]s?\s+de\s+candidature|dossier\s+de\s+candidature|lien\s+de\s+candidature|date\s+limite\s+de\s+candidature|objet\s+(?:du\s+mail|de\s+l.?e?mail)|how\s+to\s+apply|application\s+instructions|direct\s+your\s+applications?\s+to|applications?\s+must\s+be\s+addressed|send\s+(?:your\s+)?(?:cv|resume|application)|envoyer\s+(?:votre\s+)?(?:cv|candidature|dossier)|d[eé]poser\s+(?:votre\s+)?candidature)/i;

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_all, code: string) => {
      const n = Number(code);
      return Number.isInteger(n) && n >= 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_all, code: string) => {
      const n = Number.parseInt(code, 16);
      return Number.isInteger(n) && n >= 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : " ";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanLine(value: unknown): string {
  return decodeEntities(String(value ?? ""))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keyOf(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

function splitApplicationTail(value: string): { main: string | null; application: string | null } {
  const match = APPLICATION_MARKER.exec(value);
  if (!match || match.index === undefined) return { main: value, application: null };
  const index = match.index;
  const prefix = value.slice(0, index).trim();
  const suffix = value.slice(index).trim();
  if (prefix.length >= 40) return { main: prefix, application: suffix };
  return { main: null, application: suffix };
}

/**
 * Repairs section ownership without throwing away offer information:
 * - extracts application instructions embedded at the end of another section;
 * - removes exact repeated paragraphs while preserving the first canonical copy;
 * - decodes numeric HTML entities before persistence.
 */
export function sanitizeOfferSections(input: Partial<Record<OfferSectionName, unknown>>): {
  sections: OfferSections;
  movedApplicationInstructions: number;
  removedExactDuplicates: number;
} {
  const sections: OfferSections = {
    description: [], missions: [], profile: [], education: [], experience: [],
    skills: [], qualities: [], benefits: [], application: [],
  };
  let movedApplicationInstructions = 0;

  for (const name of SECTION_ORDER) {
    const raw = Array.isArray(input[name]) ? input[name] as unknown[] : [];
    for (const item of raw) {
      const text = cleanLine(item);
      if (text.length < 2) continue;
      const split = splitApplicationTail(text);
      if (split.main) sections[name].push(split.main);
      if (split.application) {
        sections.application.push(split.application);
        movedApplicationInstructions++;
      }
    }
  }

  const seen = new Set<string>();
  let removedExactDuplicates = 0;
  for (const name of SECTION_ORDER) {
    const unique: string[] = [];
    for (const value of sections[name]) {
      const key = keyOf(value);
      if (!key) continue;
      if (seen.has(key)) {
        removedExactDuplicates++;
        continue;
      }
      seen.add(key);
      unique.push(value);
    }
    sections[name] = unique;
  }

  return { sections, movedApplicationInstructions, removedExactDuplicates };
}
