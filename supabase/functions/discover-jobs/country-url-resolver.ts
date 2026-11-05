import { getActiveSources, type SourceDefinition } from "./source-registry.ts";

export type ResolvedSourceUrl = {
  sourceKey: string;
  countryCode: string;
  url: string;
  strategy: "country-template" | "query-country" | "country-path" | "static" | "unresolved";
  confidence: "high" | "medium" | "low";
};

const COUNTRY_NAMES: Record<string,string> = {
  CM:"Cameroon", DZ:"Algeria", EG:"Egypt", LY:"Libya", MA:"Morocco", MR:"Mauritania", TN:"Tunisia",
  BJ:"Benin", BF:"Burkina Faso", CV:"Cape Verde", CI:"Cote d'Ivoire", GM:"Gambia", GH:"Ghana", GN:"Guinea",
  GW:"Guinea-Bissau", LR:"Liberia", ML:"Mali", NE:"Niger", NG:"Nigeria", SN:"Senegal", SL:"Sierra Leone", TG:"Togo",
  CF:"Central African Republic", TD:"Chad", CG:"Congo", CD:"Democratic Republic of the Congo", GQ:"Equatorial Guinea",
  GA:"Gabon", ST:"Sao Tome and Principe", BI:"Burundi", AO:"Angola", KE:"Kenya", UG:"Uganda", TZ:"Tanzania",
  RW:"Rwanda", ET:"Ethiopia", DJ:"Djibouti", ER:"Eritrea", SO:"Somalia", SS:"South Sudan", SD:"Sudan",
  KM:"Comoros", MG:"Madagascar", MU:"Mauritius", SC:"Seychelles", ZA:"South Africa", ZM:"Zambia", ZW:"Zimbabwe",
  MW:"Malawi", MZ:"Mozambique", NA:"Namibia", BW:"Botswana", SZ:"Eswatini", LS:"Lesotho"
};

const COUNTRY_SLUGS: Record<string,string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code,name]) => [code, name.toLowerCase().replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")])
);

function normalizeUrlToken(value:string):string {
  return decodeURIComponent(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function hasCountry(url:string, countryCode:string):boolean {
  const name = COUNTRY_NAMES[countryCode];
  if(!name) return false;
  const expected = new Set([countryCode.toLowerCase(),normalizeUrlToken(name),COUNTRY_SLUGS[countryCode]]);
  try {
    const parsed = new URL(url);
    const parts = [
      ...parsed.hostname.split("."),
      ...parsed.pathname.split("/"),
      ...Array.from(parsed.searchParams.values()),
    ].map(normalizeUrlToken).filter(Boolean);
    return parts.some(part => [...expected].some(token =>
      token && (part===token || part.startsWith(token+"-") || part.endsWith("-"+token) || part.includes("-"+token+"-"))
    ));
  } catch {
    return false;
  }
}

function replaceCountryToken(value:string, countryCode:string):string {
  const name = COUNTRY_NAMES[countryCode] || countryCode;
  return value
    .replace(/\{countryCode\}/g, countryCode.toLowerCase())
    .replace(/\{country\}/g, encodeURIComponent(name))
    .replace(/\{countrySlug\}/g, COUNTRY_SLUGS[countryCode] || countryCode.toLowerCase());
}

export function resolveSourceUrl(source:SourceDefinition, countryCode:string):ResolvedSourceUrl {
  const productionActive = source.enabled && source.status === "active";
  const approvedShadowCandidate = source.shadowCrawlEligible === true && source.status === "discovered" && !source.enabled;
  if ((!productionActive && !approvedShadowCandidate) || !source.url) {
    return {sourceKey:source.key,countryCode,url:"",strategy:"unresolved",confidence:"low"};
  }
  if (!source.countries.includes(countryCode)) {
    return {sourceKey:source.key,countryCode,url:"",strategy:"unresolved",confidence:"low"};
  }

  const base = source.url;
  if (hasCountry(base,countryCode)) {
    return {sourceKey:source.key,countryCode,url:base,strategy:"static",confidence:"high"};
  }

  switch(source.key) {
    case "reliefweb":
    case "reliefweb_africa":
      return {sourceKey:source.key,countryCode,url:`https://reliefweb.int/jobs?advanced-search=%28${encodeURIComponent(COUNTRY_NAMES[countryCode] || countryCode)}%29`,strategy:"query-country",confidence:"high"};
    case "unjobs":
    case "unjobs_africa":
      return {sourceKey:source.key,countryCode,url:`https://unjobs.org/duty_stations/${COUNTRY_SLUGS[countryCode] || countryCode.toLowerCase()}`,strategy:"country-path",confidence:"high"};
    case "impactpool":
    case "impactpool_africa":
      return {sourceKey:source.key,countryCode,url:`https://www.impactpool.org/jobs?location=${encodeURIComponent(COUNTRY_NAMES[countryCode] || countryCode)}`,strategy:"query-country",confidence:"high"};
    case "idealists":
      return {sourceKey:source.key,countryCode,url:`https://www.idealist.org/en/jobs?location=${encodeURIComponent(COUNTRY_NAMES[countryCode] || countryCode)}`,strategy:"query-country",confidence:"medium"};
    case "devex":
      return {sourceKey:source.key,countryCode,url:`https://www.devex.com/jobs/search?query=&location=${encodeURIComponent(COUNTRY_NAMES[countryCode] || countryCode)}`,strategy:"query-country",confidence:"medium"};
    case "fuzu": {
      const countryPath:Record<string,string>={KE:"kenya",NG:"nigeria",UG:"uganda"};
      const slug=countryPath[countryCode];
      if(!slug) return {sourceKey:source.key,countryCode,url:"",strategy:"unresolved",confidence:"low"};
      return {sourceKey:source.key,countryCode,url:`https://www.fuzu.com/${slug}`,strategy:"country-path",confidence:"high"};
    }
    default:
      if (base.includes("{countryCode}") || base.includes("{country}") || base.includes("{countrySlug}")) {
        return {sourceKey:source.key,countryCode,url:replaceCountryToken(base,countryCode),strategy:"country-template",confidence:"high"};
      }
      if(source.countries.length===1) {
        return {sourceKey:source.key,countryCode,url:base,strategy:"static",confidence:"medium"};
      }
      return {sourceKey:source.key,countryCode,url:"",strategy:"unresolved",confidence:"low"};
  }
}

export function resolveCountrySources(countryCode:string):ResolvedSourceUrl[] {
  return getActiveSources(countryCode).map((source) => resolveSourceUrl(source, countryCode));
}
