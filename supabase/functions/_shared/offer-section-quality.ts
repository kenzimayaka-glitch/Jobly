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

function extractLabeledSections(sections: OfferSections): void {
  const fullDescription = sections.description.join("\n").trim();
  if (!fullDescription) return;

  const missionHeading = /\bmissions? principales\b/i.exec(fullDescription);
  const profileHeading = /\bprofil\s+recherché(?=\s|$)/i.exec(fullDescription);
  if (!missionHeading || !profileHeading || missionHeading.index === undefined ||
      profileHeading.index === undefined || profileHeading.index <= missionHeading.index) {
    return;
  }

  const applicationHeading = /\b(?:comment postuler|pour postuler|modalités?\s+de candidature|lien\s+de candidature)(?=\s|$)/i.exec(fullDescription);
  const endOfProfile = applicationHeading?.index !== undefined &&
      applicationHeading.index > profileHeading.index
    ? applicationHeading.index
    : fullDescription.length;

  const introStartMatch = /\b(?:présentation du poste|description du poste)(?=\s|$)/i.exec(fullDescription);
  const introStart = introStartMatch?.index !== undefined
    ? introStartMatch.index + introStartMatch[0].length
    : 0;
  const intro = fullDescription.slice(introStart, missionHeading.index).trim();
  const missions = fullDescription.slice(
    missionHeading.index + missionHeading[0].length,
    profileHeading.index,
  ).trim();
  const profile = fullDescription.slice(
    profileHeading.index + profileHeading[0].length,
    endOfProfile,
  ).trim();

  if (missions.length < 40 || profile.length < 40) return;

  sections.description = intro.length >= 20 ? [intro] : [];
  sections.missions = [missions];
  sections.profile = [profile];

  // Remove section fragments already contained in the complete profile,
  // while preserving valid independent tags such as SAP or Excel.
  const normalizedProfile = keyOf(profile);
  for (const name of ["education", "skills", "qualities", "benefits"] as const) {
    sections[name] = sections[name].filter((value) => {
      const normalizedValue = keyOf(value);
      const repeatsProfile = normalizedValue.length >= 18 &&
        normalizedProfile.includes(normalizedValue);
      const danglingFragment =
        /(?:\b(?:de|des|du|d|à|au|aux|et|ou|pour|avec|dans|sur|of|and|or|to|for|with|in)|['’])$/i
          .test(value.trim());
      return !repeatsProfile && !danglingFragment;
    });
  }

  if (applicationHeading?.index !== undefined &&
      applicationHeading.index > profileHeading.index) {
    const applicationText = fullDescription.slice(applicationHeading.index).trim();
    if (applicationText.length >= 20) sections.application.push(applicationText);
  }
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

  extractLabeledSections(sections);

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
