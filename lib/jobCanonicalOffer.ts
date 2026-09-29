import { cleanJobDescription, cleanJobTitle } from "@/lib/jobContent";
import { getNormalizedExperienceYears, normalizeJobContent, type NormalizedJobContent } from "@/lib/jobNormalizer";

export const CANONICAL_OFFER_VERSION = "jobly-offer-v3";
export const SOURCE_VERSION = "source-v1";
export const RENDER_VERSION = "render-v2";
export const EXTRACTION_VERSION = "extract-v3";
export const STRUCTURE_VERSION = "structure-v3";
export const VALIDATION_VERSION = "validation-v3";

export type OfferPipelineStatus = "READY" | "QUARANTINED" | "FAILED";

export type CanonicalOffer = Omit<NormalizedJobContent, "version"> & {
  version: typeof CANONICAL_OFFER_VERSION;
  quality: {
    score: number;
    status: OfferPipelineStatus;
    confidence: {
      identity: number;
      content: number;
      structure: number;
      application: number;
    };
    warnings: string[];
  };
};

export type CanonicalOfferInput = {
  title: unknown;
  companyName?: unknown;
  description?: unknown;
  location?: unknown;
  contractType?: unknown;
  remoteMode?: unknown;
  salaryMin?: unknown;
  salaryMax?: unknown;
  salaryCurrency?: unknown;
  deadline?: unknown;
  source?: unknown;
  sourceUrl?: unknown;
};

const BOILERPLATE = [
  /aller au contenu principal/i,
  /poster une offre/i,
  /toggle navigation/i,
  /cookie settings/i,
  /main navigation/i,
  /articles similaires/i,
  /popular(?: posts| articles)/i,
  /window\.dataLayer/i,
  /gtag\s*\(/i,
  /fbq\s*\(/i,
];

function normalizeRemoteMode(value: unknown): string | null {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (/(?:remote|t[ée]l[ée]travail|distance)/i.test(raw)) return "YES";
  if (/(?:hybrid|hybride)/i.test(raw)) return "PARTIAL";
  if (/(?:onsite|on-site|sur site|sur-site|pr[ée]sentiel)/i.test(raw)) return "NO";
  return null;
}

function meaningful(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .map((value) => String(value || "").replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 2))];
}

function hasBoilerplate(text: string): boolean {
  return BOILERPLATE.some((pattern) => pattern.test(text));
}

function scoreConfidence(content: NormalizedJobContent) {
  const descriptionLength = content.description.join("\n").length;
  const allText = [
    content.title || "",
    content.company || "",
    ...content.description,
    ...content.missions,
    ...content.profile,
    ...content.education,
    ...content.experience,
    ...content.skills,
    ...content.qualities,
    ...content.benefits,
    ...content.application,
  ].join("\n");

  const identity =
    (content.title ? 0.55 : 0) +
    (content.company ? 0.30 : 0) +
    (content.location.length ? 0.15 : 0);

  const contentConfidence =
    Math.min(0.55, descriptionLength / 900) +
    Math.min(0.25, (content.missions.length + content.profile.length) * 0.05) +
    Math.min(0.20, (content.skills.length + content.experience.length + content.education.length) * 0.025);

  const structureFields = [
    content.missions, content.profile, content.education, content.experience,
    content.skills, content.qualities, content.benefits, content.application,
  ].filter((items) => items.length > 0).length;
  const structure = Math.min(1, structureFields / 5);
  const application = content.application.length || content.source.url ? Math.min(1, content.application.length * 0.25 + 0.25) : 0;

  return {
    identity: Number(Math.min(1, identity).toFixed(3)),
    content: Number(Math.min(1, contentConfidence).toFixed(3)),
    structure: Number(structure.toFixed(3)),
    application: Number(application.toFixed(3)),
    allText,
  };
}

export function buildCanonicalOffer(input: CanonicalOfferInput): {
  canonical: CanonicalOffer;
  experienceYears: number | null;
  extractedDescription: string;
} {
  const title = cleanJobTitle(input.title);
  const rawDescription = typeof input.description === "string" ? input.description : "";
  const extractedDescription = cleanJobDescription(rawDescription, title);

  const normalized = normalizeJobContent({
    ...input,
    title,
    description: extractedDescription,
    remoteMode: normalizeRemoteMode(input.remoteMode),
  });

  const { version: _normalizedVersion, ...normalizedContent } = normalized;

  const content = {
    ...normalizedContent,
    title: normalized.title || title || null,
    description: meaningful(normalized.description),
    missions: meaningful(normalized.missions),
    profile: meaningful(normalized.profile),
    education: meaningful(normalized.education),
    experience: meaningful(normalized.experience),
    skills: meaningful(normalized.skills),
    qualities: meaningful(normalized.qualities),
    benefits: meaningful(normalized.benefits),
    application: meaningful(normalized.application),
  } satisfies NormalizedJobContent;

  const confidence = scoreConfidence(content);
  const warnings: string[] = [];
  const descriptionText = content.description.join("\n");
  const allText = confidence.allText;

  if (!content.title) warnings.push("missing_title");
  if (!content.company) warnings.push("missing_company");
  if (!content.description.length || descriptionText.length < 180) warnings.push("thin_description");
  if (hasBoilerplate(allText)) warnings.push("source_chrome_detected");
  if (content.flags.includes("experience_unresolved")) warnings.push("experience_unresolved");
  if (content.flags.includes("skills_unresolved")) warnings.push("skills_unresolved");

  const fatal = !content.title || descriptionText.length < 120 || hasBoilerplate(allText);
  const score = Math.max(0, Math.min(100, Math.round(
    confidence.identity * 30 +
    confidence.content * 40 +
    confidence.structure * 25 +
    confidence.application * 5 -
    warnings.filter((warning) => !warning.endsWith("_unresolved")).length * 8,
  )));

  const structuredItemCount = [
    content.missions, content.profile, content.education, content.experience,
    content.skills, content.qualities, content.benefits, content.application,
  ].reduce((total, items) => total + items.length, 0);
  const status: OfferPipelineStatus =
    fatal || score < 55 || (descriptionText.length < 180 && structuredItemCount < 4)
      ? "QUARANTINED"
      : "READY";

  const canonical: CanonicalOffer = {
    ...content,
    version: CANONICAL_OFFER_VERSION,
    quality: {
      score,
      status,
      confidence: {
        identity: confidence.identity,
        content: confidence.content,
        structure: confidence.structure,
        application: confidence.application,
      },
      warnings,
    },
  };

  return {
    canonical,
    experienceYears: getNormalizedExperienceYears(content),
    extractedDescription,
  };
}

export function canonicalIsPublishable(canonical: CanonicalOffer): boolean {
  const bodyLength = canonical.description.join("\n").length;
  const structuredItemCount = [
    canonical.missions, canonical.profile, canonical.education, canonical.experience,
    canonical.skills, canonical.qualities, canonical.benefits, canonical.application,
  ].reduce((total, items) => total + items.length, 0);
  return canonical.quality.status === "READY" &&
    Boolean(canonical.title) &&
    (bodyLength >= 180 || (bodyLength >= 120 && structuredItemCount >= 4));
}
