const COMPANY_LOGO_FILL = "#22448B";
const COMPANY_LOGO_TEXT = "#FFFFFF";

/**
 * Derive a short, safe placeholder label from a normalized company hostname.
 * Only ASCII letters and digits are retained before rendering into SVG text.
 */
export function getCompanyLogoInitials(domain: string): string {
  const label = String(domain || "").trim().toLowerCase().split(".")[0] || "";
  return label.replace(/[^a-z0-9]/g, "").slice(0, 2).toUpperCase() || "CO";
}

/** Deterministic, self-contained SVG used when upstream favicon providers fail. */
export function buildCompanyLogoFallbackSvg(domain: string): string {
  const initials = getCompanyLogoInitials(domain);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
    '<rect width="128" height="128" rx="28" fill="' + COMPANY_LOGO_FILL + '"/>',
    '<text x="64" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="' + COMPANY_LOGO_TEXT + '">' + initials + "</text>",
    "</svg>",
  ].join("");
}
