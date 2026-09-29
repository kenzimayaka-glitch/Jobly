import { extractOfferBlocks } from "@/lib/jobOfferBlocks";

export type SourceOfferInput = {
  sourceUrl?: unknown;
  title?: unknown;
  description?: unknown;
  renderedHtml?: unknown;
  rawHtml?: unknown;
  location?: unknown;
  deadline?: unknown;
};

export type AdaptedSourceOfferInput = SourceOfferInput & {
  description: string;
  location: string | null;
  deadline: string | null;
  adapterKey: string;
  adapterWarnings: string[];
};

type SourceAdapter = {
  key: string;
  matches: (url: URL) => boolean;
  clean: (text: string, title: string) => string;
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0|\u202f/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function key(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&bull;|&#8226;/gi, "•");
}

function htmlToText(value: string): string {
  return normalizeText(
    decodeEntities(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "\n")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "\n")
      .replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi, "\n")
      .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr|td|main|blockquote)>/gi, "\n")
      .replace(/<(?:br|hr)\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
  );
}

function selectMainHtml(value: string): string {
  const candidates: string[] = [];
  const re = /<(article|main|section|div)\b[^>]*(?:class|id)=["'][^"']*(?:entry-content|post-content|article-content|article-body|post-body|single-post|content-area|job-description|job-detail|offer-content)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of value.matchAll(re)) {
    if ((match[2] || "").length >= 180) candidates.push(match[2]);
  }
  return candidates.sort((a, b) => b.length - a.length)[0] || value;
}

function genericClean(value: string, title: string): string {
  const source = selectMainHtml(value);
  const extracted = extractOfferBlocks(source, "", title);
  if (extracted.text.length >= 120) return extracted.text;
  const text = htmlToText(source);
  const titleKey = key(title);
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean).filter(line =>
    !/^(?:aller au contenu principal|toggle navigation|main navigation|poster une offre|connexion|inscription|accueil|menu|recherche|partager|articles similaires|popular posts?|newsletter|cookies?)$/i.test(line)
  );
  const titleIndex = lines.findIndex(line => key(line) === titleKey);
  const startIndex = titleIndex >= 0 ? titleIndex + 1 : 0;
  return normalizeText(lines.slice(startIndex).filter(line =>
    !/^(?:facebook|twitter|linkedin|instagram|youtube|whatsapp)$/i.test(line) &&
    !/^(?:copyright|©)\s*\d{4}/i.test(line)
  ).join("\n"));
}
const GENERIC_ADAPTER: SourceAdapter = { key: "generic", matches: () => true, clean: genericClean };

const ADAPTERS: SourceAdapter[] = [
  { key: "jobinfocamer", matches: url => /(?:^|\.)jobinfocamer\.com$/i.test(url.hostname), clean: genericClean },
  { key: "minajobs", matches: url => /(?:^|\.)minajobs\.net$/i.test(url.hostname), clean: genericClean },
  { key: "fne", matches: url => /(?:^|\.)fnecm\.org$/i.test(url.hostname), clean: genericClean },
  { key: "un", matches: url => /(?:^|\.)un\.org$/i.test(url.hostname) || /(?:^|\.)unicef\.org$/i.test(url.hostname), clean: genericClean },
];

function adapterFor(sourceUrl: unknown): SourceAdapter {
  try {
    const url = new URL(String(sourceUrl || ""));
    return ADAPTERS.find(adapter => adapter.matches(url)) || GENERIC_ADAPTER;
  } catch {
    return GENERIC_ADAPTER;
  }
}

function extractLabeled(text: string, labels: string[]): string | null {
  const labelPattern = labels.join("|");
  const match = text.match(new RegExp(
    `(?:^|\\n)\\s*(?:${labelPattern})\\s*[:：-]\\s*([^\\n|]{2,120})`,
    "im",
  ));
  return match?.[1]?.trim() || null;
}

function extractLocation(text: string): string | null {
  const explicit = extractLabeled(text, ["Localisation", "Lieu", "Location", "Ville"]);
  if (explicit) return explicit.replace(/[.;,]+$/, "").trim();
  const match = text.match(/\b(?:à|a|dans)\s+(Douala|Yaoundé|Yaounde|Bafoussam|Bamenda|Garoua|Maroua|Bertoua|Ebolowa|Kribi|Limbe|Limbé)\b/i);
  return match?.[1] || null;
}

function parseFrenchDate(value: string): string | null {
  const match = value.match(/(?:\b|^)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\b|$)/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractDeadline(text: string): string | null {
  const labeled = extractLabeled(text, ["Date limite", "Date expiration", "Date d'expiration", "Délai", "Deadline"]);
  const direct =
    labeled ||
    text.match(/(?:jusqu'au|avant le|au plus tard le|clôture le)\s+(?:\w+\s*,?\s*)?(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i)?.[1] ||
    text.match(/(?:\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche),?\s*)?(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/i)?.[1];
  return parseFrenchDate(direct || "");
}

export function adaptSourceOfferInput(input: SourceOfferInput): AdaptedSourceOfferInput {
  const title = normalizeText(input.title);
  const adapter = adapterFor(input.sourceUrl);
  const renderedHtml = normalizeText(input.renderedHtml);
  const originalDescription = normalizeText(input.description);
  const description = renderedHtml ? adapter.clean(renderedHtml, title) : adapter.clean(originalDescription, title);
  const rendered = renderedHtml ? extractOfferBlocks(renderedHtml, originalDescription, title) : null;
  const metadataText = rendered?.text || description;
  const location = extractLocation(metadataText);
  const deadline = extractDeadline(metadataText);
  const warnings: string[] = [];

  if (description !== originalDescription) warnings.push("source_specific_cleaning");
  if (renderedHtml) warnings.push("rendered_blocks_used");
  if (rendered?.diagnostics.estimatedRisks.chromeContamination > 0.35) warnings.push("high_chrome_risk");
  if (rendered?.diagnostics.estimatedRisks.blockLoss > 0.35) warnings.push("high_block_loss_risk");
  if (location && normalizeText(input.location) && key(location) !== key(String(input.location))) warnings.push("source_metadata_location_overridden");
  if (deadline && normalizeText(input.deadline) && key(deadline) !== key(String(input.deadline))) warnings.push("source_metadata_deadline_overridden");

  return {
    ...input,
    title,
    description,
    location: location || normalizeText(input.location) || null,
    deadline: deadline || normalizeText(input.deadline) || null,
    adapterKey: adapter.key,
    adapterWarnings: warnings,
  };
}
