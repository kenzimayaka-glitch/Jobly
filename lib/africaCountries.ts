export type AfricanCountryCode =
  | "DZ" | "AO" | "BJ" | "BW" | "BF" | "BI" | "CV" | "CM" | "CF" | "TD"
  | "KM" | "CG" | "CD" | "CI" | "DJ" | "EG" | "GQ" | "ER" | "SZ"
  | "ET" | "GA" | "GM" | "GH" | "GN" | "GW" | "KE" | "LS" | "LR"
  | "LY" | "MG" | "MW" | "ML" | "MR" | "MU" | "MA" | "MZ" | "NA"
  | "NE" | "NG" | "RW" | "ST" | "SN" | "SC" | "SL" | "SO" | "ZA"
  | "SS" | "SD" | "TZ" | "TG" | "TN" | "UG" | "ZM" | "ZW";

export type AfricanCountry = {
  code: AfricanCountryCode;
  name: string;
  flag: string;
  region: "North" | "West" | "Central" | "East" | "Southern" | "Indian Ocean";
  primaryLanguages: string[];
};

export const AFRICAN_COUNTRIES: readonly AfricanCountry[] = [
  ["DZ","Algérie","🇩🇿","North",["ar","fr"]],["AO","Angola","🇦🇴","Southern",["pt"]],
  ["BJ","Bénin","🇧🇯","West",["fr"]],["BW","Botswana","🇧🇼","Southern",["en"]],
  ["BF","Burkina Faso","🇧🇫","West",["fr"]],["BI","Burundi","🇧🇮","East",["fr","en","sw"]],
  ["CV","Cap-Vert","🇨🇻","West",["pt"]],["CM","Cameroun","🇨🇲","Central",["fr","en"]],
  ["CF","République centrafricaine","🇨🇫","Central",["fr"]],["TD","Tchad","🇹🇩","Central",["fr","ar"]],
  ["KM","Comores","🇰🇲","Indian Ocean",["fr","ar"]],["CG","République du Congo","🇨🇬","Central",["fr"]],
  ["CD","République démocratique du Congo","🇨🇩","Central",["fr"]],["CI","Côte d’Ivoire","🇨🇮","West",["fr"]],
  ["DJ","Djibouti","🇩🇯","East",["fr","ar"]],["EG","Égypte","🇪🇬","North",["ar","en"]],
  ["GQ","Guinée équatoriale","🇬🇶","Central",["es","fr"]],["ER","Érythrée","🇪🇷","East",["en","ar"]],
  ["SZ","Eswatini","🇸🇿","Southern",["en"]],["ET","Éthiopie","🇪🇹","East",["en"]],
  ["GA","Gabon","🇬🇦","Central",["fr"]],["GM","Gambie","🇬🇲","West",["en"]],
  ["GH","Ghana","🇬🇭","West",["en"]],["GN","Guinée","🇬🇳","West",["fr"]],
  ["GW","Guinée-Bissau","🇬🇼","West",["pt"]],["KE","Kenya","🇰🇪","East",["en","sw"]],
  ["LS","Lesotho","🇱🇸","Southern",["en"]],["LR","Liberia","🇱🇷","West",["en"]],
  ["LY","Libye","🇱🇾","North",["ar"]],["MG","Madagascar","🇲🇬","Indian Ocean",["fr"]],
  ["MW","Malawi","🇲🇼","Southern",["en"]],["ML","Mali","🇲🇱","West",["fr"]],
  ["MR","Mauritanie","🇲🇷","West",["ar","fr"]],["MU","Maurice","🇲🇺","Indian Ocean",["en","fr"]],
  ["MA","Maroc","🇲🇦","North",["ar","fr"]],["MZ","Mozambique","🇲🇿","Southern",["pt"]],
  ["NA","Namibie","🇳🇦","Southern",["en"]],["NE","Niger","🇳🇪","West",["fr"]],
  ["NG","Nigeria","🇳🇬","West",["en"]],["RW","Rwanda","🇷🇼","East",["en","fr","sw"]],
  ["ST","Sao Tomé-et-Principe","🇸🇹","West",["pt"]],["SN","Sénégal","🇸🇳","West",["fr"]],
  ["SC","Seychelles","🇸🇨","Indian Ocean",["en","fr"]],["SL","Sierra Leone","🇸🇱","West",["en"]],
  ["SO","Somalie","🇸🇴","East",["so","ar","en"]],["ZA","Afrique du Sud","🇿🇦","Southern",["en"]],
  ["SS","Soudan du Sud","🇸🇸","East",["en"]],["SD","Soudan","🇸🇩","North",["ar","en"]],
  ["TZ","Tanzanie","🇹🇿","East",["sw","en"]],["TG","Togo","🇹🇬","West",["fr"]],
  ["TN","Tunisie","🇹🇳","North",["ar","fr"]],["UG","Ouganda","🇺🇬","East",["en","sw"]],
  ["ZM","Zambie","🇿🇲","Southern",["en"]],["ZW","Zimbabwe","🇿🇼","Southern",["en"]],
].map(([code,name,flag,region,primaryLanguages]) => ({code: code as AfricanCountryCode,name,flag,region,primaryLanguages}));

const ALIASES: Record<string, AfricanCountryCode> = {
  ALGERIE:"DZ", ALGERIA:"DZ", ANGOLA:"AO", BENIN:"BJ", BOTSWANA:"BW",
  "BURKINA FASO":"BF", BURUNDI:"BI", "CAP VERT":"CV", "CABO VERDE":"CV",
  CAMEROUN:"CM", CAMEROON:"CM", CENTRAFRIQUE:"CF", "REPUBLIQUE CENTRAFRICAINE":"CF",
  TCHAD:"TD", CHAD:"TD", COMORES:"KM", COMOROS:"KM", CONGO:"CG",
  "REPUBLIQUE DU CONGO":"CG", "CONGO BRAZZAVILLE":"CG", "REPUBLIQUE DEMOCRATIQUE DU CONGO":"CD",
  "RD CONGO":"CD", "RDC":"CD", "COTE D IVOIRE":"CI", "COTE D'IVOIRE":"CI", DJIBOUTI:"DJ",
  EGYPTE:"EG", EGYPT:"EG", "GUINEE EQUATORIALE":"GQ", "EQUATORIAL GUINEA":"GQ",
  ERYTREE:"ER", ERITREA:"ER", ESWATINI:"SZ", ETHIOPIE:"ET", ETHIOPIA:"ET",
  GABON:"GA", GAMBIE:"GM", GAMBIA:"GM", GHANA:"GH", GUINEE:"GN", GUINEA:"GN",
  "GUINEE BISSAU":"GW", "GUINEA BISSAU":"GW", KENYA:"KE", LESOTHO:"LS", LIBERIA:"LR",
  LIBYE:"LY", LIBYA:"LY", MADAGASCAR:"MG", MALAWI:"MW", MALI:"ML", MAURITANIE:"MR",
  MAURITANIA:"MR", MAURICE:"MU", MAURITIUS:"MU", MAROC:"MA", MOROCCO:"MA",
  MOZAMBIQUE:"MZ", NAMIBIE:"NA", NAMIBIA:"NA", NIGER:"NE", NIGERIA:"NG",
  RWANDA:"RW", "SAO TOME ET PRINCIPE":"ST", SENEGAL:"SN", SEYCHELLES:"SC",
  "SIERRA LEONE":"SL", SOMALIE:"SO", SOMALIA:"SO", "AFRIQUE DU SUD":"ZA",
  "SOUTH AFRICA":"ZA", "SOUDAN DU SUD":"SS", "SOUTH SUDAN":"SS", SOUDAN:"SD", SUDAN:"SD",
  TANZANIE:"TZ", TANZANIA:"TZ", TOGO:"TG", TUNISIE:"TN", TUNISIA:"TN", OUGANDA:"UG",
  UGANDA:"UG", ZAMBIE:"ZM", ZAMBIA:"ZM", ZIMBABWE:"ZW", GHANA:"GH",
};

export const AFRICAN_COUNTRY_NAMES = Object.fromEntries(AFRICAN_COUNTRIES.map(country => [country.code,country.name])) as Record<AfricanCountryCode,string>;

export function normalizeAfricanCountryCode(value: unknown): AfricanCountryCode | null {
  const raw = String(value || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^[A-Z]{2}$/.test(raw) && AFRICAN_COUNTRIES.some(country => country.code === raw)) return raw as AfricanCountryCode;
  return ALIASES[raw] || null;
}

export function getAfricanCountry(code: unknown): AfricanCountry | null {
  const normalized = normalizeAfricanCountryCode(code);
  return normalized ? AFRICAN_COUNTRIES.find(country => country.code === normalized) || null : null;
}

export function countryFlag(code: unknown): string {
  return getAfricanCountry(code)?.flag || "🌍";
}
