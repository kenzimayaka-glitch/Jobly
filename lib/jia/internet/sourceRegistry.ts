import type { SourceType } from "./types";
const GOV=/(^|\.)gov\.|\.gov$|\.gouv\.|government/i;
const UNI=/\.edu$|\.ac\.|university|universite/i;
const INTL=/worldbank|un\.org|who\.int|ilo\.org|afdb\.org|imf\.org|oecd\.org|europa\.eu/i;
const NEWS=/news|reuters|bbc\.|france24|jeuneafrique|rfi\.|africanews|lemonde|nytimes|guardian/i;
export function classifySource(domain:string):SourceType {
  const d=domain.toLowerCase();
  if(GOV.test(d))return"GOVERNMENT"; if(INTL.test(d))return"INTERNATIONAL_ORGANIZATION";
  if(UNI.test(d))return"UNIVERSITY"; if(NEWS.test(d))return"NEWS";
  if(/linkedin|facebook|instagram|x\.com|twitter|tiktok/i.test(d))return"SOCIAL";
  if(/wikipedia|indeed|glassdoor|jobteaser/i.test(d))return"DATABASE"; return"UNKNOWN";
}
export function sourceAuthority(type:SourceType,domain:string):number {
  if(/who\.int|worldbank\.org|ilo\.org|afdb\.org|imf\.org|gov\.cm|gouv\.cm/i.test(domain))return .98;
  return ({OFFICIAL:.95,GOVERNMENT:.95,INTERNATIONAL_ORGANIZATION:.96,UNIVERSITY:.88,COMPANY:.84,DATABASE:.68,NEWS:.74,COMMUNITY:.48,SOCIAL:.30,UNKNOWN:.42} as Record<SourceType,number>)[type];
}