export type CountryResolution = {
  countryCode: string | null;
  evidence: "LOCATION" | "CAPTURE_METADATA" | "NONE";
  declaredCountryCode: string | null;
  conflict: boolean;
};

const COUNTRY_CODES = new Set([
  "AO","BF","BI","BJ","BW","CD","CF","CG","CI","CM","CV","DJ","DZ","EG","ER","ET","GA","GH","GM","GN","GQ","GW",
  "KE","KM","LR","LS","LY","MA","MG","ML","MR","MU","MW","MZ","NA","NE","NG","RW","SC","SD","SL","SN","SO","SS",
  "ST","SZ","TD","TG","TN","TZ","UG","ZA","ZM","ZW",
]);

const COUNTRY_ALIASES: Record<string,string> = {
  ANGOLA:"AO","BURKINA FASO":"BF",BURUNDI:"BI",BENIN:"BJ",BOTSWANA:"BW",
  "DEMOCRATIC REPUBLIC OF THE CONGO":"CD","DEMOCRATIC REPUBLIC OF CONGO":"CD","DR CONGO":"CD","DRC":"CD",
  "CENTRAL AFRICAN REPUBLIC":"CF","REPUBLIQUE CENTRAFRICAINE":"CF",CENTRAFRIQUE:"CF",
  "REPUBLIC OF THE CONGO":"CG","REPUBLIC OF CONGO":"CG","CONGO BRAZZAVILLE":"CG",
  "COTE D IVOIRE":"CI","IVORY COAST":"CI",CAMEROUN:"CM",CAMEROON:"CM","CAPE VERDE":"CV","CAP VERT":"CV",
  DJIBOUTI:"DJ",ALGERIE:"DZ",ALGERIA:"DZ",EGYPTE:"EG",EGYPT:"EG",ERYTHREE:"ER",ERITREA:"ER",
  ETHIOPIE:"ET",ETHIOPIA:"ET",GABON:"GA",GHANA:"GH",GAMBIE:"GM",GAMBIA:"GM",GUINEE:"GN",GUINEA:"GN",
  "EQUATORIAL GUINEA":"GQ","GUINEE EQUATORIALE":"GQ","GUINEA BISSAU":"GW","GUINEE BISSAU":"GW",
  KENYA:"KE",COMORES:"KM",COMOROS:"KM",LIBERIA:"LR",LESOTHO:"LS",LIBYE:"LY",LIBYA:"LY",
  MAROC:"MA",MOROCCO:"MA",MADAGASCAR:"MG",MALI:"ML",MAURITANIE:"MR",MAURITANIA:"MR",
  MAURICE:"MU",MAURITIUS:"MU",MALAWI:"MW",MOZAMBIQUE:"MZ",NAMIBIE:"NA",NAMIBIA:"NA",NIGER:"NE",NIGERIA:"NG",
  RWANDA:"RW",SEYCHELLES:"SC",SOUDAN:"SD",SUDAN:"SD","SIERRA LEONE":"SL",SENEGAL:"SN",SOMALIE:"SO",SOMALIA:"SO",
  "SOUTH SUDAN":"SS","SOUDAN DU SUD":"SS","SAO TOME AND PRINCIPE":"ST","SAO TOME ET PRINCIPE":"ST",
  ESWATINI:"SZ",SWAZILAND:"SZ",TCHAD:"TD",CHAD:"TD",TOGO:"TG",TUNISIE:"TN",TUNISIA:"TN",
  TANZANIE:"TZ",TANZANIA:"TZ",OUGANDA:"UG",UGANDA:"UG","SOUTH AFRICA":"ZA","AFRIQUE DU SUD":"ZA",
  ZAMBIE:"ZM",ZAMBIA:"ZM",ZIMBABWE:"ZW",
};

const CITY_ALIASES: Record<string,string> = {
  "YAOUNDE":"CM","DOUALA":"CM","GAROUA":"CM","BAFOUSSAM":"CM",
  "KINSHASA":"CD","LUBUMBASHI":"CD","GOMA":"CD","BUKAVU":"CD",
  "BRAZZAVILLE":"CG","POINTE NOIRE":"CG","BANGUI":"CF","NDJAMENA":"TD","LIBREVILLE":"GA",
  "ABIDJAN":"CI","BOUAKE":"CI","YAMOUSSOUKRO":"CI","DAKAR":"SN","THIES":"SN",
  "ACCRA":"GH","KUMASI":"GH","LAGOS":"NG","ABUJA":"NG","KANO":"NG",
  "COTONOU":"BJ","PORTO NOVO":"BJ","LOME":"TG","OUAGADOUGOU":"BF","BAMAKO":"ML","NIAMEY":"NE",
  "CONAKRY":"GN","FREETOWN":"SL","MONROVIA":"LR","BANJUL":"GM","BISSAU":"GW",
  "KIGALI":"RW","HUYE":"RW","MUSANZE":"RW","KAMPALA":"UG","ENTEBBE":"UG","MBARARA":"UG","MBALE":"UG",
  "NAIROBI":"KE","MOMBASA":"KE","KISUMU":"KE","NAKURU":"KE","DAR ES SALAAM":"TZ","DODOMA":"TZ",
  "ARUSHA":"TZ","GEITA":"TZ","MWANZA":"TZ","KILIMANJARO":"TZ","ZANZIBAR":"TZ",
  "ADDIS ABABA":"ET","DIRE DAWA":"ET","JUBA":"SS","KHARTOUM":"SD",
  "DJIBOUTI CITY":"DJ","ANTANANARIVO":"MG","TOAMASINA":"MG","MORONI":"KM","PORT LOUIS":"MU",
  "VICTORIA":"SC","JOHANNESBURG":"ZA","PRETORIA":"ZA","CAPE TOWN":"ZA","DURBAN":"ZA","GQEBERHA":"ZA",
  "LUSAKA":"ZM","KITWE":"ZM","HARARE":"ZW","BULAWAYO":"ZW","LILONGWE":"MW","BLANTYRE":"MW",
  "MAPUTO":"MZ","BEIRA":"MZ","WINDHOEK":"NA","GABORONE":"BW","MASERU":"LS","MBABANE":"SZ",
  "CASABLANCA":"MA","RABAT":"MA","MARRAKESH":"MA","ALGIERS":"DZ","TUNIS":"TN","TRIPOLI":"LY",
  "CAIRO":"EG","ALEXANDRIA":"EG","NOUAKCHOTT":"MR","ASMARA":"ER","LUANDA":"AO","PRAIA":"CV",
  "SAO TOME":"ST","MALABO":"GQ","MOGADISHU":"SO",
};

const LANGUAGE_CODES = new Set(["af","am","ar","en","es","fr","ha","ig","om","pt","so","sw","xh","yo","zu"]);


const HTML_ENTITIES: Record<string,string> = {
  amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" ",ensp:" ",emsp:" ",thinsp:" ",
  ndash:"–",mdash:"—",hellip:"…",lsquo:"‘",rsquo:"’",ldquo:"“",rdquo:"”",
  copy:"©",reg:"®",trade:"™",euro:"€",pound:"£",cent:"¢",yen:"¥",
  agrave:"à",aacute:"á",acirc:"â",atilde:"ã",auml:"ä",aring:"å",aelig:"æ",
  ccedil:"ç",egrave:"è",eacute:"é",ecirc:"ê",euml:"ë",igrave:"ì",iacute:"í",
  icirc:"î",iuml:"ï",ntilde:"ñ",ograve:"ò",oacute:"ó",ocirc:"ô",otilde:"õ",
  ouml:"ö",ugrave:"ù",uacute:"ú",ucirc:"û",uuml:"ü",yacute:"ý",yuml:"ÿ",
};

function decodeHtmlPass(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, token: string) => {
    if (token[0] !== "#") return HTML_ENTITIES[token.toLowerCase()] ?? entity;
    const hex = token[1]?.toLowerCase() === "x";
    const parsed = Number.parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 0x10ffff ||
        (parsed >= 0xd800 && parsed <= 0xdfff)) return "\uFFFD";
    try {
      return String.fromCodePoint(parsed);
    } catch {
      return "\uFFFD";
    }
  });
}

export function decodeHtmlEntities(value: unknown): string {
  let decoded = String(value ?? "");
  for (let pass = 0; pass < 3; pass++) {
    const next = decodeHtmlPass(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function normalizedText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[’']/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCountryCode(value: unknown): string | null {
  const raw = normalizedText(value);
  if (/^[A-Z]{2}$/.test(raw) && COUNTRY_CODES.has(raw)) return raw;
  return COUNTRY_ALIASES[raw] ?? null;
}

export function inferCountryFromLocation(location: unknown): string | null {
  const raw = String(location ?? "").toUpperCase();
  const isoMatches = new Set<string>();
  for (const match of raw.matchAll(/(?:^|[\s,(/])([A-Z]{2})(?=$|[\s,)/])/g)) {
    const code = match[1];
    if (COUNTRY_CODES.has(code)) isoMatches.add(code);
  }
  // Explicit ISO country tokens have priority over city aliases (e.g. "Kilimani, TZ").
  if (isoMatches.size === 1) return [...isoMatches][0];
  if (isoMatches.size > 1) return null;

  const normalized = normalizedText(location);
  const candidates: Array<{ alias: string; code: string }> = [];
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    const token = normalizedText(alias);
    if (token && (" " + normalized + " ").includes(" " + token + " ")) candidates.push({alias:token,code});
  }
  for (const [alias, code] of Object.entries(CITY_ALIASES)) {
    const token = normalizedText(alias);
    if (token && (" " + normalized + " ").includes(" " + token + " ")) candidates.push({alias:token,code});
  }
  if (!candidates.length) return null;
  candidates.sort((a,b) => b.alias.length - a.alias.length);
  const longest = candidates.filter(x => x.alias.length === candidates[0].alias.length);
  const codes = new Set(longest.map(x => x.code));
  return codes.size === 1 ? [...codes][0] : null;
}

export function resolveCountryCode(declaredValue: unknown, location: unknown): CountryResolution {
  const declaredCountryCode = normalizeCountryCode(declaredValue);
  const locationCountryCode = inferCountryFromLocation(location);
  if (locationCountryCode) {
    return {
      countryCode: locationCountryCode,
      evidence: "LOCATION",
      declaredCountryCode,
      conflict: Boolean(declaredCountryCode && declaredCountryCode !== locationCountryCode),
    };
  }
  return {
    countryCode: declaredCountryCode,
    evidence: declaredCountryCode ? "CAPTURE_METADATA" : "NONE",
    declaredCountryCode,
    conflict: false,
  };
}

export function isGenericRecruitmentTitle(value: unknown): boolean {
  const title = normalizedText(value);
  return /^(COMPTE RECRUTEUR|RECRUITER ACCOUNT|CANDIDATE PROFILE|JOB ALERTS?|CREATE ACCOUNT|SIGN IN|LOGIN|REGISTER)$/.test(title)
    || /^SUBMIT CVS? (?:LATEST|NEW) (?:RECRUITMENT|EMPLOYMENT OPPORTUNITIES)$/.test(title)
    || /^SUBMIT CVS?$/.test(title);
}

export type OpportunityMapping = { sourceType: string; jobType: "EMPLOI"|"CONCOURS"|"FORMATION"|"RECRUTEMENT_INSUFFISANT" } | null;

export function mapOpportunityType(value: unknown, title = "", description = ""): OpportunityMapping {
  let sourceType = String(value ?? "").trim().toUpperCase();
  if (!sourceType) {
    const text = (title + " " + description).toLowerCase();
    sourceType = /\b(stage|stagiaire|internship|intern|trainee)\b/.test(text) ? "STAGE"
      : /\b(consultant|consultance|consultancy)\b/.test(text) ? "CONSULTANCE"
      : /\b(concours|competitive examination)\b/.test(text) ? "CONCOURS"
      : /\b(formation|training|scholarship|bourse)\b/.test(text) ? "FORMATION"
      : "EMPLOI";
  }
  if (["EMPLOI","STAGE","CONSULTANCE","JOB","WORK"].includes(sourceType)) return {sourceType,jobType:"EMPLOI"};
  if (["CONCOURS"].includes(sourceType)) return {sourceType,jobType:"CONCOURS"};
  if (["FORMATION","TRAINING"].includes(sourceType)) return {sourceType,jobType:"FORMATION"};
  if (["APPEL_A_CANDIDATURE","RECRUTEMENT_INSUFFISANT"].includes(sourceType)) return {sourceType,jobType:"RECRUTEMENT_INSUFFISANT"};
  return null;
}

export function normalizeRemoteMode(value: unknown): "YES"|"NO"|"PARTIAL" {
  const raw = String(value ?? "").toLowerCase();
  if (/hybrid|partiel|partial|hybride/.test(raw)) return "PARTIAL";
  if (/remote|remotely|telework|télétravail|work from home|à distance/.test(raw)) return "YES";
  return "NO";
}

export function normalizeLanguage(value: unknown, text = ""): string {
  const requested = String(value ?? "").trim().toLowerCase().slice(0,2);
  if (LANGUAGE_CODES.has(requested)) return requested;
  const body = String(text ?? "");
  if (/[\u0600-\u06FF]/.test(body)) return "ar";
  if (/[\u1200-\u137F]/.test(body)) return "am";
  if (/\b(nao|não|com|para|emprego|candidato|candidatura)\b/i.test(body)) return "pt";
  if (/\b(na|kwa|katika|ya|wa|ajira)\b/i.test(body)) return "sw";
  if (/\b(the|and|with|for|your|you|experience|skills|apply|position|job)\b/i.test(body)) return "en";
  return "fr";
}

export function safeHttpUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value ?? ""));
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeInteger(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(60, Math.trunc(number))) : fallback;
}
