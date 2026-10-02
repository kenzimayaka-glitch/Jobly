import { AFRICA_COUNTRIES, resolveAfricaCountryCode, normalizeCountryText } from "@/lib/countries/africa";

export type MonAfriqueContext = {
  enabled: boolean;
  countries: string[];
  source: "EXPLICIT" | "NONE";
  confirmed: boolean;
};

export function buildMonAfriqueContext(input: string, explicitCountries: unknown[] = []): MonAfriqueContext {
  const text = normalizeCountryText(input);
  const explicit = Array.isArray(explicitCountries)
    ? explicitCountries.map(resolveAfricaCountryCode).filter((value): value is string => Boolean(value))
    : [];
  const detected = AFRICA_COUNTRIES
    .filter(country => [country.name, ...country.aliases].some(alias => text.includes(normalizeCountryText(alias))))
    .map(country => country.code);
  const countries = Array.from(new Set([...explicit, ...detected]));
  const enabled = countries.length > 0 || /mon afrique|mes pays|pays africains|pays d'afrique|pays africain/.test(text);
  return { enabled, countries, source: countries.length ? "EXPLICIT" : "NONE", confirmed: false };
}
