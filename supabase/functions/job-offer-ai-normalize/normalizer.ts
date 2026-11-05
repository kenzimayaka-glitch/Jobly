export type OfferForAi = {
  id: string;
  title: string;
  company?: string | null;
  location?: string | null;
  description: string;
  source?: string | null;
  sourceKey?: string | null;
  sourceUrl?: string | null;
  normalizedContent?: Record<string, unknown> | null;
};

export const OFFER_SECTION_KEYS = [
  "summary",
  "description",
  "missions",
  "profile",
  "requirements",
  "education",
  "experience",
  "skills",
  "qualities",
  "workConditions",
  "schedule",
  "travel",
  "benefits",
  "documents",
  "languages",
  "selectionProcess",
  "application",
  "other",
] as const;

export type OfferSectionKey = (typeof OFFER_SECTION_KEYS)[number];
export type DisplaySection = { key: OfferSectionKey; label: string; kind: "paragraph" | "bullets" | "steps" };

const DEFAULT_LABELS: Record<OfferSectionKey, string> = {
  summary: "En bref",
  description: "Présentation",
  missions: "Missions et responsabilités",
  profile: "Profil recherché",
  requirements: "Conditions et exigences",
  education: "Formation",
  experience: "Expérience",
  skills: "Compétences",
  qualities: "Qualités recherchées",
  workConditions: "Conditions de travail",
  schedule: "Horaires",
  travel: "Déplacements et mobilité",
  benefits: "Avantages",
  documents: "Documents à fournir",
  languages: "Langues",
  selectionProcess: "Processus de sélection",
  application: "Modalités de candidature",
  other: "Informations complémentaires",
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const cleanText = (value: unknown, max = 1200): string =>
  typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";

const cleanList = (value: unknown, maxItems = 30): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => cleanText(item)).filter((item) => item.length >= 2))).slice(0, maxItems)
    : [];

export function buildGeminiBatchPrompt(offers: OfferForAi[]): string {
  const payload = offers.map((offer) => {
    const normalized = asRecord(offer.normalizedContent);
    return {
      id: offer.id,
      source: offer.source || cleanText(normalized.source && asRecord(normalized.source).name),
      sourceKey: offer.sourceKey || cleanText(normalized.sourceKey),
      sourceDisplayModel: cleanText(normalized.displayModel),
      sourceUrl: offer.sourceUrl,
      title: offer.title,
      company: offer.company,
      location: offer.location,
      opportunityType: cleanText(normalized.opportunityType),
      originalDescription: offer.description.slice(0, 9000),
    };
  });

  return [
    "Tu es le moteur de compréhension et de classement des offres de JOBLY.",
    "Analyse chaque offre indépendamment. Le format, les titres de rubriques et l'ordre des informations peuvent varier selon la source.",
    "Ne force jamais toutes les offres dans une présentation identique. Produis un classement canonique des informations ET une présentation adaptée à cette offre et à sa source.",
    "Conserve le sens des phrases originales. N'invente aucun salaire, diplôme, expérience, date, lieu, contact, exigence ou avantage.",
    "Une information absente doit rester vide ou null. N'utilise pas de déduction pour compléter une rubrique.",
    "Répartis les informations uniquement dans ces clés de sections : " + OFFER_SECTION_KEYS.join(", ") + ".",
    "Le champ presentation.sections doit contenir les clés présentes dans sections, dans l'ordre de lecture pertinent, avec un label naturel adapté au vocabulaire de la source et un kind parmi paragraph, bullets, steps.",
    "Choisis presentation.layout parmi EDITORIAL, COMPACT, STRUCTURED, PROCESS ou APPLICATION_FIRST selon le contenu réel. Ce choix peut varier d'une offre à l'autre.",
    "Les rubriques de la source peuvent avoir des intitulés inhabituels : comprends leur sens avant de les classer. Si un intitulé source est pertinent, conserve-le comme label dans presentation.sections.",
    "Retourne un JSON strict de la forme {offers:[{id,title,company,location,region,sector,contractType,remoteMode,salary:{min,max,currency,raw},minExperienceYears,deadline,summary,qualityScore,confidence,flags,sections:{...},presentation:{layout,sourceLabel,sections:[{key,label,kind}]}}]}.",
    "qualityScore évalue seulement la complétude et l'exploitabilité des informations présentes, pas l'attractivité du poste.",
    "Ne renvoie aucune information pour les IDs qui ne figurent pas dans les données.",
    "OFFRES À ANALYSER :",
    JSON.stringify(payload),
  ].join("\n\n");
}

export function parseGeminiOffers(text: string): Record<string, unknown>[] {
  const clean = text.trim().replace(/^\u0060\u0060\u0060(?:json)?\s*/i, "").replace(/\s*\u0060\u0060\u0060$/i, "");
  const parsed = JSON.parse(clean) as unknown;
  const root = asRecord(parsed);
  if (!Array.isArray(root.offers)) throw new Error("GEMINI_INVALID_OFFERS_ARRAY");
  return root.offers.map(asRecord);
}

export function normalizeGeminiOffer(
  rawValue: unknown,
  offer: OfferForAi,
  model: string,
  processedAt: string,
): Record<string, unknown> {
  const raw = asRecord(rawValue);
  const existing = asRecord(offer.normalizedContent);
  const rawSections = asRecord(raw.sections);
  const sections = Object.fromEntries(
    OFFER_SECTION_KEYS.map((key) => [key, cleanList(rawSections[key])]),
  ) as Record<OfferSectionKey, string[]>;

  const originalDescription = cleanText(offer.description, 30000);
  if (!sections.description.length && originalDescription) sections.description = [originalDescription];

  const presentation = asRecord(raw.presentation);
  const rawDescriptors = Array.isArray(presentation.sections) ? presentation.sections : [];
  const descriptors: DisplaySection[] = [];
  const seen = new Set<string>();

  for (const descriptorValue of rawDescriptors) {
    const descriptor = asRecord(descriptorValue);
    const key = cleanText(descriptor.key, 50) as OfferSectionKey;
    if (!OFFER_SECTION_KEYS.includes(key) || !sections[key]?.length || seen.has(key)) continue;
    const kindValue = cleanText(descriptor.kind, 30);
    const kind = kindValue === "paragraph" || kindValue === "steps" ? kindValue : "bullets";
    descriptors.push({
      key,
      label: cleanText(descriptor.label, 80) || DEFAULT_LABELS[key],
      kind,
    });
    seen.add(key);
  }

  for (const key of OFFER_SECTION_KEYS) {
    if (sections[key].length && !seen.has(key)) {
      descriptors.push({
        key,
        label: DEFAULT_LABELS[key],
        kind: key === "summary" || key === "description" ? "paragraph" : key === "selectionProcess" ? "steps" : "bullets",
      });
    }
  }

  const requestedLayout = cleanText(presentation.layout, 40).toUpperCase();
  const layout = ["EDITORIAL", "COMPACT", "STRUCTURED", "PROCESS", "APPLICATION_FIRST"].includes(requestedLayout)
    ? requestedLayout
    : "STRUCTURED";
  const existingSource = asRecord(existing.source);
  const sourceKey = offer.sourceKey || cleanText(existing.sourceKey);
  const sourceName = offer.source || cleanText(existingSource.name);
  const displayModel = cleanText(existing.displayModel) || `jobly-source-${sourceKey || "unknown"}-adaptive-v1`;
  const confidence = cleanText(raw.confidence).toUpperCase();
  const flags = cleanList(raw.flags, 20);
  const quality = Number(raw.qualityScore);
  const salary = asRecord(raw.salary);
  const location = cleanList(raw.location, 10);
  const title = cleanText(raw.title, 300) || offer.title;
  const company = cleanText(raw.company, 180) || offer.company || cleanText(existing.company, 180) || null;
  const summary = cleanText(raw.summary, 1800);

  return {
    ...existing,
    version: "jobly-offer-ai-v1",
    title,
    company,
    location: location.length ? location : existing.location ?? offer.location ?? null,
    region: cleanText(raw.region, 120) || existing.region || null,
    sector: cleanText(raw.sector, 120) || existing.sector || null,
    contractType: cleanText(raw.contractType, 80) || existing.contractType || null,
    remoteMode: cleanText(raw.remoteMode, 40) || existing.remoteMode || null,
    salary: {
      min: Number.isFinite(Number(salary.min)) ? Number(salary.min) : asRecord(existing.salary).min ?? null,
      max: Number.isFinite(Number(salary.max)) ? Number(salary.max) : asRecord(existing.salary).max ?? null,
      currency: cleanText(salary.currency, 12) || cleanText(asRecord(existing.salary).currency, 12) || null,
      raw: cleanText(salary.raw, 200) || null,
    },
    minExperienceYears: Number.isFinite(Number(raw.minExperienceYears))
      ? Number(raw.minExperienceYears)
      : existing.minExperienceYears ?? null,
    deadline: cleanText(raw.deadline, 80) || existing.deadline || null,
    summary: summary || null,
    description: sections.description,
    missions: sections.missions,
    profile: sections.profile,
    education: sections.education,
    experience: sections.experience,
    skills: sections.skills,
    qualities: sections.qualities,
    benefits: sections.benefits,
    application: sections.application,
    sections,
    displayModel,
    source: {
      ...existingSource,
      name: sourceName || null,
      url: offer.sourceUrl || cleanText(existingSource.url) || null,
    },
    presentation: {
      layout,
      sourceKey: sourceKey || null,
      sourceLabel: cleanText(presentation.sourceLabel, 100) || sourceName || sourceKey || "Source",
      sourceDisplayModel: displayModel,
      sections: descriptors,
    },
    aiClassification: {
      provider: "GEMINI",
      model,
      confidence: confidence === "HIGH" || confidence === "LOW" ? confidence : "MEDIUM",
      qualityScore: Number.isFinite(quality) ? Math.max(0, Math.min(100, quality)) : null,
      flags,
      processedAt,
    },
  };
}

export function defaultSectionLabels(): Record<OfferSectionKey, string> {
  return { ...DEFAULT_LABELS };
}
