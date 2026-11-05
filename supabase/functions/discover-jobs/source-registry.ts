export type SourceType = "national" | "pan_africa" | "institutional" | "specialized" | "aggregator" | "company_careers" | "remote";
export type CaptureMode = "browser" | "http" | "api" | "rss" | "unknown";
export type SourceStatus = "active" | "discovered" | "blocked" | "degraded" | "retired" | "inactive";

export type AfricaCountry = {
  code: string;
  name: string;
  region: "north" | "west" | "central" | "east" | "south";
  languages: string[];
};

export type SourceDefinition = {
  key: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  enabled: boolean;
  /** Explicitly approved for read-only shadow qualification; never makes a source production-active. */
  shadowCrawlEligible?: boolean;
  url?: string;
  countries: string[];
  languages: string[];
  captureMode: CaptureMode;
  renderRequired: boolean;
  structuredAdapter?: string;
  priority: number;
  notes?: string;
};

export const AFRICA_COUNTRIES: AfricaCountry[] = [
  ["DZ","Algérie","north",["fr","ar"]],["EG","Égypte","north",["ar","en"]],["LY","Libye","north",["ar","en"]],["MA","Maroc","north",["fr","ar"]],["MR","Mauritanie","north",["ar","fr"]],["TN","Tunisie","north",["fr","ar"]],
  ["BJ","Bénin","west",["fr"]],["BF","Burkina Faso","west",["fr"]],["CV","Cap-Vert","west",["pt"]],["CI","Côte d'Ivoire","west",["fr"]],["GM","Gambie","west",["en"]],["GH","Ghana","west",["en"]],["GN","Guinée","west",["fr"]],["GW","Guinée-Bissau","west",["pt"]],["LR","Liberia","west",["en"]],["ML","Mali","west",["fr"]],["NE","Niger","west",["fr"]],["NG","Nigeria","west",["en"]],["SN","Sénégal","west",["fr"]],["SL","Sierra Leone","west",["en"]],["TG","Togo","west",["fr"]],
  ["CM","Cameroun","central",["fr","en"]],["CF","RCA","central",["fr"]],["TD","Tchad","central",["fr","ar"]],["CG","Congo","central",["fr"]],["CD","RDC","central",["fr"]],["GQ","Guinée équatoriale","central",["es","fr"]],["GA","Gabon","central",["fr"]],["ST","São Tomé-et-Príncipe","central",["pt"]],["BI","Burundi","central",["fr","en"]],["AO","Angola","central",["pt"]],
  ["KE","Kenya","east",["en"]],["UG","Ouganda","east",["en"]],["TZ","Tanzanie","east",["en","sw"]],["RW","Rwanda","east",["en","fr"]],["ET","Éthiopie","east",["en","am"]],["DJ","Djibouti","east",["fr","ar"]],["ER","Érythrée","east",["en"]],["SO","Somalie","east",["en","so"]],["SS","Soudan du Sud","east",["en"]],["SD","Soudan","east",["ar","en"]],["KM","Comores","east",["fr","ar"]],["MG","Madagascar","east",["fr"]],["MU","Maurice","east",["en","fr"]],["SC","Seychelles","east",["en","fr"]],
  ["ZA","Afrique du Sud","south",["en"]],["ZM","Zambie","south",["en"]],["ZW","Zimbabwe","south",["en"]],["MW","Malawi","south",["en"]],["MZ","Mozambique","south",["pt"]],["NA","Namibie","south",["en"]],["BW","Botswana","south",["en"]],["SZ","Eswatini","south",["en"]],["LS","Lesotho","south",["en"]]
].map(([code,name,region,languages])=>({code,name,region,languages})) as AfricaCountry[];

const PAN_AFRICA = ["CM","DZ","EG","LY","MA","MR","TN","BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG","CF","TD","CG","CD","GQ","GA","ST","BI","AO","KE","UG","TZ","RW","ET","DJ","ER","SO","SS","SD","KM","MG","MU","SC","ZA","ZM","ZW","MW","MZ","NA","BW","SZ","LS"];

const DISCOVERY_SOURCE_DETAILS: Record<string, Partial<SourceDefinition>> = {
  "freshtalent": {
    "url": "https://jobs.freshtalent.africa/jobs",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Portail vérifié; 1 224 postes ouverts, 35 pays employeurs et page pays disponible. Couverture à tester par pays."
  },
  "jobaa": {
    "url": "https://jobaa.org/countries",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Annuaire Jobaa avec sélecteur de pays et pages de recherche; vérifier les routes pays."
  },
  "africajobconnect": {
    "url": "https://africa-jobconnect.com/",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Site revendiquant 54 pays et 15 000 opportunités; la page de recherche n'en exposait que 28 au contrôle."
  },
  "taf4all": {
    "url": "https://www.taf4all.fr/",
    "countries": [
      "CM",
      "MG",
      "CI",
      "SN",
      "ZM",
      "ZA",
      "KE",
      "NG",
      "GA",
      "BJ",
      "BF",
      "GN",
      "TZ",
      "MW",
      "ML",
      "UG",
      "TD",
      "CF",
      "CG",
      "GH",
      "NE",
      "MZ",
      "SL",
      "LR",
      "DJ"
    ],
    "captureMode": "http",
    "notes": "Plateforme d'offres annoncée dans 27 pays; 25 pays africains explicitement listés au contrôle."
  },
  "myjobmag": {
    "url": "https://www.myjobmag.com/",
    "countries": [
      "NG"
    ],
    "status": "retired",
    "notes": "Alias du connecteur MyJobMag Nigeria déjà présent sous myjobmag_ng; pas de double crawl."
  },
  "novojob": {
    "url": "https://www.novojob.com/",
    "countries": [
      "DZ",
      "BJ",
      "CI",
      "MA",
      "SN",
      "TG"
    ],
    "captureMode": "http",
    "notes": "Portail d'emploi/recrutement avec pages pays explicites en Afrique du Nord et de l'Ouest."
  },
  "alerte_emploi": {
    "url": "https://alerteemploi.net/",
    "countries": [
      "BF",
      "CM",
      "CI",
      "ML",
      "SN",
      "TG"
    ],
    "captureMode": "http",
    "notes": "Site d'offres consultable; les pays affichés comprennent Côte d'Ivoire, Sénégal, Cameroun, Burkina Faso, Togo et Mali."
  },
  "mapage_africa": {
    "url": "https://mapage.africa/opportunities/jobs",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "status": "retired",
    "notes": "Alias du connecteur mapage_africa_jobs déjà présent; URL renseignée pour traçabilité, sans double collecte."
  },
  "jobfolio_africa": {
    "status": "retired",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "notes": "Nom de plateforme non rapproché d'un site officiel de recrutement vérifiable au 05-11-2026; candidat retiré."
  },
  "hr_paddy": {
    "url": "https://www.hrpaddy.com/",
    "countries": [
      "NG",
      "GH",
      "KE",
      "ZA"
    ],
    "status": "blocked",
    "notes": "Logiciel RH/ATS pour recruteurs, pas un portail public d'offres autonome; référence conservée, ingestion bloquée."
  },
  "jobra": {
    "url": "https://jobra.africa/for-talent",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Plateforme de carrière africaine identifiée; parcours public d'offres et couverture réelle à qualifier."
  },
  "jobiro": {
    "url": "https://www.jobiro.io/",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Plateforme de travail à distance ouverte aux talents africains; éligibilité géographique à vérifier par offre."
  },
  "clbk": {
    "url": "https://clbk.africa/jobs",
    "countries": [
      "UG"
    ],
    "captureMode": "http",
    "notes": "Une offre vérifiée était visible au contrôle; plateforme aussi orientée spécialistes/prestations."
  },
  "edmatch": {
    "url": "https://www.edomatch.com/fr",
    "countries": [
      "TG"
    ],
    "captureMode": "http",
    "notes": "Suite RH affichant 1 500+ offres; identifier et isoler la route publique de liste avant toute activation."
  },
  "careers_in_africa": {
    "url": "https://careersinafrica.zohorecruit.eu/careers",
    "countries": [
      "GH",
      "NG",
      "LR"
    ],
    "captureMode": "http",
    "notes": "Portail de carrières public avec postes récents en Afrique, notamment Ghana, Nigeria et Liberia."
  },
  "work_in_africa": {
    "url": "https://www.workinafrica.com/",
    "countries": [
      "CI",
      "SN",
      "GH",
      "NG"
    ],
    "status": "retired",
    "notes": "Alias du connecteur workinafrica_ci déjà présent; ne pas lancer un deuxième collecteur."
  },
  "chantierpro": {
    "url": "https://chantierpro.co/",
    "countries": [
      "BJ",
      "BF",
      "CM",
      "CI",
      "GA",
      "MG",
      "MA",
      "NG",
      "SN",
      "TG"
    ],
    "captureMode": "http",
    "notes": "Plateforme spécialisée BTP, mines et métiers techniques avec opportunités dans plusieurs pays africains."
  },
  "affutjob": {
    "url": "https://www.affutjob.pro/jobs",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Agrégateur d'offres Afrique francophone; 359 offres visibles au contrôle, pays et dates à extraire par fiche."
  },
  "marcheemploi": {
    "url": "https://marcheemploi.com/",
    "countries": [
      "BJ",
      "CM",
      "CI",
      "SN",
      "TG"
    ],
    "captureMode": "http",
    "notes": "Plateforme emploi/recrutement avec pays affichés Bénin, Cameroun, Côte d'Ivoire, Sénégal et Togo."
  },
  "vueradar": {
    "url": "https://vueradar.org/offre-demploi/",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Agrégateur panafricain; 54 pays affichés et 187 offres récentes au contrôle. Mélange aussi bourses, appels d'offres et formations."
  },
  "jobsonline_africa": {
    "url": "https://jobsonline.africa/",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "captureMode": "http",
    "notes": "Job board avec filtres régionaux et pays affichés en Afrique de l'Ouest, de l'Est, du Nord, centrale et australe."
  },
  "diaspojob": {
    "status": "retired",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "MR",
      "TN",
      "AO",
      "BJ",
      "BF",
      "BW",
      "BI",
      "CV",
      "CM",
      "CF",
      "TD",
      "KM",
      "CG",
      "CD",
      "CI",
      "DJ",
      "GQ",
      "ER",
      "ET",
      "GA",
      "GM",
      "GH",
      "GN",
      "GW",
      "KE",
      "LS",
      "LR",
      "MG",
      "MW",
      "ML",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RW",
      "SN",
      "SC",
      "SL",
      "SO",
      "SS",
      "ZA",
      "SD",
      "SZ",
      "TZ",
      "TG",
      "UG",
      "ZM",
      "ZW",
      "MU"
    ],
    "notes": "Identité du domaine officiel et activité de publication d'emplois non confirmées; candidat retiré."
  },
  "akilibrain": {
    "url": "https://akilibrain.com/",
    "countries": [
      "TZ",
      "KE",
      "UG",
      "RW",
      "ET",
      "SO",
      "BI",
      "SS",
      "CD"
    ],
    "captureMode": "http",
    "notes": "Plateforme d'intelligence emploi d'Afrique de l'Est; annonce plus de 5 400 offres dans neuf pays."
  },
  "rekrute": {
    "url": "https://www.rekrute.com/en/emploi-Rekrute",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Portail de recrutement marocain avec offres actives."
  },
  "marocannonces": {
    "url": "https://jobs.marocannonces.com/",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Sous-domaine Jobs officiel indiqué par la FAQ MarocAnnonces; offres d'emploi actualisées."
  },
  "jobs_ma": {
    "status": "retired",
    "countries": [
      "MA"
    ],
    "notes": "Libellé générique sans domaine officiel distinct retrouvé; les portails marocains confirmés sont recensés sous leurs clés propres."
  },
  "coincarriere": {
    "url": "https://coincarriere.com/ma/fr/jobs",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Portail d'offres marocain, plusieurs milliers d'offres actives visibles."
  },
  "allojob": {
    "url": "https://allojob.ma/jobs",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Portail marocain avec filtres emploi et près de 2 000 offres affichées."
  },
  "alwadifa_maroc": {
    "url": "https://alwadifa.ma/",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Site marocain d'offres d'emploi et de concours de recrutement."
  },
  "bghit_nekhdem": {
    "url": "https://bghit-nekhdem.com/",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Plateforme d'opportunités emploi; contrôler la date et les contacts sur chaque fiche."
  },
  "wetech": {
    "url": "https://www.wetech.ma/",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Job board marocain spécialisé IT; offres récentes visibles."
  },
  "ejobs": {
    "url": "https://www.ejobs.ma/",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Site marocain d'emploi identifié; contenu d'offres à qualifier avant activation."
  },
  "hotalents": {
    "url": "https://hotalents.ma/",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Plateforme de recrutement hôtellerie/tourisme au Maroc; qualification des annonces à effectuer."
  },
  "moncallcenter": {
    "url": "https://www.moncallcenter.ma/",
    "countries": [
      "MA"
    ],
    "captureMode": "http",
    "notes": "Portail marocain d'offres d'emploi en centres d'appels."
  },
  "wuzzuf": {
    "url": "https://wuzzuf.net/jobs/egypt",
    "countries": [
      "EG"
    ],
    "captureMode": "http",
    "notes": "Job board national égyptien avec milliers d'offres actives."
  },
  "forasna": {
    "url": "https://forasna.com/",
    "countries": [
      "EG"
    ],
    "captureMode": "http",
    "notes": "Job board égyptien avec listes d'offres en cours."
  },
  "tanqeeb": {
    "url": "https://egypt.tanqeeb.com/",
    "countries": [
      "DZ",
      "EG",
      "LY",
      "MA",
      "TN"
    ],
    "captureMode": "http",
    "notes": "Agrégateur MENA; cette URL est la version Égypte. Les autres pays demandent des routes distinctes."
  },
  "jobberman": {
    "url": "https://www.jobberman.com/",
    "countries": [
      "NG"
    ],
    "status": "retired",
    "notes": "Alias du connecteur Jobberman Nigeria déjà présent sous jobberman_ng; pas de double crawl."
  },
  "get_hired_ghana": {
    "status": "retired",
    "countries": [
      "GH"
    ],
    "notes": "Aucune URL officielle distincte ni page d'offres récentes confirmée au 05-11-2026."
  },
  "hire_rung": {
    "url": "https://www.hirerung.com/",
    "countries": [
      "GH"
    ],
    "captureMode": "http",
    "notes": "Plateforme ghanéenne d'offres, stages et placements NSS; annonces vérifiées visibles."
  },
  "plegma": {
    "url": "https://jobs.plegma.name/",
    "countries": [
      "GH"
    ],
    "captureMode": "http",
    "notes": "Job board affichant des offres situées à Accra, Tema et autres villes du Ghana."
  },
  "ngcareers": {
    "status": "retired",
    "countries": [
      "NG"
    ],
    "notes": "Nom générique rapproché de plusieurs pages sans domaine officiel suffisamment confirmé; aucune URL inventée."
  },
  "jobgurus": {
    "url": "https://www.jobgurus.com.ng/",
    "countries": [
      "NG"
    ],
    "captureMode": "http",
    "notes": "Portail nigérian avec offres d'emploi actives et catégories sectorielles."
  },
  "jobsinnigeria": {
    "url": "https://jobsinnigeria.careers/",
    "countries": [
      "NG"
    ],
    "captureMode": "http",
    "notes": "Portail d'offres Nigeria avec annonces récentes."
  },
  "quicktojobs": {
    "url": "https://www.quicktojobs.com/",
    "countries": [
      "NG",
      "ZA",
      "KE",
      "GH",
      "CM",
      "UG",
      "TZ",
      "EG",
      "MA"
    ],
    "captureMode": "http",
    "notes": "Réseau généraliste d'offres; pays et provenance de chaque annonce à vérifier."
  },
  "jobstark": {
    "url": "https://jobstark.com/jobs",
    "countries": [
      "NG"
    ],
    "captureMode": "http",
    "notes": "Portail d'offres au Nigeria avec annonces récentes."
  },
  "gradjobber": {
    "url": "https://gradjobber.com/Jobs",
    "countries": [
      "NG"
    ],
    "captureMode": "http",
    "notes": "Plateforme nigériane de jobs, stages, graduate trainee et NYSC."
  },
  "xoooth": {
    "url": "https://xooth.net/jobs",
    "countries": [
      "NG"
    ],
    "captureMode": "http",
    "notes": "Page d'offres nigérianes identifiée; vérifier les liens de candidature sur chaque fiche."
  },
  "work_in_edo": {
    "status": "retired",
    "countries": [
      "NG"
    ],
    "notes": "Nom local Work in Edo non rapproché d'un portail officiel actif; source non confirmée."
  },
  "employdakar": {
    "url": "https://www.emploidakar.com/",
    "countries": [
      "SN"
    ],
    "status": "retired",
    "notes": "Alias de emploidakar_sn déjà présent dans le registre; ne pas crawler deux fois."
  },
  "senjob": {
    "url": "https://senjob.com/offres-d-emploi.php",
    "countries": [
      "SN",
      "CI",
      "BF",
      "ML",
      "NE",
      "GN",
      "TG",
      "BJ"
    ],
    "status": "retired",
    "notes": "Alias des connecteurs senjob_sn/senjob_west déjà présents; une seule collecte canonique à conserver."
  },
  "digijob_guinee": {
    "url": "https://digijobguinee.com/emplois",
    "countries": [
      "GN"
    ],
    "captureMode": "http",
    "notes": "Portail d'emplois guinéen; séparer les annonces d'emploi des concours, appels d'offres et bourses."
  },
  "jobbissau": {
    "url": "https://www.jobbissau.com/jobs",
    "countries": [
      "GW"
    ],
    "captureMode": "http",
    "notes": "Page d'offres JobBissau identifiée; vérifier fraîcheur et contacts sur chaque fiche."
  },
  "jobinfocamer_extra": {
    "url": "https://irelis.net/",
    "name": "Irelis",
    "countries": [
      "CM"
    ],
    "captureMode": "http",
    "notes": "Le libellé initial regroupait Irelis/PeoJob/Flinkn; seul Irelis est confirmé comme plateforme distincte."
  },
  "africatalents": {
    "url": "https://www.africatalents.com/",
    "countries": [
      "DZ",
      "BJ",
      "BW",
      "BF",
      "BI",
      "CM",
      "CF",
      "CG",
      "CD",
      "CI",
      "EG",
      "ET",
      "GA",
      "GH",
      "GN",
      "KE",
      "LR",
      "MW",
      "ML",
      "MA",
      "MR",
      "NA",
      "NE",
      "NG",
      "UG",
      "RW",
      "SN",
      "SL",
      "SD",
      "SS",
      "TZ",
      "TD",
      "TG",
      "TN",
      "ZM",
      "ZW",
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Réseau de job boards panafricains et sites locaux; 37 marchés annoncés."
  },
  "jobartis": {
    "url": "https://www.jobartis.com/",
    "countries": [
      "AO"
    ],
    "captureMode": "http",
    "notes": "Plateforme de recrutement angolaise avec offres visibles par ville, secteur et type de contrat."
  },
  "corporate_staffing": {
    "url": "https://www.corporatestaffing.co.ke/jobs/",
    "countries": [
      "KE"
    ],
    "captureMode": "http",
    "notes": "Agence de recrutement kényane publiant des offres quotidiennes; annonces du 4 novembre 2026 visibles."
  },
  "jobweb_kenya": {
    "url": "https://jobwebkenya.com/jobs/",
    "countries": [
      "KE"
    ],
    "captureMode": "http",
    "notes": "Portail d'offres kényan; page emplois active."
  },
  "myjobsinkenya": {
    "url": "https://myjobsinkenya.com/",
    "countries": [
      "KE"
    ],
    "captureMode": "http",
    "notes": "Portail d'annonces d'emploi kényan avec dates limites."
  },
  "recruitfinds": {
    "url": "https://www.recruitfinds.co.ke/",
    "countries": [
      "KE"
    ],
    "captureMode": "http",
    "notes": "Plateforme de recrutement et d'offres au Kenya."
  },
  "linkbase": {
    "url": "https://linkbasejobs.co.ke/careers/",
    "countries": [
      "KE"
    ],
    "captureMode": "http",
    "notes": "Page carrières et offres d'emploi au Kenya."
  },
  "ajirazone": {
    "status": "retired",
    "countries": [
      "TZ"
    ],
    "notes": "Nom de site non rattaché à un domaine officiel distinct vérifiable; ne pas confondre avec Ajira Portal."
  },
  "center_board": {
    "status": "retired",
    "countries": [
      "UG"
    ],
    "notes": "Nom de portail non identifié de façon fiable; aucune URL officielle d'offres confirmée."
  },
  "great_uganda_jobs": {
    "url": "https://www.greatugandajobs.com/",
    "countries": [
      "UG"
    ],
    "captureMode": "http",
    "notes": "Job board ougandais avec offres récentes."
  },
  "jobweb_uganda": {
    "url": "https://jobwebuganda.com/jobs/",
    "countries": [
      "UG"
    ],
    "captureMode": "http",
    "notes": "Portail ougandais d'offres; liste de postes active."
  },
  "job_adverts_uganda": {
    "url": "https://jobadvertsuganda.com/",
    "countries": [
      "UG"
    ],
    "captureMode": "http",
    "notes": "Site d'annonces d'emploi en Ouganda."
  },
  "ajirika": {
    "url": "https://ajirika.com/",
    "countries": [
      "KE",
      "TZ",
      "UG",
      "RW"
    ],
    "status": "retired",
    "notes": "Alias de ajirika_east déjà présent au registre; conserver un seul connecteur."
  },
  "work_tz": {
    "url": "https://work.tz/en/",
    "countries": [
      "TZ"
    ],
    "captureMode": "http",
    "notes": "Plateforme d'emploi tanzanienne; offres actives et liens de candidature officiels."
  },
  "ajira_mwananchi": {
    "status": "retired",
    "countries": [
      "TZ"
    ],
    "notes": "Nom évoqué comme canal de recrutement mais aucune page de jobs autonome distincte confirmée."
  },
  "mshahara": {
    "url": "https://www.mshahara.co/jobs/tanzania",
    "countries": [
      "TZ"
    ],
    "captureMode": "http",
    "notes": "Page d'offres tanzaniennes avec annonces récentes."
  },
  "fadicy": {
    "url": "https://fadicy.com/jobs/",
    "countries": [
      "TZ"
    ],
    "captureMode": "http",
    "notes": "Job board tanzanien avec plus de 200 offres visibles au contrôle."
  },
  "jobweb_rwanda": {
    "url": "https://jobwebrwanda.com/jobs/",
    "countries": [
      "RW"
    ],
    "captureMode": "http",
    "notes": "Portail d'offres rwandais avec annonces d'emploi."
  },
  "kigali_today_jobs": {
    "status": "retired",
    "countries": [
      "RW"
    ],
    "notes": "Nom de rubrique/média non identifié comme source autonome avec URL d'offres indépendante."
  },
  "umurimo": {
    "url": "https://www.umurimo.com/",
    "countries": [
      "RW"
    ],
    "captureMode": "http",
    "notes": "Portail RH et publication d'emplois au Rwanda; offres visibles."
  },
  "jobs_in_rwanda_ai": {
    "url": "https://jobsinrwanda.ai/",
    "countries": [
      "RW"
    ],
    "captureMode": "http",
    "notes": "Job board rwandais identifié; la page affichait des compteurs mais aucune offre disponible au contrôle, surveillance seulement."
  },
  "ezega": {
    "status": "retired",
    "countries": [
      "ET"
    ],
    "notes": "Domaine et page d'emplois non validés par un contrôle direct suffisamment probant; ne pas déduire une URL."
  },
  "jobweb_ethiopia": {
    "url": "https://jobwebethiopia.com/jobs/",
    "countries": [
      "ET"
    ],
    "captureMode": "http",
    "notes": "Portail d'offres éthiopien; pages jobs identifiées."
  },
  "jobsethiopia": {
    "url": "https://jobsethiopia.et/",
    "countries": [
      "ET"
    ],
    "captureMode": "http",
    "notes": "Job board éthiopien identifié; annonces à qualifier."
  },
  "worklink_ethiopia": {
    "url": "https://worklinkethio.com/",
    "countries": [
      "ET"
    ],
    "captureMode": "http",
    "notes": "Marketplace de talents éthiopienne; vérifier les offres publiques versus les profils prestataires."
  },
  "binasmart": {
    "url": "https://bina.et/jobs",
    "countries": [
      "ET"
    ],
    "captureMode": "http",
    "notes": "Page jobs BinaSmart avec plusieurs milliers d'ouvertures annoncées."
  },
  "hornjobs": {
    "url": "https://www.hornjobs.org/jobs",
    "countries": [
      "ET",
      "SO",
      "SS",
      "SD",
      "KE",
      "UG",
      "DJ",
      "ER"
    ],
    "captureMode": "http",
    "notes": "Portail Horn of Africa Jobs; offres visibles en Somalie, Somaliland, Éthiopie, Kenya, Soudan et Soudan du Sud."
  },
  "comores_emploi": {
    "url": "https://comoremploi.com/",
    "countries": [
      "KM"
    ],
    "captureMode": "http",
    "notes": "Plateforme emploi dédiée aux Comores avec plus de 200 offres affichées."
  },
  "jobmada": {
    "url": "https://www.jobmada.mg/",
    "countries": [
      "MG"
    ],
    "captureMode": "http",
    "notes": "Job board malgache avec offres récentes et candidature depuis la plateforme."
  },
  "myjob_mu": {
    "url": "https://myjob.mu/Jobs/",
    "countries": [
      "MU"
    ],
    "captureMode": "http",
    "notes": "Job board mauricien avec plus de 1 400 offres actives."
  },
  "hellojob_mu": {
    "url": "https://www.hellojob.mu/",
    "countries": [
      "MU"
    ],
    "captureMode": "http",
    "notes": "Portail de recrutement mauricien et publication d'offres."
  },
  "jobo_sc": {
    "url": "https://jobo.sc/",
    "countries": [
      "SC"
    ],
    "captureMode": "http",
    "notes": "Job board seychellois avec 184 offres disponibles au contrôle."
  },
  "careers24": {
    "url": "https://www.careers24.com/",
    "countries": [
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Job board sud-africain cité par les ressources publiques d'orientation professionnelle."
  },
  "jobmail": {
    "url": "https://www.jobmail.co.za/jobs",
    "countries": [
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Job board sud-africain avec offres accessibles."
  },
  "bizcommunity": {
    "url": "https://www.bizcommunity.com/",
    "countries": [
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Média professionnel sud-africain avec module Latest jobs et annonces récentes."
  },
  "freerecruit": {
    "url": "https://www.freerecruit.co.za/",
    "countries": [
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Plateforme sud-africaine de recrutement et d'offres."
  },
  "mzansi_jobs": {
    "url": "https://www.mzansicareerhub.co.za/search",
    "name": "Mzansi Career Hub",
    "countries": [
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Plateforme sud-africaine avec annonces récentes; nom normalisé."
  },
  "sa_career_hub": {
    "url": "https://www.mzansicareerhub.co.za/search",
    "countries": [
      "ZA"
    ],
    "status": "retired",
    "notes": "Alias du site Mzansi Career Hub renseigné sous mzansi_jobs; pas de double crawler."
  },
  "careers_portal": {
    "url": "https://www.careersportal.co.za/",
    "countries": [
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Portail sud-africain d'orientation et d'offres d'emploi cité par les ressources d'aide à l'emploi."
  },
  "offerzen": {
    "url": "https://www.offerzen.com/software-engineer-jobs",
    "countries": [
      "ZA"
    ],
    "captureMode": "http",
    "notes": "Portail spécialisé en offres technologiques pour le marché sud-africain."
  },
  "graduates24": {
    "status": "retired",
    "countries": [
      "ZA"
    ],
    "notes": "Nom commercial non rapproché d'un site officiel et de listes d'offres actuelles suffisamment vérifiables."
  },
  "vacancymail": {
    "url": "https://www.vacancymail.co.zw/jobs/",
    "countries": [
      "ZW"
    ],
    "captureMode": "http",
    "notes": "Job board zimbabwéen avec offres récentes, dates de clôture et employeurs identifiés."
  },
  "cv_people_africa": {
    "status": "retired",
    "countries": [
      "ZA"
    ],
    "notes": "Nom d'agence/réseau trop générique; aucun domaine officiel distinct et page d'offres confirmée."
  },
  "go_zambia_jobs": {
    "url": "https://gozambiajobs.com/jobs",
    "countries": [
      "ZM"
    ],
    "captureMode": "http",
    "notes": "Portail zambien avec plus de 200 résultats d'emploi au contrôle."
  },
  "jobs_zambia": {
    "status": "retired",
    "countries": [
      "ZM"
    ],
    "notes": "Nom générique non rattaché à un domaine officiel distinct; éviter les doublons avec Go Zambia Jobs et JobWeb Zambia."
  },
  "jobweb_zambia": {
    "url": "https://jobwebzambia.com/jobs/",
    "countries": [
      "ZM"
    ],
    "captureMode": "http",
    "notes": "Portail d'offres zambien; pages emploi identifiées."
  },
  "great_zambia_jobs": {
    "url": "https://www.greatzambiajobs.com/",
    "countries": [
      "ZM"
    ],
    "captureMode": "http",
    "notes": "Job board zambien avec annonces en cours."
  },
  "zambia_jobs_today": {
    "status": "retired",
    "countries": [
      "ZM"
    ],
    "notes": "Nom de rubrique générique non confirmé comme source indépendante."
  },
  "ntchito": {
    "url": "https://nchito.work/",
    "name": "Nchito",
    "countries": [
      "ZM"
    ],
    "captureMode": "http",
    "notes": "Nom corrigé en Nchito; job board zambien avec plusieurs centaines d'offres."
  },
  "todasvagas": {
    "status": "retired",
    "countries": [
      "AO",
      "CV",
      "GW",
      "MZ",
      "ST"
    ],
    "notes": "Nom générique en portugais non rattaché à un site africain d'emploi vérifiable."
  },
  "government_lesotho_jobs": {
    "url": "https://www.gov.ls/jobs/",
    "countries": [
      "LS"
    ],
    "status": "retired",
    "notes": "Alias du connecteur lesotho_gov_jobs déjà présent; ne pas crawler deux fois."
  }
};

function createDiscoverySource(key: string, name: string, type: SourceType): SourceDefinition {
  const detail = DISCOVERY_SOURCE_DETAILS[key] ?? {
    status: "retired" as const,
    enabled: false,
    countries: PAN_AFRICA,
    captureMode: "unknown" as const,
    renderRequired: false,
    notes: "Candidat non qualifié; aucune URL officielle confirmée au 05-11-2026.",
  };
  return {
    key,
    name: detail.name ?? name,
    type,
    status: detail.status ?? "discovered",
    enabled: false,
    url: detail.url,
    countries: detail.countries ?? PAN_AFRICA,
    languages: detail.languages ?? ["en","fr","pt","ar"],
    captureMode: detail.captureMode ?? "http",
    renderRequired: detail.renderRequired ?? false,
    structuredAdapter: detail.structuredAdapter,
    priority: detail.priority ?? 10,
    notes: detail.notes ?? "URL identifiée; collecte et contenu à qualifier avant activation.",
  };
}

export const SOURCE_REGISTRY: SourceDefinition[] = [
  {key:"emploi_cm",name:"Emploi.cm",type:"national",status:"active",enabled:true,url:"https://www.emploi.cm/recherche-jobs-cameroun",countries:["CM"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"emplois_cameroun",name:"Emplois Cameroun",type:"national",status:"active",enabled:true,url:"https://emploiscameroun.com/offres/",countries:["CM"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"jobincamer",name:"Job in Cameroun",type:"national",status:"active",enabled:true,url:"https://www.jobincamer.com/adverts/jobs",countries:["CM"],languages:["fr","en"],captureMode:"http",renderRequired:false,priority:100},
  {key:"jobinfocamer",name:"JobInfoCamer",type:"national",status:"active",enabled:true,url:"https://www.jobinfocamer.com/",countries:["CM"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"infosconcourseducation",name:"Infos Concours Education",type:"specialized",status:"active",enabled:true,url:"https://infosconcourseducation.com/category/offre-demploiss/",countries:["CM"],languages:["fr"],captureMode:"api",renderRequired:false,structuredAdapter:"infosconcourseducation",priority:80},
  {key:"fne",name:"FNE Cameroun",type:"institutional",status:"active",enabled:true,url:"https://www.fnecm.org/",countries:["CM"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"reliefweb",name:"ReliefWeb",type:"institutional",status:"active",enabled:true,url:"https://reliefweb.int/jobs?advanced-search=%28Cameroun%29",countries:["CM"],languages:["en","fr"],captureMode:"http",renderRequired:false,priority:80,notes:"URL actuellement ciblée Cameroun; le country resolver sera requis avant extension."},
  {key:"unjobs",name:"UNjobs",type:"institutional",status:"active",enabled:true,url:"https://unjobs.org/duty_stations/cameroon",countries:["CM"],languages:["en","fr"],captureMode:"http",renderRequired:false,priority:80,notes:"URL actuellement ciblée Cameroun; le country resolver sera requis avant extension."},
  {key:"impactpool",name:"Impactpool",type:"specialized",status:"active",enabled:true,url:"https://www.impactpool.org/jobs?location=Cameroon",countries:["CM"],languages:["en","fr"],captureMode:"http",renderRequired:false,priority:70,notes:"URL actuellement ciblée Cameroun; le country resolver sera requis avant extension."},
  {key:"minajobs_rss",name:"MinaJobs RSS",type:"national",status:"active",enabled:true,url:"https://cm2024.minajobs.net/rss",countries:["CM"],languages:["fr"],captureMode:"rss",renderRequired:false,structuredAdapter:"minajobs_rss",priority:80},
  {key:"techmap_cm",name:"Techmap CM",type:"aggregator",status:"active",enabled:true,url:"https://api.techmap.io/",countries:["CM"],languages:["en","fr"],captureMode:"api",renderRequired:false,structuredAdapter:"techmap_cm",priority:60},
  {key:"jobspipe_cm",name:"JobsPipe CM",type:"aggregator",status:"active",enabled:true,url:"https://api.jobspipe.dev/v1/jobs/search",countries:["CM"],languages:["en","fr"],captureMode:"api",renderRequired:false,structuredAdapter:"jobspipe_cm",priority:70},
  {key:"jooble_cm",name:"Jooble CM",type:"aggregator",status:"active",enabled:true,url:"https://jooble.org/api/",countries:["CM"],languages:["en","fr"],captureMode:"api",renderRequired:false,structuredAdapter:"jooble_cm",priority:60},
  {key:"reliefweb_africa",name:"ReliefWeb Africa",type:"institutional",status:"active",enabled:true,url:"https://reliefweb.int/jobs",countries:PAN_AFRICA.filter(c=>c!=="CM"),languages:["en","fr"],captureMode:"http",renderRequired:false,priority:80},
  {key:"unjobs_africa",name:"UNjobs Africa",type:"institutional",status:"active",enabled:true,url:"https://unjobs.org/",countries:PAN_AFRICA.filter(c=>c!=="CM"),languages:["en","fr"],captureMode:"http",renderRequired:false,priority:80},
  {key:"impactpool_africa",name:"Impactpool Africa",type:"specialized",status:"active",enabled:true,url:"https://www.impactpool.org/jobs",countries:PAN_AFRICA.filter(c=>c!=="CM"),languages:["en","fr"],captureMode:"http",renderRequired:false,priority:70},
  {key:"idealists",name:"Idealist",type:"specialized",status:"active",enabled:true,url:"https://www.idealist.org/en/jobs",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:false,priority:50},
  {key:"devex",name:"Devex Jobs",type:"specialized",status:"active",enabled:true,url:"https://www.devex.com/jobs",countries:PAN_AFRICA,languages:["en"],captureMode:"http",renderRequired:false,priority:60},
  {key:"devnetjobs",name:"DevNetJobs",type:"specialized",status:"active",enabled:true,url:"https://devnetjobs.org/",countries:PAN_AFRICA,languages:["en"],captureMode:"http",renderRequired:false,priority:60},
  {key:"unjobnet",name:"UNjobnet",type:"institutional",status:"active",enabled:true,url:"https://www.unjobnet.org/",countries:PAN_AFRICA,languages:["en"],captureMode:"http",renderRequired:false,priority:70},
  {key:"un_careers",name:"UN Careers",type:"institutional",status:"active",enabled:true,url:"https://careers.un.org/",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:true,priority:80},
  {key:"undp_jobs",name:"UNDP Jobs",type:"institutional",status:"active",enabled:true,url:"https://jobs.undp.org/",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:true,priority:80},
  {key:"unicef_jobs",name:"UNICEF Careers",type:"institutional",status:"active",enabled:true,url:"https://jobs.unicef.org/",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:true,priority:80},
  {key:"linkedin",name:"LinkedIn",type:"aggregator",status:"discovered",enabled:false,url:"https://www.linkedin.com/jobs/jobs-in-cameroon",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"browser",renderRequired:true,priority:30,notes:"Conservé comme découverte; non activé dans le crawler actuel."},
  {key:"indeed",name:"Indeed",type:"aggregator",status:"discovered",enabled:false,url:"https://cm.indeed.com/jobs?q=&l=Cameroon",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"browser",renderRequired:true,priority:30},
  {key:"glassdoor",name:"Glassdoor",type:"aggregator",status:"discovered",enabled:false,url:"https://www.glassdoor.com/Job/cameroon-jobs-SRCH_IL.0,8_IN35.htm",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"browser",renderRequired:true,priority:20},

  // V3 discovery catalog: discovered only. URLs/adapters must be qualified before activation.
  ...([
    ["africarrieres","Africarrières","pan_africa"],["freshtalent","FreshTalent","pan_africa"],["jobaa","Jobaa","pan_africa"],["africajobconnect","AfricaJobConnect","pan_africa"],["taf4all","TAF4ALL","pan_africa"],["myjobmag","MyJobMag","pan_africa"],["fuzu","Fuzu","pan_africa"],["novojob","Novojob","pan_africa"],["alerte_emploi","Alerte Emploi","pan_africa"],["mapage_africa","MaPage Africa","pan_africa"],["jobfolio_africa","Jobfolio Africa","pan_africa"],["hr_paddy","HR Paddy","specialized"],["jobra","Jobra","pan_africa"],["jobiro","Jobiro","pan_africa"],["clbk","CLBK","pan_africa"],["edmatch","EdoMatch","pan_africa"],["careers_in_africa","Careers in Africa","pan_africa"],["work_in_africa","Work in Africa","pan_africa"],["chantierpro","ChantierPro","specialized"],["affutjob","Affutjob","pan_africa"],["marcheemploi","MarcheEmploi","pan_africa"],["vueradar","VueRadar","pan_africa"],["jobsonline_africa","JobsOnline Africa","pan_africa"],["diaspojob","DiaspoJob","pan_africa"],["akilibrain","AkiliBrain","pan_africa"],
    ["rekrute","ReKrute","national"],["emploi_ma","Emploi.ma","national"],["marocannonces","MarocAnnonces","national"],["jobs_ma","jobs-ma","national"],["coincarriere","CoinCarrière","national"],["allojob","AlloJob","national"],["alwadifa_maroc","Alwadifa Maroc","national"],["bghit_nekhdem","Bghit Nekhdem","national"],["wetech","Wetech","specialized"],["ejobs","eJobs","specialized"],["hotalents","Hotalents","specialized"],["moncallcenter","Moncallcenter","specialized"],
    ["wuzzuf","Wuzzuf","national"],["forasna","Forasna","national"],["tanqeeb","Tanqeeb","aggregator"],["jobberman","Jobberman","national"],["jobweb_ghana","JobWeb Ghana","national"],["get_hired_ghana","Get Hired Ghana","national"],["hire_rung","HireRung","national"],["plegma","Plegma","national"],["hotnigerianjobs","HotNigerianJobs","national"],["ngcareers","NgCareers","national"],["jobgurus","JobGurus","national"],["jobsinnigeria","Jobsinnigeria","national"],["quicktojobs","QuickToJobs","national"],["jobstark","JobStark","national"],["gradjobber","GradJobber","specialized"],["xoooth","Xooth","national"],["work_in_edo","Work in Edo","national"],["employdakar","EmploiDakar","national"],["senjob","Senjob","national"],["digijob_guinee","DigiJob Guinée","national"],["jobbissau","JobBissau","national"],
    ["jobinfocamer_extra","Irelis / PeoJob / Flinkn","national"],["emploi_cd","Emploi.cd","national"],["kivuhub","KivuHub Job","specialized"],["emploi_cg","Emploi.cg","national"],["emploi_ga","Emploi.ga","national"],["africatalents","AfricaTalents","national"],["jobartis","Jobartis","national"],["corporate_staffing","Corporate Staffing","specialized"],["jobweb_kenya","JobWeb Kenya","national"],["myjobsinkenya","MyJobsInKenya","national"],["recruitfinds","RecruitFinds","national"],["linkbase","Linkbase","national"],["ajirazone","AjiraZone","national"],["center_board","Center Board","national"],["great_uganda_jobs","Great Uganda Jobs","national"],["jobweb_uganda","JobWeb Uganda","national"],["job_adverts_uganda","Job Adverts Uganda","national"],["ajirika","Ajirika","national"],["ajira_portal","Ajira Portal","institutional"],["work_tz","Work.tz","national"],["ajira_mwananchi","Ajira Mwananchi","national"],["mshahara","Mshahara","national"],["fadicy","Fadicy","national"],["jobweb_rwanda","JobWeb Rwanda","national"],["kigali_today_jobs","Kigali Today Jobs","national"],["umurimo","Umurimo","national"],["jobs_in_rwanda_ai","JobsInRwanda.ai","specialized"],["ethiojobs","Ethiojobs","national"],["ezega","Ezega","national"],["jobweb_ethiopia","JobWeb Ethiopia","national"],["jobsethiopia","JobsEthiopia","national"],["worklink_ethiopia","WorkLinkEthiopia","national"],["binasmart","BinaSmart","national"],["hornjobs","HornJobs","specialized"],["comores_emploi","Comores Emploi","national"],["jobmada","JobMada","national"],["myjob_mu","MyJob.mu","national"],["hellojob_mu","HelloJob","national"],["jobo_sc","JOBO.sc","national"],["careers24","Careers24","national"],["pnet","PNet","national"],["careerjunction","CareerJunction","national"],["jobmail","Job Mail","national"],["bizcommunity","Bizcommunity Jobs","specialized"],["freerecruit","Freerecruit","national"],["mzansi_jobs","Mzansi Jobs","national"],["sa_career_hub","SA Career Hub","national"],["careers_portal","Careers Portal","national"],["offerzen","OfferZen","specialized"],["graduates24","Graduates24","specialized"],["vacancymail","VacancyMail","national"],["cv_people_africa","CV People Africa","national"],["go_zambia_jobs","GoZambiaJobs","national"],["jobs_zambia","Jobs Zambia","national"],["jobweb_zambia","JobWeb Zambia","national"],["great_zambia_jobs","Great Zambia Jobs","national"],["zambia_jobs_today","Zambia Jobs Today","national"],["ntchito","Ntchito","national"],["todasvagas","TodasVagas","national"],["jobs_eswatini","Jobs Eswatini","national"],["government_lesotho_jobs","Government Jobs Lesotho","institutional"]
  ] as Array<[string,string,SourceType]>).map(([key,name,type])=>createDiscoverySource(key,name,type)),
];


const CENTRAL_AFRICA_SOURCES: SourceDefinition[] = [
  {key:"acfpe_cf",name:"ACFPE Centrafrique",type:"institutional",status:"active",enabled:true,url:"https://acfpe.info/offre_emplois/index/25",countries:["CF"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"ktzemploi_cf",name:"KTZ Emploi RCA",type:"national",status:"active",enabled:true,url:"https://ktzemploi.com/emplois",countries:["CF"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"emploi_cf",name:"Emploi.cf",type:"national",status:"active",enabled:true,url:"https://www.emploi.cf/",countries:["CF"],languages:["fr","en"],captureMode:"http",renderRequired:false,priority:90},
  {key:"banguiconnect",name:"BanguiConnect",type:"specialized",status:"active",enabled:true,url:"https://www.banguiconnect.com/categories/emploi",countries:["CF"],languages:["fr"],captureMode:"http",renderRequired:false,priority:90},
  {key:"onape_td",name:"ONAPE Tchad",type:"institutional",status:"active",enabled:true,url:"https://onape.td/liste-des-offres-demploi/",countries:["TD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"tchadjobs",name:"TchadJobs",type:"national",status:"active",enabled:true,url:"https://tchadjobs.com/",countries:["TD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:70,notes:"Surveillance; le contrôle du 30-09-2026 affichait 0 offre."},
  {key:"tchad_emploi",name:"Tchad-Emploi",type:"national",status:"active",enabled:true,url:"https://tchad-emploi.com/fr",countries:["TD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:60,notes:"Surveillance; aucune offre active exposée lors du dernier contrôle."},
  {key:"emploi_td",name:"Emploi.td",type:"national",status:"active",enabled:true,url:"https://www.emploi.td/recrutement-n-djamena",countries:["TD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:70},
  {key:"acpe_cg",name:"ACPE Congo",type:"institutional",status:"active",enabled:true,url:"https://acpe.cg/offres-emplois",countries:["CG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:110},
  {key:"emploi_cg",name:"Emploi.cg",type:"national",status:"active",enabled:true,url:"https://www.emploi.cg/recherche-jobs-congo-brazzaville",countries:["CG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:95},
  {key:"africatalents_cg",name:"AfricaTalents Congo",type:"aggregator",status:"inactive",enabled:false,url:"https://www.emploi.cg/about-us",countries:["CG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:60,notes:"Métadonnée/écosystème uniquement; non récolté séparément pour éviter les doublons avec Emploi.cg."},
  {key:"emploi_cd",name:"Emploi.cd",type:"national",status:"active",enabled:true,url:"https://www.emploi.cd/recherche-jobs-congo-rdc",countries:["CD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"kivuhub",name:"KivuHub Job",type:"specialized",status:"active",enabled:true,url:"https://kivuhub.net/find-a-job/",countries:["CD"],languages:["fr","en"],captureMode:"http",renderRequired:false,priority:100},
  {key:"congojob_cd",name:"CongoJob",type:"national",status:"active",enabled:true,url:"https://congojob.cd/",countries:["CD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:70},
  {key:"onem_app_cd",name:"ONEM RDC — application",type:"institutional",status:"active",enabled:true,url:"https://onem.cd/demandeurs-demploi/offres-demploi",countries:["CD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:125,notes:"Official offers list exposes employer cards with a Voir Détails action; extract the underlying detail URL/form action, then require a direct application contact."},
  {key:"onem_cd",name:"ONEM RDC",type:"institutional",status:"active",enabled:true,url:"https://onem.cd/home/offres-demploi",countries:["CD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:115},
  {key:"kaziqo_cd",name:"KAZIQO RDC",type:"aggregator",status:"active",enabled:true,url:"https://kaziqo.com/",countries:["CD"],languages:["fr","en"],captureMode:"http",renderRequired:false,priority:105},
  {key:"ajar_cd",name:"Ajar RDC",type:"aggregator",status:"active",enabled:true,url:"https://seeajar.com/fr/cd",countries:["CD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"emploiscongo_cd",name:"Emplois Congo / Jobartis",type:"aggregator",status:"active",enabled:true,url:"https://www.emploiscongo.com/emplois",countries:["CD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:90},
  {key:"travail_ga",name:"TRAVAIL.GA / PNPE",type:"institutional",status:"active",enabled:true,url:"https://travail.ga/",countries:["GA"],languages:["fr"],captureMode:"http",renderRequired:false,priority:110},
  {key:"emploi_ga",name:"Emploi.ga",type:"national",status:"active",enabled:true,url:"https://www.emploi.ga/recherche-jobs-gabon",countries:["GA"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"mintravail_gq",name:"Ministère du Travail Guinée équatoriale",type:"institutional",status:"active",enabled:true,url:"https://mintrabajo.gob.gq/",countries:["GQ"],languages:["es","fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"pe_stp",name:"PE-STP — Plataforma Nacional de Empregabilidade",type:"institutional",status:"active",enabled:true,url:"https://emprego.gov.st/",countries:["ST"],languages:["pt"],captureMode:"http",renderRequired:false,priority:110},
  {key:"kezir_st",name:"Kezir São Tomé",type:"national",status:"active",enabled:true,url:"https://www.kezir.st/announcements?category=Emprego&sort=newest",countries:["ST"],languages:["pt"],captureMode:"http",renderRequired:false,priority:100},
  {key:"quadife_st",name:"QuaDiFe",type:"national",status:"active",enabled:true,url:"https://quadife.st/",countries:["ST"],languages:["pt"],captureMode:"http",renderRequired:false,priority:70},
  {key:"burundijobs",name:"BurundiJobs",type:"national",status:"active",enabled:true,url:"https://www.burundijobs.bi/",countries:["BI"],languages:["fr","en"],captureMode:"http",renderRequired:false,priority:100},
  {key:"paeej_bi",name:"PAEEJ Burundi",type:"institutional",status:"active",enabled:true,url:"https://www.job.paeej.bi/offres/",countries:["BI"],languages:["fr"],captureMode:"http",renderRequired:false,priority:95},
  {key:"mae_bi",name:"Ministère des Affaires étrangères du Burundi — Offres d'emplois",type:"institutional",status:"active",enabled:true,url:"https://www.mae.gov.bi/category/offres-demplois/",countries:["BI"],languages:["fr"],captureMode:"http",renderRequired:false,priority:90}
];

for (const override of CENTRAL_AFRICA_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((source) => source.key === override.key);
  if (index >= 0) SOURCE_REGISTRY[index] = override;
  else SOURCE_REGISTRY.push(override);
}





// West Africa V1 — country-by-country qualified sources from the second audit layer.
const WEST_AFRICA_SOURCES: SourceDefinition[] = [
  {key:"anpe_bj",name:"ANPE Bénin",type:"institutional",status:"active",enabled:true,url:"https://anpe.bj/avis-de-recrutement/",countries:["BJ"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120,notes:"Service public de l'emploi; portail officiel et offres vérifiées."},
  {key:"sica_anpe_bj",name:"SICA ANPE Bénin",type:"institutional",status:"active",enabled:true,url:"https://sica.anpe.bj/portail-offres",countries:["BJ"],languages:["fr"],captureMode:"browser",renderRequired:true,priority:125,notes:"Portail d'offres JS; à traiter par navigateur pour la récolte complète."},
  {key:"gouv_bj_emploi",name:"Gouvernement du Bénin — Offres d'emploi",type:"institutional",status:"active",enabled:true,url:"https://www.gouv.bj/opportunites/offres-emploi/1/",countries:["BJ"],languages:["fr"],captureMode:"http",renderRequired:false,priority:115},
  {key:"iefp_cv",name:"IEFP / PEPE Cabo Verde",type:"institutional",status:"active",enabled:true,url:"https://pepe.iefp.cv/frontend/web/index.php/pt/site/oferta-emprego",countries:["CV"],languages:["pt"],captureMode:"http",renderRequired:false,priority:120},
  {key:"jobivoire_ci",name:"JobIvoire",type:"national",status:"active",enabled:true,url:"https://www.jobivoire.ci/jobs",countries:["CI"],languages:["fr"],captureMode:"http",renderRequired:false,priority:110},
  {key:"emploi_ci",name:"Emploi.ci",type:"national",status:"active",enabled:true,url:"https://www.emploi.ci/",countries:["CI"],languages:["fr"],captureMode:"http",renderRequired:false,priority:105},
  {key:"senjob_west",name:"Senjob",type:"pan_africa",status:"active",enabled:true,url:"https://senjob.com/offres-d-emploi.php",countries:["SN","CI","BF","ML","NE","GN","TG","BJ"],languages:["fr"],captureMode:"http",renderRequired:false,priority:95},
  {key:"jobcomgh",name:"Jobs.com.gh",type:"national",status:"active",enabled:true,url:"https://jobs.com.gh/",countries:["GH"],languages:["en"],captureMode:"http",renderRequired:false,priority:120},
  {key:"jobweb_ghana",name:"JobWeb Ghana",type:"national",status:"active",enabled:true,url:"https://www.jobwebghana.com/",countries:["GH"],languages:["en"],captureMode:"http",renderRequired:false,priority:100},
  {key:"jobberman_gh",name:"Jobberman Ghana",type:"national",status:"active",enabled:true,url:"https://www.jobberman.com.gh/",countries:["GH"],languages:["en"],captureMode:"http",renderRequired:false,priority:100},
  {key:"myjobmag_ng",name:"MyJobMag Nigeria",type:"national",status:"active",enabled:true,url:"https://www.myjobmag.com/",countries:["NG"],languages:["en"],captureMode:"http",renderRequired:false,priority:115},
  {key:"hotnigerianjobs",name:"HotNigerianJobs",type:"national",status:"active",enabled:true,url:"https://www.hotnigerianjobs.com/alljobs/",countries:["NG"],languages:["en"],captureMode:"http",renderRequired:false,priority:110},
  {key:"jobberman_ng",name:"Jobberman Nigeria",type:"national",status:"active",enabled:true,url:"https://www.jobberman.com/",countries:["NG"],languages:["en"],captureMode:"http",renderRequired:false,priority:105},
  {key:"senjob_sn",name:"Senjob Sénégal",type:"national",status:"active",enabled:true,url:"https://senjob.com/offres-d-emploi.php",countries:["SN"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120},
  {key:"emploidakar_sn",name:"EmploiDakar",type:"national",status:"active",enabled:true,url:"https://www.emploidakar.com/",countries:["SN"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"lmis_sl",name:"LMIS Sierra Leone",type:"institutional",status:"active",enabled:true,url:"https://lmis.moelss.gov.sl/",countries:["SL"],languages:["en"],captureMode:"http",renderRequired:false,priority:125},
  {key:"careers_sl",name:"Careers SL",type:"national",status:"active",enabled:true,url:"https://careers.sl/",countries:["SL"],languages:["en"],captureMode:"http",renderRequired:false,priority:115},
  {key:"hrjobs_liberia",name:"HireLiberia",type:"aggregator",status:"active",enabled:true,url:"https://hireliberia.com/",countries:["LR"],languages:["en"],captureMode:"http",renderRequired:false,priority:125,notes:"Public Liberian employment platform with current vacancies and individual detail pages. Apply only when an application email/phone is present on the actual vacancy."},
  {key:"malijob",name:"MaliJob",type:"national",status:"active",enabled:true,url:"https://www.malijob.com/",countries:["ML"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"emploi_ml",name:"Emploi.ml",type:"national",status:"discovered",enabled:false,url:"https://www.emploi.ml/",countries:["ML"],languages:["fr"],captureMode:"http",renderRequired:false,priority:90,notes:"À qualifier au prochain smoke crawl."},
  {key:"anpe_bf",name:"ANPE Burkina Faso",type:"institutional",status:"active",enabled:true,url:"https://recrutement.anpe.gov.bf/",countries:["BF"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120,notes:"Official recruitment portal. Current indexed portal indicates no active vacancy at the time of the last audit; keep source monitored."},
  {key:"anpe_ne",name:"ANPE Niger",type:"institutional",status:"active",enabled:true,url:"https://anpe-niger.ne/",countries:["NE"],languages:["fr"],captureMode:"http",renderRequired:false,priority:125,notes:"Official ANPE Niger portal; crawl homepage and /poste/{slug} vacancy details. Application email must be extracted from the application block, never the generic footer."},
  {key:"anpetogo",name:"ANPE Togo",type:"institutional",status:"active",enabled:true,url:"https://anpetogo.net/offres",countries:["TG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120,notes:"URL institutionnelle candidate; activation après smoke audit."},
  {key:"jobguinee",name:"GuineeJob",type:"national",status:"discovered",enabled:false,url:"https://www.guineejob.com/",countries:["GN"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100,notes:"À qualifier par accessibilité et fraîcheur."},
  {key:"emploi_gw",name:"IEFP Guinea-Bissau",type:"institutional",status:"discovered",enabled:false,url:"https://iefp.gw/",countries:["GW"],languages:["pt"],captureMode:"http",renderRequired:false,priority:100,notes:"À qualifier; portail institutionnel candidat."},
  {key:"jobsearch_gm",name:"Gambia JobSearch",type:"national",status:"discovered",enabled:false,url:"https://jobsearch.gm/",countries:["GM"],languages:["en"],captureMode:"http",renderRequired:false,priority:100,notes:"À qualifier par smoke crawl."},
  {key:"jobartis_ao",name:"Jobartis Angola",type:"national",status:"discovered",enabled:false,url:"https://www.jobartis.com/",countries:["AO"],languages:["pt"],captureMode:"http",renderRequired:false,priority:110,notes:"Angola traité dans le lot lusophone; activation après audit d'accès."},
  {key:"emprego_ao",name:"Emprego.co.ao",type:"national",status:"discovered",enabled:false,url:"https://www.emprego.co.ao/",countries:["AO"],languages:["pt"],captureMode:"http",renderRequired:false,priority:105,notes:"À qualifier par smoke crawl."},
  {key:"fne_west",name:"Ancien placeholder FNE/ANPE Afrique de l'Ouest — retiré",type:"institutional",status:"retired",enabled:false,countries:["BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG"],languages:["fr","en","pt"],captureMode:"unknown",renderRequired:false,priority:0,notes:"Ce libellé regroupait plusieurs agences publiques et ne représentait pas une source unique. Chaque agence réelle conserve sa propre entrée; placeholder neutralisé le 05-11-2026."}
];


// Second-pass pan-African/source-ratissage qualification — 30 Sep 2026.
const RATISSAGE_VERIFIED_SOURCES: SourceDefinition[] = [
  {key:"afriquejob",name:"AfriqueJob",type:"pan_africa",status:"active",enabled:true,url:"https://www.afriquejob.com/en/",countries:PAN_AFRICA,languages:["fr","en","ar"],captureMode:"http",renderRequired:false,priority:75,notes:"Pan-African country directory; second-pass source census."},
  {key:"africarrieres",name:"Africarrières",type:"pan_africa",status:"active",enabled:true,url:"https://africarrieres.com/",countries:PAN_AFRICA,languages:["fr","en","es"],captureMode:"http",renderRequired:false,priority:75,notes:"Pan-African jobs portal; country-level listings visible for the 54-country scope."},
  {key:"jobafrik",name:"JobAfrik",type:"pan_africa",status:"active",enabled:true,url:"https://www.jobafrik.com/",countries:["CM","SN","CI","TN"],languages:["fr"],captureMode:"http",renderRequired:false,priority:75,notes:"Verified current listings in Cameroon, Senegal, Côte d'Ivoire and Tunisia."},
  {key:"africa_jobline",name:"Africa Jobline",type:"pan_africa",status:"active",enabled:true,url:"https://africajobline.com/",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:false,priority:70,notes:"Pan-African talent/job portal; country filter available."},
  {key:"eastworka",name:"Eastworka",type:"pan_africa",status:"active",enabled:true,url:"https://eastworka.com/jobs",countries:["KE","UG","TZ","RW","ET","BI","CD","SO","SC","DJ","SS","MU","KM","ER"],languages:["en"],captureMode:"http",renderRequired:false,priority:70,notes:"East/Horn/Indian Ocean coverage verified during second-pass census."},
  {key:"kazi_pamoja",name:"Kazi Pamoja",type:"pan_africa",status:"active",enabled:true,url:"https://kazipamoja.online/",countries:["BI","DJ","CD","ER","ET","KE","RW","SO","SS","SD","TZ","UG"],languages:["en"],captureMode:"http",renderRequired:false,priority:70,notes:"Multi-country East Africa source; country filters exposed."},
  {key:"ajirika_east",name:"Ajirika",type:"pan_africa",status:"active",enabled:true,url:"https://ajirika.com/",countries:["KE","TZ","UG","RW"],languages:["en"],captureMode:"http",renderRequired:false,priority:70,notes:"Employer/government/job-board aggregation across four East African markets."},
  {key:"work_ke",name:"work.ke",type:"national",status:"active",enabled:true,url:"https://work.ke/jobs",countries:["KE"],languages:["en"],captureMode:"http",renderRequired:false,priority:105,notes:"Current Kenya openings with source attribution and freshness checks."},
  {key:"uemoa_careers",name:"UEMOA Carrières",type:"institutional",status:"active",enabled:true,url:"https://e-recrutement.uemoa.int/",countries:["BJ","BF","CI","GW","ML","NE","SN","TG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100,notes:"Official UEMOA recruitment channel covering eight member states."},
  {key:"ecowas_careers",name:"CEDEAO Careers",type:"institutional",status:"active",enabled:true,url:"https://www.ecowas.int/careers/?lang=fr",countries:["BJ","CV","CI","GM","GH","GN","GW","LR","NG","SN","SL","TG"],languages:["fr","en","pt"],captureMode:"http",renderRequired:false,priority:100,notes:"Official ECOWAS recruitment channel; regional institutional source."},
  {key:"bayt_africa",name:"Bayt Africa",type:"aggregator",status:"active",enabled:true,url:"https://www.bayt.com/",countries:["DZ","EG","LY","MA","TN"],languages:["en","fr","ar"],captureMode:"http",renderRequired:false,priority:65,notes:"MENA jobs portal with explicit African country destinations."},
  {key:"south_africa_gov_jobs",name:"South African Department of Employment and Labour Vacancies",type:"institutional",status:"active",enabled:true,url:"https://www.labour.gov.za/Vacancies/Pages/Vacancies-List.aspx",countries:["ZA"],languages:["en"],captureMode:"http",renderRequired:false,priority:125,notes:"Official vacancy list with individual details. Extract the Direct Your Applications to email, not only the enquiry contact; live notices have close dates."},
  {key:"essa_sa",name:"ESSA South Africa",type:"institutional",status:"active",enabled:true,url:"https://essa.labour.gov.za/EssaOnline/",countries:["ZA"],languages:["en"],captureMode:"http",renderRequired:false,priority:120,notes:"Official Employment Services of South Africa."},
  {key:"kenya_psc_jobs",name:"Kenya Public Service Commission Jobs",type:"institutional",status:"active",enabled:true,url:"https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx",countries:["KE"],languages:["en"],captureMode:"http",renderRequired:false,priority:120,notes:"Official active-adverts table. Applications are submitted through PSCIMS; the general contact-centre email/phone is not an application contact."},
];


// Third-pass channel census — live web re-check, 30 Sep 2026.

// Fourth-pass channel census — under-covered countries, live web re-check, 30 Sep 2026.
const RATISSAGE_WAVE_4_SOURCES: SourceDefinition[] = [
  {key:"lesotho_gov_jobs",name:"Government of Lesotho Jobs",type:"institutional",status:"active",enabled:true,url:"https://www.gov.ls/jobs/",countries:["LS"],languages:["en"],captureMode:"http",renderRequired:false,priority:120,notes:"Official Lesotho government jobs page with current 2026 vacancies."},
  {key:"jobs_eswatini",name:"Jobs Eswatini",type:"national",status:"active",enabled:true,url:"https://jobs.eswazi.org/jobs/",countries:["SZ"],languages:["en"],captureMode:"http",renderRequired:true,priority:110,notes:"Active Eswatini job board with recent listings."},
  {key:"inep_mozambique",name:"INEP Mozambique",type:"institutional",status:"active",enabled:true,url:"https://www.nepmz.com/",countries:["MZ"],languages:["pt"],captureMode:"http",renderRequired:false,priority:125,notes:"Official national employment portal; current vacancies exposed."},
  {key:"portal_juventude_mz",name:"Portal da Juventude Mozambique",type:"institutional",status:"active",enabled:true,url:"https://www.juventude.mjd.gov.mz/emprego",countries:["MZ"],languages:["pt"],captureMode:"http",renderRequired:false,priority:105,notes:"Official Ministry of Youth employment/opportunity channel; links to INEP."},
  {key:"beta_mauritania",name:"BETA Conseils Mauritanie",type:"national",status:"active",enabled:true,url:"https://www.beta.mr/index.php/beta/liste_offres/1",countries:["MR"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:115,notes:"Mauritanian recruitment portal with current job listings."},
  {key:"recruteo_mg",name:"Recruteo Madagascar",type:"national",status:"active",enabled:true,url:"https://recruteo.mg/",countries:["MG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:105,notes:"Madagascar employment portal with active offer surface."},
];

const RATISSAGE_WAVE_3_SOURCES: SourceDefinition[] = [
  {key:"goafricajobs",name:"Go Africa Jobs",type:"pan_africa",status:"active",enabled:true,url:"https://goafricajobs.com/",countries:["ZA","ZM","NA","ZW"],languages:["en"],captureMode:"http",renderRequired:false,priority:80},
  {key:"africawork",name:"AfricaWork",type:"pan_africa",status:"active",enabled:true,url:"https://www.africawork.com/",countries:["DZ","BJ","BW","BF","BI","CM","CF","TD","CG","CD","CI","EG","ET","GA","GH","GN","KE","LR","MW","ML","MR","MA","MZ","NA","NE","NG","RW","SN","SL","ZA","TZ","TG","TN","UG","ZM","ZW"],languages:["fr","en"],captureMode:"http",renderRequired:false,priority:80},
  {key:"njorku_jobs",name:"Njorku Jobs",type:"specialized",status:"active",enabled:true,url:"https://jobs.njorku.net/",countries:["CM","NG"],languages:["en","fr"],captureMode:"http",renderRequired:false,priority:75},
  {key:"brightermonday_ke",name:"BrighterMonday Kenya",type:"national",status:"active",enabled:true,url:"https://www.brightermonday.co.ke/jobs",countries:["KE"],languages:["en"],captureMode:"http",renderRequired:false,priority:115},
  {key:"brightermonday_ug",name:"BrighterMonday Uganda",type:"national",status:"active",enabled:true,url:"https://www.brightermonday.co.ug/",countries:["UG"],languages:["en"],captureMode:"http",renderRequired:false,priority:115},
  {key:"triemploi_dz",name:"Triemploi",type:"national",status:"active",enabled:true,url:"https://www.triemploi.com/jobs",countries:["DZ"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:110},
  {key:"vacancyupdate_za",name:"Vacancy Update",type:"national",status:"active",enabled:true,url:"https://www.vacancyupdate.co.za/",countries:["ZA"],languages:["en"],captureMode:"http",renderRequired:false,priority:95},
  {key:"sercanto_za",name:"Sercanto South Africa",type:"aggregator",status:"active",enabled:true,url:"https://za.sercanto.com/",countries:["ZA"],languages:["en"],captureMode:"http",renderRequired:false,priority:65},
  {key:"workinafrica_ci",name:"Work in Africa",type:"specialized",status:"active",enabled:true,url:"https://www.workinafrica.com/",countries:["CI","SN","GH","NG"],languages:["fr","en"],captureMode:"http",renderRequired:false,priority:70},
  {key:"mapage_africa_jobs",name:"MaPage Africa Jobs",type:"pan_africa",status:"active",enabled:true,url:"https://mapage.africa/index.php/opportunities?cat=jobs&lang=fr&region=africa",countries:PAN_AFRICA,languages:["fr","en","ar","pt"],captureMode:"http",renderRequired:false,priority:80},
];

// Fifth-pass channel census — live web re-check, 30 Sep 2026.
const RATISSAGE_WAVE_5_SOURCES: SourceDefinition[] = [
  {key:"oppz_zambia_jobs",name:"Office of the Public Protector Zambia Jobs",type:"institutional",status:"active",enabled:true,url:"https://www.oppz.gov.zm/download-category/jobs/",countries:["ZM"],languages:["en"],captureMode:"http",renderRequired:false,priority:120,notes:"Official Zambian institutional jobs page exposing current vacancies."},
  {key:"botswana_mof_recruitment",name:"Botswana Government Careers",type:"institutional",status:"active",enabled:true,url:"https://gov.bw/careers",countries:["BW"],languages:["en"],captureMode:"http",renderRequired:false,priority:115,notes:"Official government careers directory. Ministry of Finance category had compromised/spam content; use the clean government-wide careers directory and record zero when no openings are listed."},
  {key:"zimbabwe_psc_erecruitment",name:"Zimbabwe Public Service Commission e-Recruitment",type:"institutional",status:"active",enabled:true,url:"https://erecruitment.psc.gov.zw/index.php?jobsearch=psc+jons",countries:["ZW"],languages:["en"],captureMode:"http",renderRequired:false,priority:125,notes:"Official active-opportunities listing. Apply through PSC e-Recruitment account; keep out of the email/phone-application ingestion filter unless the detail provides a direct application contact."},
  {key:"namibia_moj_vacancies",name:"Namibia Ministry of Justice Vacancies",type:"institutional",status:"active",enabled:true,url:"https://moj.gov.na/vacancies",countries:["NA"],languages:["en"],captureMode:"http",renderRequired:false,priority:115,notes:"Official ministry vacancy page with September 2026 vacancies."},
  {key:"malawi_education_recruitment",name:"Malawi Government Teachers Recruitment Portal",type:"institutional",status:"discovered",enabled:false,url:"https://recruitment.education.gov.mw/",countries:["MW"],languages:["en"],captureMode:"http",renderRequired:false,priority:100,notes:"Official government recruitment portal; latest indexed vacancy was closed at census time, so retained for surveillance rather than active harvest."},
  {key:"malawi_health_opportunities",name:"Malawi Ministry of Health Opportunities",type:"institutional",status:"discovered",enabled:false,url:"https://www.health.gov.mw/",countries:["MW"],languages:["en"],captureMode:"http",renderRequired:false,priority:95,notes:"Official health ministry opportunity channel; vacancy surface requires further qualification before activation."},
  {key:"mozambique_incm_recruitment",name:"Mozambique INCM Recruitment Portal",type:"institutional",status:"discovered",enabled:false,url:"https://candidaturas.incm.gov.mz/",countries:["MZ"],languages:["pt"],captureMode:"http",renderRequired:true,priority:100,notes:"Official recruitment portal; census showed zero current opportunities, retained for periodic recheck."},
];

for (const source of RATISSAGE_WAVE_5_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((candidate) => candidate.key === source.key);
  if (index >= 0) SOURCE_REGISTRY[index] = source;
  else SOURCE_REGISTRY.push(source);
}

for (const source of RATISSAGE_WAVE_3_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((candidate) => candidate.key === source.key);
  if (index >= 0) SOURCE_REGISTRY[index] = source;
  else SOURCE_REGISTRY.push(source);
}

for (const source of RATISSAGE_WAVE_4_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((candidate) => candidate.key === source.key);
  if (index >= 0) SOURCE_REGISTRY[index] = source;
  else SOURCE_REGISTRY.push(source);
}

for (const source of RATISSAGE_VERIFIED_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((candidate) => candidate.key === source.key);
  if (index >= 0) SOURCE_REGISTRY[index] = source;
  else SOURCE_REGISTRY.push(source);
}

for (const override of WEST_AFRICA_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((source) => source.key === override.key);
  if (index >= 0) SOURCE_REGISTRY[index] = override;
  else SOURCE_REGISTRY.push(override);
}

 
// Sixth-pass source integration — qualified national portals, 2 Nov 2026.
const RATISSAGE_WAVE_6_SOURCES: SourceDefinition[] = [
  {key:"pnet",name:"PNet",type:"national",status:"active",enabled:true,url:"https://www.pnet.co.za/jobs/vacancies",countries:["ZA"],languages:["en"],captureMode:"http",renderRequired:false,priority:125,notes:"South African national job board; listing page exposes live vacancies, locations and recency filters."},
  {key:"careerjunction",name:"CareerJunction",type:"national",status:"active",enabled:true,url:"https://www.careerjunction.co.za/jobs",countries:["ZA"],languages:["en"],captureMode:"http",renderRequired:false,priority:115,notes:"South African national job board; current job categories and individual vacancy pages."},
  {key:"ethiojobs",name:"Ethiojobs",type:"national",status:"active",enabled:true,url:"https://www.ethiojobs.net/",countries:["ET"],languages:["en"],captureMode:"http",renderRequired:false,priority:120,notes:"Ethiopian national jobs platform with private, public and NGO vacancies."},
  {key:"fuzu",name:"Fuzu",type:"pan_africa",status:"active",enabled:true,url:"https://www.fuzu.com/job",countries:["KE","NG","UG"],languages:["en"],captureMode:"http",renderRequired:false,priority:115,notes:"Country-scoped listings verified for Kenya, Nigeria and Uganda; each country resolves to its own landing page."},
  {key:"emploi_ma",name:"Emploi.ma",type:"national",status:"active",enabled:true,url:"https://www.emploi.ma/emploi",countries:["MA"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:115,notes:"Moroccan job board with current job and recruitment listings."},
  {key:"ajira_portal",name:"Public Service Recruitment Secretariat (Ajira Portal)",type:"institutional",status:"active",enabled:true,url:"https://portal.ajira.go.tz/vacancies",countries:["TZ"],languages:["en","sw"],captureMode:"http",renderRequired:false,priority:125,notes:"Official recruitment announcements. Exclude interview-call notices and placement results; job application is via the official recruitment portal."},
];
for (const source of RATISSAGE_WAVE_6_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((candidate) => candidate.key === source.key);
  if (index >= 0) SOURCE_REGISTRY[index] = source;
  else SOURCE_REGISTRY.push(source);
}

 
// Seventh-pass research: one further source is ready for immediate crawling;
// additional candidates remain discovery-only until extraction is verified.
const RATISSAGE_WAVE_7_SOURCES: SourceDefinition[] = [
  {key:"educarriere_ci",name:"Educarriere CI",type:"national",status:"active",enabled:true,url:"https://emploi.educarriere.ci/emploi/",countries:["CI"],languages:["fr"],captureMode:"http",renderRequired:false,priority:130,notes:"Ivorian job and internship listings; current offers show explicit publication dates and application deadlines."},
  {key:"dreamjob_ma",name:"Dreamjob.ma",type:"national",status:"discovered",enabled:false,url:"https://www.dreamjob.ma/emploi/",countries:["MA"],languages:["fr"],captureMode:"http",renderRequired:false,priority:90,notes:"Recent search index showed 1 Nov 2026 postings, but direct page extraction still displayed older August 2026 listings; validate before activation."},
  {key:"jobs_gov_so",name:"Somali National Job Portal",type:"institutional",status:"discovered",enabled:false,url:"https://jobs.gov.so/",countries:["SO"],languages:["en","so"],captureMode:"http",renderRequired:true,priority:105,notes:"Official Somali portal with recent vacancies and employer/category counts; direct HTML readability and country/location normalization need an extraction test."},
  {key:"tanitjobs",name:"Tanitjobs",type:"national",status:"discovered",enabled:false,url:"https://www.tanitjobs.com/jobs/",countries:["TN"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:100,notes:"Active Tunisian job board with listings dated 1 Nov 2026; current public-page crawler received HTTP 403 during research."},
  {key:"ethiopian_reporter_jobs",name:"Ethiopian Reporter Jobs",type:"national",status:"discovered",enabled:false,url:"https://www.ethiopianreporterjobs.com/",countries:["ET"],languages:["en","am"],captureMode:"http",renderRequired:false,priority:85,notes:"Current Ethiopian listings and deadlines, but page extraction contains substantial unrelated SEO content; qualify before activation."},
  {key:"mmo_emprego",name:"MMO Emprego",type:"national",status:"discovered",enabled:false,url:"https://emprego.mmo.co.mz/vagas/",countries:["MZ"],languages:["pt"],captureMode:"http",renderRequired:false,priority:95,notes:"Search index shows 33–39 current Mozambique listings; direct page request redirected to a historical closed vacancy, so validate routes before activation."},
  {key:"african_union_jobs",name:"African Union Careers",type:"institutional",status:"discovered",enabled:false,url:"https://jobs.au.int/?locale=fr_FR",countries:AFRICA_COUNTRIES.map((country)=>country.code),languages:["en","fr"],captureMode:"http",renderRequired:true,priority:110,notes:"Official continental jobs portal, but positions are embedded behind a search/iframe system; country attribution and direct extraction need a dedicated adapter."},
];
for (const source of RATISSAGE_WAVE_7_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((candidate) => candidate.key === source.key);
  if (index >= 0) SOURCE_REGISTRY[index] = source;
  else SOURCE_REGISTRY.push(source);
}

 
// Eighth-pass West African discovery. These are kept disabled until a live
// source-key/url/content-dedup smoke test qualifies them for production ingestion.
const RATISSAGE_WAVE_8_CANDIDATES: SourceDefinition[] = [
  {key:"emploi_benin",name:"Emploibenin.com",type:"national",status:"discovered",enabled:false,url:"https://www.emploibenin.com/recherche-jobs-benin",countries:["BJ"],languages:["fr"],captureMode:"http",renderRequired:false,priority:105,notes:"Current local offers dated 30 Oct 2026; some cards are tagged International, so country classification and cross-country dedup must be tested."},
  {key:"synergieplus_bj",name:"Synergie Plus Bénin",type:"national",status:"discovered",enabled:false,url:"https://synergieplus.net/public/index.php/recrutement",countries:["BJ"],languages:["fr"],captureMode:"http",renderRequired:false,priority:110,notes:"Current recruitment notices dated 28–30 Oct 2026, including a 75-position Benin Tourism campaign; test announcement-type filtering and detail URLs."},
  {key:"emploi_burkina",name:"Emploiburkina.com",type:"national",status:"discovered",enabled:false,url:"https://www.emploiburkina.com/",countries:["BF"],languages:["fr"],captureMode:"http",renderRequired:false,priority:95,notes:"Current local listings dated 30 Oct 2026; country/location filtering and dedup with AfricaTalents-family portals need validation."},
  {key:"emploi_mali",name:"Emploimali.com",type:"national",status:"discovered",enabled:false,url:"https://www.emploimali.com/",countries:["ML"],languages:["fr"],captureMode:"http",renderRequired:false,priority:95,notes:"Current local listings dated 26 Oct 2026; country/location filtering and dedup with AfricaTalents-family portals need validation."},
  {key:"opportafrik_ne",name:"Opportafrik Niger",type:"national",status:"discovered",enabled:false,url:"https://www.opportafrik.com/niger",countries:["NE"],languages:["fr"],captureMode:"http",renderRequired:false,priority:90,notes:"Current Niger opportunities with job posts and separate competitions, tenders and scholarships; requires opportunity-type filtering before activation."},
];
for (const source of RATISSAGE_WAVE_8_CANDIDATES) {
  const index = SOURCE_REGISTRY.findIndex((candidate) => candidate.key === source.key);
  if (index >= 0) SOURCE_REGISTRY[index] = source;
  else SOURCE_REGISTRY.push(source);
}

const RATISSAGE_WAVE_9_SOURCES: SourceDefinition[] = [
{key:"nelex_ng",name:"National Electronic Labour Exchange (NELEX)",type:"institutional",status:"active",enabled:true,url:"https://nelex.gov.ng/jobs",countries:["NG"],languages:["en"],captureMode:"http",renderRequired:false,priority:125,notes:"Official Nigerian Federal Ministry of Labour and Employment exchange. True publication and closing dates must be extracted; shared 62-day freshness and deadline filters apply."},
{key:"leep_jobs_ng",name:"LEEP Jobs Nigeria",type:"institutional",status:"discovered",enabled:false,url:"https://jobs.leep.gov.ng/jobs",countries:["NG"],languages:["en"],captureMode:"http",renderRequired:false,priority:110,notes:"Official labour-platform claim; jobs route timed out and may overlap NELEX. Disabled pending crawl and dedup."},
{key:"uemoa_careers",name:"UEMOA Carrières",type:"institutional",status:"discovered",enabled:false,url:"https://e-recrutement.uemoa.int/offers",countries:["BJ","BF","CI","GW","ML","NE","SN","TG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:110,notes:"Official regional recruitment portal; country-specific extraction unverified. Disabled to prevent cross-country misattribution."},
{key:"eafrica_connect",name:"East Africa ConnectHub Jobs",type:"aggregator",status:"discovered",enabled:false,url:"https://www.eafricaconnect.com/opportunities",countries:["BI","CD","KE","RW","SS","TZ","UG"],languages:["en"],captureMode:"http",renderRequired:false,priority:75,notes:"Jobs category distinct from tenders and scholarships; job subroute and country extraction unverified."},
{key:"pnpe_ga_offers",name:"PNPE Gabon — Offres d'emploi",type:"institutional",status:"discovered",enabled:false,url:"https://www.pnpe.ga/offres.php",countries:["GA"],languages:["fr"],captureMode:"http",renderRequired:false,priority:115,notes:"Official PNPE listings; reconcile against existing travail.ga and emploi.ga before activation."},
{key:"cawa_group_west",name:"CAWA Group — Offres Afrique de l'Ouest",type:"specialized",status:"discovered",enabled:false,url:"https://cawagroup.com/fr/offres-demploi/",countries:["BF","BJ","CI","GN","GW","ML","MR","SN","TG"],languages:["fr","en","pt"],captureMode:"http",renderRequired:false,priority:80,notes:"Multi-country agency; country must be inferred per job and old vacancies filtered. Disabled pending adapter and dedup."}
];
for (const source of RATISSAGE_WAVE_9_SOURCES) {
 const index=SOURCE_REGISTRY.findIndex(candidate=>candidate.key===source.key);
 if(index>=0) SOURCE_REGISTRY[index]=source; else SOURCE_REGISTRY.push(source);
}

/**
 * 101 HTTP-only candidates approved for the read-only source qualification queue.
 * They remain status="discovered" and enabled=false; this does not authorize
 * publication or production ingestion. Six browser/render-dependent candidates
 * remain outside this queue until a dedicated adapter is available.
 */
export const SHADOW_CRAWL_ELIGIBLE_SOURCE_KEYS = [
  "freshtalent",
  "jobaa",
  "africajobconnect",
  "taf4all",
  "novojob",
  "alerte_emploi",
  "jobra",
  "jobiro",
  "clbk",
  "edmatch",
  "careers_in_africa",
  "chantierpro",
  "affutjob",
  "marcheemploi",
  "vueradar",
  "jobsonline_africa",
  "akilibrain",
  "rekrute",
  "marocannonces",
  "coincarriere",
  "allojob",
  "alwadifa_maroc",
  "bghit_nekhdem",
  "wetech",
  "ejobs",
  "hotalents",
  "moncallcenter",
  "wuzzuf",
  "forasna",
  "tanqeeb",
  "hire_rung",
  "plegma",
  "jobgurus",
  "jobsinnigeria",
  "quicktojobs",
  "jobstark",
  "gradjobber",
  "xoooth",
  "digijob_guinee",
  "jobbissau",
  "jobinfocamer_extra",
  "africatalents",
  "jobartis",
  "corporate_staffing",
  "jobweb_kenya",
  "myjobsinkenya",
  "recruitfinds",
  "linkbase",
  "great_uganda_jobs",
  "jobweb_uganda",
  "job_adverts_uganda",
  "work_tz",
  "mshahara",
  "fadicy",
  "jobweb_rwanda",
  "umurimo",
  "jobs_in_rwanda_ai",
  "jobweb_ethiopia",
  "jobsethiopia",
  "worklink_ethiopia",
  "binasmart",
  "hornjobs",
  "comores_emploi",
  "jobmada",
  "myjob_mu",
  "hellojob_mu",
  "jobo_sc",
  "careers24",
  "jobmail",
  "bizcommunity",
  "freerecruit",
  "mzansi_jobs",
  "careers_portal",
  "offerzen",
  "vacancymail",
  "go_zambia_jobs",
  "jobweb_zambia",
  "great_zambia_jobs",
  "ntchito",
  "emploi_ml",
  "jobguinee",
  "emploi_gw",
  "jobsearch_gm",
  "jobartis_ao",
  "emprego_ao",
  "uemoa_careers",
  "malawi_education_recruitment",
  "malawi_health_opportunities",
  "dreamjob_ma",
  "tanitjobs",
  "ethiopian_reporter_jobs",
  "mmo_emprego",
  "emploi_benin",
  "synergieplus_bj",
  "emploi_burkina",
  "emploi_mali",
  "opportafrik_ne",
  "leep_jobs_ng",
  "eafrica_connect",
  "pnpe_ga_offers",
  "cawa_group_west",
] as const;

const shadowCrawlEligibleKeys = new Set<string>(SHADOW_CRAWL_ELIGIBLE_SOURCE_KEYS);
for (const source of SOURCE_REGISTRY) {
  if (!shadowCrawlEligibleKeys.has(source.key)) continue;
  if (source.status !== "discovered" || source.enabled || !source.url || source.captureMode !== "http" || source.renderRequired) {
    throw new Error(`Invalid shadow qualification candidate configuration: ${source.key}`);
  }
  source.shadowCrawlEligible = true;
}

export function getShadowCrawlEligibleSources(countryCode?: string): SourceDefinition[] {
  return SOURCE_REGISTRY.filter((source) => source.shadowCrawlEligible === true && (!countryCode || source.countries.includes(countryCode)));
}

export function getSourcesToWork(countryCode?: string): SourceDefinition[] {
  return SOURCE_REGISTRY.filter((source) =>
    ((source.status === "active" && source.enabled) || source.shadowCrawlEligible === true) &&
    (!countryCode || source.countries.includes(countryCode))
  );
}

export function getSourceByKey(key:string): SourceDefinition | null {
  return SOURCE_REGISTRY.find((source)=>source.key===key) ?? null;
}

export function getActiveSources(countryCode?:string): SourceDefinition[] {
  return SOURCE_REGISTRY
    .filter((source)=>source.enabled && source.status==="active" && (!countryCode || source.countries.includes(countryCode)))
    .sort((a,b)=>b.priority-a.priority || a.name.localeCompare(b.name));
}

export function getDiscoveredSources(countryCode?:string): SourceDefinition[] {
  return SOURCE_REGISTRY.filter((source)=>source.status==="discovered" && (!countryCode || source.countries.includes(countryCode)));
}

export function getRegistryStats() {
  const active=SOURCE_REGISTRY.filter((s)=>s.status==="active");
  const discovered=SOURCE_REGISTRY.filter((s)=>s.status==="discovered");
  const shadowCrawlEligibleSources=SOURCE_REGISTRY.filter((s)=>s.shadowCrawlEligible===true).length;
  const sourcesToWork=active.filter((s)=>s.enabled).length+shadowCrawlEligibleSources;
  const nonCameroon = AFRICA_COUNTRIES.filter(c=>c.code!=="CM").map(c=>c.code);
  const activeNonCameroon = active.filter(s=>s.countries.some(c=>c!=="CM"));
  const coverage = Object.fromEntries(nonCameroon.map(code => [code, activeNonCameroon.filter(s=>s.countries.includes(code)).length]));
  return {
    countries: AFRICA_COUNTRIES.length,
    nonCameroonCountries: nonCameroon.length,
    sources: SOURCE_REGISTRY.length,
    activeSources: active.length,
    discoveredSources: discovered.length,
    shadowCrawlEligibleSources,
    sourcesToWork,
    withUrl: SOURCE_REGISTRY.filter((s)=>Boolean(s.url)).length,
    renderSources: SOURCE_REGISTRY.filter((s)=>s.renderRequired).length,
    nonCameroonActiveSources: activeNonCameroon.length,
    countriesWithoutActiveSource: nonCameroon.filter(code=>coverage[code]===0),
    sourceCoverageByCountry: coverage,
    structuredSources: SOURCE_REGISTRY.filter((s)=>Boolean(s.structuredAdapter)).length,
  };
}
