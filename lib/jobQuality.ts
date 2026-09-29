export type JobQualityStatus = "ok" | "needs_review";

const HARD_CONTAMINATION = [
  /window\\.dataLayer/i,
  /\\bgtag\\s*\\(/i,
  /toggle navigation/i,
  /aller au contenu principal/i,
  /poster une offre/i,
  /<script\\b/i,
  /<div\\b/i,
];

const HTML_ENTITY = /&(?:#\\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/i;

export function assessJobQuality(input: { title: string; description: string }): {
  status: JobQualityStatus;
  reasons: string[];
  score: number;
} {
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const reasons: string[] = [];

  for (const pattern of HARD_CONTAMINATION) {
    if (pattern.test(description) || pattern.test(title)) reasons.push(pattern.source);
  }
  if (HTML_ENTITY.test(description)) reasons.push("html_entity");
  if (description.length < 120) reasons.push("description_too_short");
  if (description.length > 30000) reasons.push("description_too_long");
  if (description && !/\\n/.test(description)) reasons.push("no_line_breaks");
  if (!title || title.length < 4) reasons.push("invalid_title");

  const status: JobQualityStatus = reasons.length ? "needs_review" : "ok";
  return { status, reasons: Array.from(new Set(reasons)), score: status === "ok" ? 100 : Math.max(0, 100 - reasons.length * 20) };
}

export function isPublishableJob(input: { isActive: boolean; qualityStatus: string | null | undefined }): boolean {
  return input.isActive === true && input.qualityStatus === "ok";
}
