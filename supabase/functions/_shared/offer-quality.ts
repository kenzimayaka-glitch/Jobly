export type OfferQualityStatus = "ok" | "needs_review";

export type OfferQualityInput = {
  title: unknown;
  description: unknown;
  sourceUrl: unknown;
};

/**
 * Content completeness is independent from the existence of a direct
 * application channel. A source-only offer can be complete and visible;
 * application readiness is represented separately by applicationAvailability.
 */
export function deriveOfferQualityStatus(input: OfferQualityInput): OfferQualityStatus {
  const title = String(input.title ?? "").replace(/\s+/g, " ").trim();
  const description = String(input.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sourceUrl = String(input.sourceUrl ?? "").trim();

  let validSourceUrl = false;
  try {
    const url = new URL(sourceUrl);
    validSourceUrl = url.protocol === "https:" || url.protocol === "http:";
  } catch {
    validSourceUrl = false;
  }

  return title.length >= 4 && description.length >= 60 && validSourceUrl
    ? "ok"
    : "needs_review";
}
