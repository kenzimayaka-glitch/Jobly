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
};

/**
 * Single canonical identity pass for an offer.
 * The UI and API should consume these values instead of independently
 * repairing title/company/description at render time.
 */
export function normalizeJobIdentity(input: {
  title: unknown;
  companyName?: unknown;
  description?: unknown;
}): NormalizedJobIdentity {
  const title = cleanJobTitle(input.title);
  const description = cleanJobDescription(input.description ?? "", title);
  const explicitCompany = cleanCompanyName(input.companyName);
  const detectedCompany =
    explicitCompany || extractCompanyNameFromDescription(description);

  return {
    title,
    companyName: detectedCompany,
    description,
  };
}
