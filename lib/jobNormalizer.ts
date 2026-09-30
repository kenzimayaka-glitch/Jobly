import { validateSemanticField } from "@/lib/semanticFieldValidator";

import {
  cleanCompanyName,
  cleanJobDescription,
  cleanJobTitle,
  extractCompanyNameFromDescription,
} from "@/lib/jobContent";

export type NormalizedJobIdentity = {
  title: string;
  companyName: string | null;
  description: string;
  companySource: "explicit" | "description" | "title" | null;
};

export type NormalizedJobContent = {
  version: "jobly-offer-v2";
  title: string | null;
  company: string | null;
  location: string[];
  region: string | null;
  sector: string | null;
  contractType: string | null;
  remoteMode: string | null;
  salary: { min: number | null; max: number | null; currency: string | null };
  experience: string[];
  education: string[];
  skills: string[];
  qualities: string[];
  missions: string[];
  benefits: string[];
  description: string[];
  profile: string[];
  application: string[];
  deadline: string | null;
  source: { name: string; url: string };
  qualityScore: number | null;
  flags: string[];
};

const SECTION_ALIASES: Record<string, string> = {
  mission: "missions", missions: "missions", "missions et responsabilites": "missions", responsabilite: "missions",
  responsabilites: "missions", tache: "missions", taches: "missions",
  "responsabilites principales": "missions", "missions principales": "missions",
  profil: "profile", "profil recherche": "profile", "profil recherche ": "profile",
  "profil et parcours academique": "profile", exigences: "profile",
  qualifications: "profile", "candidat recherche": "profile",
  formation: "education", formations: "education", diplome: "education",
  diplomes: "education", etudes: "education", "parcours academique": "education",
  experience: "experience", "experience professionnelle": "experience",
  "experiences professionnelles": "experience",
  competence: "skills", competences: "skills", "competences techniques": "skills",
  "aptitudes techniques": "skills", "savoir faire": "skills", "savoir-faire": "skills",
  qualite: "qualities", qualites: "qualities", "qualites recherchees": "qualities", "savoir etre": "qualities",
  "savoir-etre": "qualities", "aptitudes comportementales": "qualities",
  avantage: "benefits", avantages: "benefits", "ce que nous offrons": "benefits",
  "conditions de travail": "benefits", "aptitudes techniques et comportementales": "mixedAptitudes",
  candidature: "application", "pour postuler": "application",
  "modalites de candidature": "application", "comment postuler": "application",
  "documents a fournir": "application", "documents a joindre": "application",
  "comment candidater": "application", "modalites pour postuler": "application",
  "modalites pour candidater": "application", "procedure de candidature": "application",
  "processus de candidature": "application", "dossier de candidature": "application",
  "pieces a fournir": "application", "pieces a joindre": "application",
};

const KNOWN_HEADERS = [
  "Missions et responsabilités", "Missions et responsabilites", "Responsabilités principales",
  "Responsabilités", "Missions", "Tâches", "Profil et parcours académique",
  "Profil et parcours academique", "Profil recherché", "Profil recherche", "Exigences",
  "Qualifications", "Formation", "Formations", "Parcours académique", "Parcours academique",
  "Expérience professionnelle", "Experience professionnelle", "Expérience", "Experience",
  "Compétences techniques", "Competences techniques", "Compétences", "Competences",
  "Aptitudes techniques et comportementales", "Aptitudes techniques", "Aptitudes comportementales",
  "Savoir-faire", "Qualités", "Qualités recherchées", "Avantages", "Ce que nous offrons",
  "Conditions de travail", "Comment postuler", "Candidature", "Modalités de candidature",
  "Documents à fournir", "Documents à joindre",
];

function decodeEntities(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&bull;|&#8226;/gi, "•").replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—");
}

function repairEncoding(value: string): string {
  if (!/(?:Ã.|Â.|â.)/.test(value)) return value;
  try {
    const bytes = new Uint8Array([...value].map((c) => c.charCodeAt(0) <= 255 ? c.charCodeAt(0) : 63));
    const repaired = new TextDecoder().decode(bytes);
    return repaired && !repaired.includes("�") ? repaired : value;
  } catch { return value; }
}

function htmlToText(value: string): string {
  let text = decodeEntities(String(value || ""));
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "\n")
    .replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi, "\n")
    .replace(/function\s+(?:gtag|fbq)\s*\([^)]*\)\s*\{[\s\S]{0,500}?\}\s*;?/gi, "\n")
    .replace(/(?:window\.)?(?:dataLayer|gtag|fbq)\s*(?:=|\()[\s\S]{0,1200}?(?:\);|;|\n)/gi, "\n")
    .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<(?:br|hr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\uFFFD+/g, " ");
  return repairEncoding(text).replace(/\b(?:window|document)\.(?:dataLayer|gtag|fbq)\b[\s\S]{0,500}/gi, " ")
    .replace(/[ \t]+/g, " ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function key(value: string): string {
  return repairEncoding(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@.+#/_ -]+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanBullet(value: string): string {
  return value.replace(/^[\s•●▪◦\-*–—·]+/, "").replace(/^\d+[.)]\s*/, "")
    .replace(/\s+/g, " ").trim().replace(/^[,:;|]+|[,:;|]+$/g, "").trim();
}

function normalizeOfferText(value: string): string {
  return repairEncoding(decodeEntities(String(value || "")))
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[�□■]+/g, " ")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function unique(values: string[], max = 40): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = cleanBullet(normalizeOfferText(raw));
    const signature = key(value);
    if (value.length < 2 || !signature || seen.has(signature)) continue;
    seen.add(signature);
    result.push(value);
    if (result.length >= max) break;
  }
  return result;
}

type SectionKey = "description" | "missions" | "profile" | "education" | "experience" | "skills" | "qualities" | "benefits" | "application";

const SECTION_PRIORITY: SectionKey[] = [
  "application", "experience", "education", "skills", "qualities", "missions", "benefits", "profile", "description",
];

function classifyUnlabelledLine(line: string): SectionKey | null {
  const normalized = key(line);
  if (!normalized) return null;

  // Application has the highest semantic specificity. Once a line contains
  // explicit candidature signals, it must not leak into profile/qualities.
  if (
    /@/.test(normalized) ||
    /\b(?:objet|subject|indiquer en objet|mettre en objet|avec pour objet)\b/.test(normalized) ||
    /\b(?:envoyer|envoyez|adressez|transmettez|postulez|candidater|candidature|deposer|déposer|soumettre|apply)\b.*\b(?:cv|curriculum|lettre|mail|email|candidature|dossier|postuler)\b/.test(normalized) ||
    /\b(?:cv|curriculum|lettre de motivation|dossier de candidature|pieces? a fournir|documents? a (?:fournir|joindre))\b/.test(normalized)
  ) return "application";

  if (/\b(?:experience|exp\.?)\b|\b\d+\s*(?:ans?|annees?)\b/.test(normalized)) return "experience";
  if (/\b(?:bac\s*\+|licence|master|mba|doctorat|diplome|formation|etudes|parcours academique)\b/.test(normalized)) return "education";
  if (/\b(?:competence|competences|maitrise|connaissance|savoir-faire|logiciel|excel|word|sql|erp|powerpoint)\b/.test(normalized)) return "skills";
  if (/\b(?:qualite|qualites|rigueur|autonome|autonomie|esprit d equipe|adaptabilite|organisation)\b/.test(normalized)) return "qualities";
  if (/\b(?:aura pour mission|auront pour mission|vous serez charge|vous serez en charge|responsable de|consistera a|missions principales|vos responsabilites)\b/.test(normalized)) return "missions";
  if (/\b(?:avantages|assurance|mutuelle|prime|transport|conges|indemnite)\b/.test(normalized)) return "benefits";
  return null;
}

function applicationSignalScore(line: string): number {
  const normalized = key(line);
  if (!normalized) return 0;
  let score = 0;
  if (/@/.test(normalized)) score += 5;
  if (/\b(?:objet|subject|indiquer en objet|mettre en objet|avec pour objet|mentionner en objet)\b/.test(normalized)) score += 5;
  if (/\b(?:adresse de candidature|email de candidature|mail de candidature|telephone de candidature|numero de candidature)\b/.test(normalized)) score += 5;
  if (/\b(?:envoyer|envoyez|adressez|transmettez|postulez|candidater|candidature|deposer|déposer|soumettre|apply|postuler)\b/.test(normalized)) score += 3;
  if (/\b(?:cv|curriculum vitae|lettre de motivation|dossier de candidature|pieces? a fournir|documents? a (?:fournir|joindre)|fichier|pdf)\b/.test(normalized)) score += 3;
  if (/\b(?:avant le|au plus tard le|date limite|deadline)\b/.test(normalized) && /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/.test(normalized)) score += 1;
  return score;
}

function isStrongApplicationLine(line: string): boolean {
  return applicationSignalScore(line) >= 3;
}

function normalizedDuplicateKey(value: string): string {
  return key(value)
    .replace(/\b(?:merci de|veuillez|priere de|pri[eè]re de)\b/g, "")
    .replace(/\b(?:cliquer|cliquez|suivre|consulter)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizedDuplicateKey(value).split(" ").filter(token => token.length > 1));
}

function nearDuplicate(a: string, b: string): boolean {
  const na = normalizedDuplicateKey(a);
  const nb = normalizedDuplicateKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 30 && (na.includes(nb) || nb.includes(na))) return true;
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (aTokens.size < 5 || bTokens.size < 5) return false;
  let common = 0;
  for (const token of aTokens) if (bTokens.has(token)) common++;
  const overlap = common / Math.min(aTokens.size, bTokens.size);
  return overlap >= 0.92;
}

function enforceSectionExclusivity(sections: Record<SectionKey, string[]>): Record<SectionKey, string[]> {
  const working = Object.fromEntries(
    Object.entries(sections).map(([name, values]) => [name, unique(values)]),
  ) as Record<SectionKey, string[]>;

  // First pass: application evidence is the most specific semantic signal.
  // It must win even when a source incorrectly places the line under profile,
  // qualities, description, or another section.
  for (const section of SECTION_PRIORITY) {
    if (section === "application") continue;
    const kept: string[] = [];
    for (const line of working[section]) {
      if (isStrongApplicationLine(line)) working.application.push(line);
      else kept.push(line);
    }
    working[section] = kept;
  }

  // Unlabelled context is classified only after application has been given
  // first ownership. This prevents generic words such as "qualités" or
  // "organisation" from stealing an actual candidature instruction.
  const context: string[] = [];
  for (const line of working.description) {
    const target = classifyUnlabelledLine(line);
    if (target && target !== "description") working[target].push(line);
    else context.push(line);
  }
  working.description = context;

  // Re-run the application gate after contextual classification because the
  // classifier can create a new application candidate.
  for (const section of SECTION_PRIORITY) {
    if (section === "application") continue;
    const kept: string[] = [];
    for (const line of working[section]) {
      if (isStrongApplicationLine(line)) working.application.push(line);
      else kept.push(line);
    }
    working[section] = kept;
  }

  // Canonical ownership: application first, then the most specific factual
  // sections. Exact duplicates and very-high-overlap copies are removed only
  // when they represent the same sentence/fact; short shared phrases remain.
  const seen: string[] = [];
  for (const section of SECTION_PRIORITY) {
    const next: string[] = [];
    for (const line of working[section]) {
      const signature = normalizedDuplicateKey(line);
      if (!signature) continue;
      if (seen.some(previous => nearDuplicate(previous, line))) continue;
      seen.push(line);
      next.push(line);
    }
    working[section] = next;
  }

  return working;
}

function splitKnownHeaders(value: string): string {
  let result = value;
  for (const header of [...KNOWN_HEADERS].sort((a, b) => b.length - a.length)) {
    const escaped = header.replace(/[.*+?^\$()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp("\\s+(?=" + escaped + "\\s*[:：]?\\s*)", "gi"), "\n");
  }
  return result;
}

function classifyMixedAptitude(line: string): "skills" | "qualities" {
  const normalized = key(line);
  const technical = ["droit", "code du travail", "sage", "excel", "word", "powerpoint", "paie",
    "logiciel", "informatique", "sql", "erp", "anglais", "francais", "outil", "technique",
    "comptabilite", "fiscal", "rh", "ressources humaines"];
  return technical.some((term) => normalized.includes(term)) ? "skills" : "qualities";
}

function parseSections(raw: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {
    description: [], missions: [], profile: [], education: [], experience: [],
    skills: [], qualities: [], benefits: [], application: [],
  };
  let current = "description";
  let mixedAptitudes = false;
  const prepared = splitKnownHeaders(htmlToText(raw))
    .replace(/\b(?:accueil|connexion|inscription|menu|recherche)\b/gi, " ")
    .replace(/\n{3,}/g, "\n\n");

  for (const rawLine of prepared.split(/\n+/)) {
    const line = cleanBullet(rawLine);
    if (!line) continue;
    const colon = line.match(/^(.{2,90}?)\s*[:：]\s*(.*)$/);
    const candidate = key(colon?.[1] || line);
    const alias = SECTION_ALIASES[candidate];
    if (alias) {
      current = alias;
      mixedAptitudes = candidate === "aptitudes techniques et comportementales";
      if (colon?.[2]) {
        const content = cleanBullet(colon[2]);
        if (content) {
          if (mixedAptitudes) sections[classifyMixedAptitude(content)].push(content);
          else sections[current].push(content);
        }
      }
      continue;
    }
    if (/^aptitudes techniques et comportementales\b/i.test(line)) {
      current = "skills"; mixedAptitudes = true; continue;
    }
    if (mixedAptitudes) sections[classifyMixedAptitude(line)].push(line);
    else sections[current].push(line);
  }
  return sections;
}

function stripBoilerplate(values: string[]): string[] {
  return unique(values.filter((value) =>
    !/^(?:accueil|menu|connexion|inscription|recherche|partager|facebook|twitter|linkedin)$/i.test(value) &&
    !/^(?:window\.|gtag\(|fbq\(|dataLayer)/i.test(value)
  ));
}

function plausibleExplicitCompany(name: string, title: string, context = ""): boolean {
  if (!name || name.length < 2 || name.length > 120) return false;
  if (/^(?:pdf\s+ou\s+jpeg|exig|avec\s+l|du\s+fonds\s+pour\s+la\s+paix)$/i.test(name)) return false;
  return validateSemanticField("company", name, [title, context].filter(Boolean).join("\n")).accepted;
}

function extractCompanyNameFromTitle(title: string): string | null {
  const patterns = [
    /\bchez\s+([^|–—\-]{2,100})$/i,
    /[–—]\s*([^|–—\-]{2,100}?)(?:\s+\d{4})?$/i,
    /\brecrutement\s+(?:à|chez)\s+([^:|]{2,100})(?:\s+\d{4})?(?:\s*[:|]|$)/i,
  ];
  for (const pattern of patterns) {
    const candidate = cleanCompanyName(title.match(pattern)?.[1] || null);
    if (candidate && !/^(?:l'entreprise|entreprise|employeur|offre|poste|plusieurs postes|202[0-9])$/i.test(candidate)) {
      return candidate.replace(/\s+20\d{2}$/i, "").trim();
    }
  }
  return null;
}

export function normalizeJobContent(input: {
  title: unknown; companyName?: unknown; description?: unknown; location?: unknown;
  contractType?: unknown; remoteMode?: unknown; salaryMin?: unknown; salaryMax?: unknown;
  salaryCurrency?: unknown; deadline?: unknown; source?: unknown; sourceUrl?: unknown;
}): NormalizedJobContent {
  const title = cleanJobTitle(input.title);
  const description = normalizeOfferText(cleanJobDescription(input.description ?? "", title));
  const explicitCompany = cleanCompanyName(input.companyName);
  const descriptionCompany = extractCompanyNameFromDescription(description);
  const titleCompany = extractCompanyNameFromTitle(title);
  const companyCandidates = [explicitCompany, descriptionCompany, titleCompany].filter(
    (value): value is string => Boolean(value),
  );
  const companyName = companyCandidates.find((candidate) =>
    plausibleExplicitCompany(candidate, title, description),
  ) || null;
  // Parse the same canonical description used for identity extraction and storage.
  // The raw input is intentionally unknown, so never pass it directly to a string-only parser.
  const sections = parseSections(description);
  const classified = enforceSectionExclusivity({
    description: stripBoilerplate(sections.description),
    missions: stripBoilerplate(sections.missions),
    profile: stripBoilerplate(sections.profile),
    education: stripBoilerplate(sections.education),
    experience: stripBoilerplate(sections.experience),
    skills: stripBoilerplate(sections.skills),
    qualities: stripBoilerplate(sections.qualities),
    benefits: stripBoilerplate(sections.benefits),
    application: stripBoilerplate(sections.application),
  });
  const location = String(input.location || "").split(/[,;|]/).map((value) => cleanBullet(normalizeOfferText(value))).filter(Boolean);

  return {
    version: "jobly-offer-v2", title: normalizeOfferText(title) || null, company: companyName ? normalizeOfferText(companyName) : null,
    location: unique(location, 10), region: null, sector: null,
    contractType: (() => {
      const value = normalizeOfferText(String(input.contractType || ""));
      return validateSemanticField("contract", value, description).accepted ? value || null : null;
    })(),
    remoteMode: normalizeOfferText(String(input.remoteMode || "")) || null,
    salary: {
      min: Number.isFinite(Number(input.salaryMin)) ? Number(input.salaryMin) : null,
      max: Number.isFinite(Number(input.salaryMax)) ? Number(input.salaryMax) : null,
      currency: normalizeOfferText(String(input.salaryCurrency || "")) || null,
    },
    experience: classified.experience,
    education: classified.education,
    skills: classified.skills,
    qualities: classified.qualities,
    missions: classified.missions,
    benefits: classified.benefits,
    profile: classified.profile,
    // "À propos de l'offre" is context only. Never fall back to the full
    // source description after classification.
    description: classified.description,
    application: classified.application,
    deadline: input.deadline ? normalizeOfferText(String(input.deadline)) : null,
    source: { name: normalizeOfferText(String(input.source || "")), url: String(input.sourceUrl || "").trim() },
    qualityScore: null,
    flags: [
      ...(classified.experience.length === 0 && /(?:ans?|annee|experience)/i.test(description) ? ["experience_unresolved"] : []),
      ...(classified.skills.length === 0 && /(?:competence|aptitude technique|savoir-faire)/i.test(description) ? ["skills_unresolved"] : []),
    ],
  };
}

export function getNormalizedExperienceYears(content: Pick<NormalizedJobContent, "experience">): number | null {
  const text = content.experience.join(" ");
  const numeric = text.match(/(?:minimum|minimale?|au moins|justifier\s+d['’]?une?\s+)?\s*(\d+)\s*(?:\(\s*\d+\s*\))?\s*(?:ans?|annee(?:s)?)/i);
  if (numeric?.[1]) return Number(numeric[1]);
  const words: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
  const word = text.match(/(?:minimum|minimale?|au moins|justifier\s+d['’]?une?\s+)\s*(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*(?:ans?|annee(?:s)?)/i);
  return word?.[1] ? words[word[1].toLowerCase()] ?? null : null;
}

export function normalizeJobIdentity(input: {
  title: unknown; companyName?: unknown; description?: unknown;
}): NormalizedJobIdentity {
  const title = cleanJobTitle(input.title);
  const description = cleanJobDescription(input.description ?? "", title);
  const explicitCompany = cleanCompanyName(input.companyName);
  if (explicitCompany && plausibleExplicitCompany(explicitCompany, title)) {
    return { title, companyName: explicitCompany, description, companySource: "explicit" };
  }
  const fromDescription = extractCompanyNameFromDescription(description);
  if (fromDescription && !/^(?:l'entreprise|entreprise|employeur|pdf ou jpeg|avec l|du fonds pour la paix)$/i.test(fromDescription)) {
    return { title, companyName: fromDescription, description, companySource: "description" };
  }
  const fromTitle = extractCompanyNameFromTitle(title);
  return { title, companyName: fromTitle, description, companySource: fromTitle ? "title" : null };
}
