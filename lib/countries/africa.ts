export type AfricaCountry = {
  code: string;
  name: string;
  flag: string;
  aliases: string[];
};

/**
 * Canonical African country catalogue used across Jobly.
 * 54 sovereign states generally recognized as African UN member states.
 * Western Sahara is intentionally not part of this 54-state product set;
 * disputed/special territories must never be inferred silently from this list.
 */
export const AFRICA_COUNTRIES: readonly AfricaCountry[] = [
  { code: "DZ", name: "Algérie", flag: "🇩🇿", aliases: ["Algerie", "Algeria"] },
  { code: "AO", name: "Angola", flag: "🇦🇴", aliases: [] },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", aliases: ["Benin"] },
  { code: "BW", name: "Botswana", flag: "🇧🇼", aliases: [] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", aliases: [] },
  { code: "BI", name: "Burundi", flag: "🇧🇮", aliases: [] },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻", aliases: ["Cap-Vert", "Cape Verde"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", aliases: ["Cameroon"] },
  { code: "CF", name: "République centrafricaine", flag: "🇨🇫", aliases: ["Centrafrique", "Central African Republic"] },
  { code: "TD", name: "Tchad", flag: "🇹🇩", aliases: ["Chad"] },
  { code: "KM", name: "Comores", flag: "🇰🇲", aliases: ["Comoros"] },
  { code: "CG", name: "Congo", flag: "🇨🇬", aliases: ["République du Congo", "Congo-Brazzaville", "Republic of the Congo"] },
  { code: "CD", name: "République démocratique du Congo", flag: "🇨🇩", aliases: ["RDC", "RD Congo", "Congo-Kinshasa", "Democratic Republic of the Congo"] },
  { code: "CI", name: "Côte d’Ivoire", flag: "🇨🇮", aliases: ["Cote d'Ivoire", "Cote d Ivoire", "Ivory Coast"] },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯", aliases: [] },
  { code: "EG", name: "Égypte", flag: "🇪🇬", aliases: ["Egypte", "Egypt"] },
  { code: "GQ", name: "Guinée équatoriale", flag: "🇬🇶", aliases: ["Guinee equatoriale", "Equatorial Guinea"] },
  { code: "ER", name: "Érythrée", flag: "🇪🇷", aliases: ["Erythree", "Eritrea"] },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿", aliases: ["Swaziland"] },
  { code: "ET", name: "Éthiopie", flag: "🇪🇹", aliases: ["Ethiopie", "Ethiopia"] },
  { code: "GA", name: "Gabon", flag: "🇬🇦", aliases: [] },
  { code: "GM", name: "Gambie", flag: "🇬🇲", aliases: ["Gambia"] },
  { code: "GH", name: "Ghana", flag: "🇬🇭", aliases: [] },
  { code: "GN", name: "Guinée", flag: "🇬🇳", aliases: ["Guinea"] },
  { code: "GW", name: "Guinée-Bissau", flag: "🇬🇼", aliases: ["Guinee Bissau", "Guinea-Bissau"] },
  { code: "KE", name: "Kenya", flag: "🇰🇪", aliases: [] },
  { code: "LS", name: "Lesotho", flag: "🇱🇸", aliases: [] },
  { code: "LR", name: "Liberia", flag: "🇱🇷", aliases: [] },
  { code: "LY", name: "Libye", flag: "🇱🇾", aliases: ["Libya"] },
  { code: "MG", name: "Madagascar", flag: "🇲🇬", aliases: [] },
  { code: "MW", name: "Malawi", flag: "🇲🇼", aliases: [] },
  { code: "ML", name: "Mali", flag: "🇲🇱", aliases: [] },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷", aliases: ["Mauritania"] },
  { code: "MU", name: "Maurice", flag: "🇲🇺", aliases: ["Île Maurice", "Mauritius"] },
  { code: "MA", name: "Maroc", flag: "🇲🇦", aliases: ["Morocco"] },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", aliases: [] },
  { code: "NA", name: "Namibie", flag: "🇳🇦", aliases: ["Namibia"] },
  { code: "NE", name: "Niger", flag: "🇳🇪", aliases: [] },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", aliases: [] },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", aliases: [] },
  { code: "ST", name: "Sao Tomé-et-Principe", flag: "🇸🇹", aliases: ["Sao Tome", "Sao Tome and Principe"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", aliases: ["Senegal"] },
  { code: "SC", name: "Seychelles", flag: "🇸🇨", aliases: [] },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱", aliases: [] },
  { code: "SO", name: "Somalie", flag: "🇸🇴", aliases: ["Somalia"] },
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦", aliases: ["South Africa"] },
  { code: "SS", name: "Soudan du Sud", flag: "🇸🇸", aliases: ["South Sudan"] },
  { code: "SD", name: "Soudan", flag: "🇸🇩", aliases: ["Sudan"] },
  { code: "TZ", name: "Tanzanie", flag: "🇹🇿", aliases: ["Tanzania"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", aliases: [] },
  { code: "TN", name: "Tunisie", flag: "🇹🇳", aliases: ["Tunisia"] },
  { code: "UG", name: "Ouganda", flag: "🇺🇬", aliases: ["Uganda"] },
  { code: "ZM", name: "Zambie", flag: "🇿🇲", aliases: ["Zambia"] },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", aliases: [] },
];

export const AFRICA_COUNTRY_CODES = AFRICA_COUNTRIES.map((country) => country.code);

export function getAfricaCountry(code: string | null | undefined) {
  return AFRICA_COUNTRIES.find((country) => country.code === String(code || "").toUpperCase()) ?? null;
}

export function normalizeCountryText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveAfricaCountryCode(value: unknown): string | null {
  const normalized = normalizeCountryText(value).toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized) && AFRICA_COUNTRY_CODES.includes(normalized)) return normalized;
  const match = AFRICA_COUNTRIES.find((country) =>
    [country.name, ...country.aliases].some((candidate) => normalizeCountryText(candidate).toUpperCase() === normalized),
  );
  return match?.code ?? null;
}
