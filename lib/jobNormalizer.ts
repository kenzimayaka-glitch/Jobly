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

function extractCompanyNameFromTitle(title: string): string | null {
  const patterns = [
    /\bchez\s+([^|–—\-]{2,100})$/i,
    /[–—]\s*([^|–—\-]{2,100})$/i,
    /\brecrutement\s+(?:à|chez)\s+([^:|]{2,100})(?:\s+\d{4})?(?:\s*[:|]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    const candidate = cleanCompanyName(match?.[1] || null);
    if (candidate && !/^(?:l'entreprise|entreprise|employeur|offre|poste|plusieurs postes)$/i.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

function plausibleExplicitCompany(name: string, title: string): boolean {
  if (!name || name.length < 2 || name.length > 120) return false;
  if (/^(?:pdf\s+ou\s+jpeg|exig|avec\s+l|du\s+fonds\s+pour\s+la\s+paix)$/i.test(name)) return false;
  const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizedTitle = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalizedTitle.includes(normalizedName) || /^[A-ZÀ-Ý0-9][^.!?]{1,80}$/.test(name);
}

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
  if (explicitCompany && plausibleExplicitCompany(explicitCompany, title)) {
    return {
      title,
      companyName: explicitCompany,
      description,
      companySource: "explicit",
    };
  }

  const fromDescription = extractCompanyNameFromDescription(description);
  if (fromDescription && !/^(?:l'entreprise|entreprise|employeur)$/i.test(fromDescription)) {
    return {
      title,
      companyName: fromDescription,
      description,
      companySource: "description",
    };
  }

  const fromTitle = extractCompanyNameFromTitle(title);
  return {
    title,
    companyName: fromTitle,
    description,
    companySource: fromTitle ? "title" : null,
  };
}
