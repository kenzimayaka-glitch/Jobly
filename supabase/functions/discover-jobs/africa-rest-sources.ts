import type { SourceDefinition, AfricaCountry } from "./source-registry.ts";

export type SourceAuditLevel = 1 | 2 | 3;
export type SourceChannelClass = "local" | "national" | "institutional" | "private" | "specialized" | "international";

export type AfricaRestSource = SourceDefinition & {
  auditLevel: SourceAuditLevel;
  channelClass: SourceChannelClass;
  countryHint?: string;
  checked: boolean;
  extractionStatus: "not_tested" | "accessible" | "inaccessible" | "accessible_extraction_failed";
};

const REST_CODES = [
  "DZ","EG","LY","MA","MR","TN",
  "BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG",
  "AO",
  "KE","UG","TZ","RW","ET","DJ","ER","SO","SS","SD","KM","MG","MU","SC",
  "ZA","ZM","ZW","MW","MZ","NA","BW","SZ","LS"
] as const;

const SLUGS: Record<string,string> = {
  DZ:"algeria", EG:"egypt", LY:"libya", MA:"morocco", MR:"mauritania", TN:"tunisia",
  BJ:"benin", BF:"burkina-faso", CV:"cape-verde", CI:"cote-divoire", GM:"gambia", GH:"ghana", GN:"guinea", GW:"guinea-bissau", LR:"liberia", ML:"mali", NE:"niger", NG:"nigeria", SN:"senegal", SL:"sierra-leone", TG:"togo",
  AO:"angola",
  KE:"kenya", UG:"uganda", TZ:"tanzania", RW:"rwanda", ET:"ethiopia", DJ:"djibouti", ER:"eritrea", SO:"somalia", SS:"south-sudan", SD:"sudan", KM:"comoros", MG:"madagascar", MU:"mauritius", SC:"seychelles",
  ZA:"south-africa", ZM:"zambia", ZW:"zimbabwe", MW:"malawi", MZ:"mozambique", NA:"namibia", BW:"botswana", SZ:"eswatini", LS:"lesotho"
};

const COUNTRY_NAMES: Record<string,string> = {
  DZ:"Algeria", EG:"Egypt", LY:"Libya", MA:"Morocco", MR:"Mauritania", TN:"Tunisia",
  BJ:"Benin", BF:"Burkina Faso", CV:"Cape Verde", CI:"Côte d'Ivoire", GM:"Gambia", GH:"Ghana", GN:"Guinea", GW:"Guinea-Bissau", LR:"Liberia", ML:"Mali", NE:"Niger", NG:"Nigeria", SN:"Senegal", SL:"Sierra Leone", TG:"Togo",
  AO:"Angola", KE:"Kenya", UG:"Uganda", TZ:"Tanzania", RW:"Rwanda", ET:"Ethiopia", DJ:"Djibouti", ER:"Eritrea", SO:"Somalia", SS:"South Sudan", SD:"Sudan", KM:"Comoros", MG:"Madagascar", MU:"Mauritius", SC:"Seychelles",
  ZA:"South Africa", ZM:"Zambia", ZW:"Zimbabwe", MW:"Malawi", MZ:"Mozambique", NA:"Namibia", BW:"Botswana", SZ:"Eswatini", LS:"Lesotho"
};

const PAN_AFRICA: SourceDefinition[] = [
  {key:"africarrieres_rest",name:"Africarrières — country feeds",type:"pan_africa",status:"active",enabled:true,url:"https://africarrieres.com/",countries:[...REST_CODES],languages:["fr","en","pt","ar"],captureMode:"http",renderRequired:false,priority:95,notes:"Country-specific feeds are discovered from the 54-country index; no artificial result cap."},
  {key:"unjobs_rest",name:"UNjobs — country duty stations",type:"institutional",status:"active",enabled:true,url:"https://unjobs.org/",countries:[...REST_CODES],languages:["en","fr"],captureMode:"http",renderRequired:false,priority:90,notes:"Country duty-station pages and pagination are crawled; professional/institutional opportunities only."},
  {key:"impactpool_rest",name:"Impactpool — country jobs",type:"specialized",status:"active",enabled:true,url:"https://www.impactpool.org/search/jobs",countries:[...REST_CODES],languages:["en","fr"],captureMode:"http",renderRequired:true,priority:80,notes:"International development / NGO / UN specialized channel."},
  {key:"jobaa_rest",name:"Jobaa — Africa country index",type:"pan_africa",status:"active",enabled:true,url:"https://jobaa.org/countries",countries:[...REST_CODES],languages:["en","fr"],captureMode:"http",renderRequired:false,priority:70,notes:"Country discovery and cross-country private channel."}
];

const LOCAL: Record<string, Array<[string,string,string,SourceChannelClass]>> = {
  DZ:[["anem_dz","ANEM Algérie","https://www.anem.dz/","institutional"],["emploitic_dz","Emploitic","https://emploitic.com/","private"]],
  EG:[["govjobs_eg","Egypt Government Jobs","https://jobs.caoa.gov.eg/","institutional"],["bayt_eg","Bayt Egypt","https://www.bayt.com/en/egypt/","private"],["wuzzuf_eg","Wuzzuf","https://wuzzuf.net/","private"]],
  LY:[["bayt_ly","Bayt Libya","https://www.bayt.com/en/libya/jobs/","private"]],
  MA:[["anapec_ma","ANAPEC","https://www.anapec.org/","institutional"],["rekrute_ma","ReKrute","https://www.rekrute.com/","private"],["emploi_ma_rest","Emploi.ma","https://www.emploi.ma/","private"]],
  MR:[["bayt_mr","Bayt Mauritania","https://www.bayt.com/en/mauritania/jobs/","private"]],
  TN:[["aneti_tn","ANETI","https://www.aneti.tn/","institutional"],["aneti_apply_tn","ANETI Appels à candidatures","https://candidatures.aneti.tn/","institutional"],["keejob_tn","Keejob","https://www.keejob.com/","private"],["tanitjobs_tn","Tanitjobs","https://www.tanitjobs.com/","private"]],
  BJ:[["emploi_bj","Emploi Bénin / Job boards locaux","https://africarrieres.com/benin/en/jobs","private"]],
  BF:[["emploi_bf","Emploi Burkina / Job boards locaux","https://africarrieres.com/burkina-faso/en/jobs","private"]],
  CV:[["emploi_cv","Emprego Cabo Verde / Africa feed","https://africarrieres.com/cape-verde/en/jobs","private"]],
  CI:[["emploi_ci","Emploi Côte d'Ivoire","https://africarrieres.com/cote-divoire/en/jobs","private"]],
  GM:[["emploi_gm","Jobs Gambia / Africa feed","https://africarrieres.com/gambia/en/jobs","private"]],
  GH:[["glmis_gh","Ghana Labour Market Information System","https://www.glmis.gov.gh/jobs","institutional"],["jobweb_gh_rest","JobWeb Ghana","https://jobwebghana.com/","private"],["myjobmag_gh","MyJobMag Ghana","https://www.myjobmag.com/","private"]],
  GN:[["emploi_gn","Emploi Guinée / Africa feed","https://africarrieres.com/guinea/en/jobs","private"]],
  GW:[["emploi_gw","Guinea-Bissau / Africa feed","https://africarrieres.com/guinea-bissau/en/jobs","private"]],
  LR:[["jobweb_lr","JobWeb Liberia","https://jobwebliberia.com/","private"]],
  ML:[["emploi_ml","Emploi Mali / Africa feed","https://africarrieres.com/mali/en/jobs","private"],["senjob_ml","Senjob / Mali opportunities","https://www.senjob.com/","specialized"]],
  NE:[["emploi_ne","Emploi Niger / Africa feed","https://africarrieres.com/niger/en/jobs","private"]],
  NG:[["jobberman_ng","Jobberman Nigeria","https://www.jobberman.com/","private"],["myjobmag_ng","MyJobMag Nigeria","https://www.myjobmag.com/","private"],["hotnigerianjobs_ng","HotNigerianJobs","https://www.hotnigerianjobs.com/","private"]],
  SN:[["senjob_sn","Senjob","https://www.senjob.com/","private"],["emploi_sn","Emploi Sénégal / Africa feed","https://africarrieres.com/senegal/en/jobs","private"]],
  SL:[["jobweb_sl","JobWeb Sierra Leone","https://jobwebsierraleone.com/","private"]],
  TG:[["emploi_tg","Emploi Togo / Africa feed","https://africarrieres.com/togo/en/jobs","private"]],
  AO:[["emprego_ao","Emprego Angola / Africa feed","https://africarrieres.com/angola/en/jobs","private"]],
  KE:[["brightermonday_ke","BrighterMonday Kenya","https://www.brightermonday.co.ke/","private"],["myjobmag_ke","MyJobMag Kenya","https://www.myjobmag.co.ke/","private"]],
  UG:[["brightermonday_ug","BrighterMonday Uganda","https://www.brightermonday.co.ug/","private"],["greatugandajobs","Great Uganda Jobs","https://www.greatugandajobs.com/","private"]],
  TZ:[["brightermonday_tz","BrighterMonday Tanzania","https://www.brightermonday.co.tz/","private"],["ajiraleo_tz","Ajira Portal Tanzania","https://portal.ajira.go.tz/","institutional"]],
  RW:[["jobweb_rw","JobWeb Rwanda","https://jobwebrwanda.com/","private"],["kigali_today_rw","Kigali Today Jobs","https://www.kigalitoday.com/","specialized"]],
  ET:[["ethiojobs_et","Ethiojobs","https://ethiojobs.net/jobs","private"],["ezega_et","Ezega Jobs","https://www.ezega.com/Jobs/","private"]],
  DJ:[["emploi_dj","Emploi Djibouti / Africa feed","https://africarrieres.com/djibouti/en/jobs","private"]],
  ER:[["emploi_er","Eritrea / Africa feed","https://africarrieres.com/eritrea/en/jobs","private"]],
  SO:[["emploi_so","Somalia / Africa feed","https://africarrieres.com/somalia/en/jobs","private"]],
  SS:[["emploi_ss","South Sudan / Africa feed","https://africarrieres.com/south-sudan/en/jobs","private"]],
  SD:[["emploi_sd","Sudan / Africa feed","https://africarrieres.com/sudan/en/jobs","private"]],
  KM:[["emploi_km","Comoros / Africa feed","https://africarrieres.com/comoros/en/jobs","private"]],
  MG:[["jobmada_mg","JobMada","https://www.jobmada.com/","private"],["emploi_mg","Madagascar / Africa feed","https://africarrieres.com/madagascar/en/jobs","private"]],
  MU:[["myjob_mu_rest","MyJob.mu","https://www.myjob.mu/","private"],["hellojob_mu_rest","HelloJob","https://hellojob.mu/","private"]],
  SC:[["jobo_sc_rest","JOBO Seychelles","https://www.jobo.sc/","private"]],
  ZA:[["gov_jobs_za","South African Government Jobs","https://www.gov.za/jobs","institutional"],["labour_jobs_za","Department of Employment and Labour Jobs","https://www.labour.gov.za/Vacancies/Pages/Vacancies-List.aspx","institutional"],["pnet_za","PNet","https://www.pnet.co.za/","private"],["careers24_za","Careers24","https://www.careers24.com/","private"],["careerjunction_za","CareerJunction","https://www.careerjunction.co.za/","private"]],
  ZM:[["jobs_zambia","Jobs Zambia","https://www.jobszambia.com/","private"],["jobweb_zm","JobWeb Zambia","https://jobwebzambia.com/","private"],["gozambiajobs_zm","GoZambiaJobs","https://gozambiajobs.com/","private"]],
  ZW:[["vacancymail_zw","VacancyMail","https://vacancymail.co.zw/","private"],["myjobmag_zw","MyJobMag Zimbabwe","https://www.myjobmag.co.zw/","private"]],
  MW:[["jobweb_mw","JobWeb Malawi","https://jobwebmalawi.com/","private"],["ntchito_mw","Ntchito","https://ntchito.com/","private"]],
  MZ:[["emprego_mz","Emprego Mozambique / Africa feed","https://africarrieres.com/mozambique/en/jobs","private"]],
  NA:[["careerjet_na","Careerjet Namibia","https://www.careerjet.com.na/","private"],["jobweb_na","JobWeb Namibia","https://jobwebnamibia.com/","private"]],
  BW:[["careerjet_bw","Careerjet Botswana","https://www.careerjet.co.bw/","private"],["jobweb_bw","JobWeb Botswana","https://jobwebbotswana.com/","private"]],
  SZ:[["jobs_eswatini","Jobs Eswatini","https://jobseswatini.com/","private"]],
  LS:[["gov_jobs_ls","Government Jobs Lesotho","https://www.gov.ls/","institutional"]]
};

function source(key:string,name:string,url:string,country:string,type:SourceDefinition["type"],channelClass:SourceChannelClass,priority:number):AfricaRestSource {
  return {
    key,name,type,status:"active",enabled:true,url,countries:[country],languages:["en","fr","pt","ar"],captureMode:"http",renderRequired:false,priority,
    auditLevel:2,channelClass,checked:true,extractionStatus:"not_tested",countryHint:COUNTRY_NAMES[country]
  };
}

export const AFRICA_REST_SOURCE_MATRIX: AfricaRestSource[] = [
  ...PAN_AFRICA.map(s=>({...s,auditLevel:2 as const,channelClass:(s.type==="institutional"?"institutional":s.type==="specialized"?"specialized":"international") as SourceChannelClass,checked:true,extractionStatus:"not_tested" as const})),
  ...REST_CODES.flatMap(country => (LOCAL[country] ?? []).map(([key,name,url,channel]) =>
    source(key,name,url,country,channel==="institutional"?"institutional":channel==="specialized"?"specialized":"aggregator",channel,100)
  ))
];

export const AFRICA_REST_COUNTRIES: AfricaCountry[] = REST_CODES.map(code => ({
  code,
  name: COUNTRY_NAMES[code],
  region: ["DZ","EG","LY","MA","MR","TN"].includes(code) ? "north" :
    ["BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG"].includes(code) ? "west" :
    code==="AO" ? "central" :
    ["KE","UG","TZ","RW","ET","DJ","ER","SO","SS","SD","KM","MG","MU","SC"].includes(code) ? "east" : "south",
  languages: ["DZ","EG","LY","MA","MR","TN"].includes(code) ? ["fr","ar"] :
    ["CV","GW","AO","MZ"].includes(code) ? ["pt","en"] :
    ["BJ","BF","CI","GN","ML","NE","SN","TG","MG","DJ"].includes(code) ? ["fr","en"] : ["en"]
}));

export function getRestAfricaSources(countryCode?:string): AfricaRestSource[] {
  return AFRICA_REST_SOURCE_MATRIX.filter(s=>!countryCode || s.countries.includes(countryCode));
}

export function getRestAfricaSourceAuditStats() {
  const countries = new Set(AFRICA_REST_SOURCE_MATRIX.flatMap(s=>s.countries)).size;
  const active = AFRICA_REST_SOURCE_MATRIX.filter(s=>s.enabled && s.status==="active").length;
  const byClass = Object.fromEntries(["local","national","institutional","private","specialized","international"].map(k=>[
    k, AFRICA_REST_SOURCE_MATRIX.filter(s=>s.channelClass===k).length
  ]));
  return {countries, sources:AFRICA_REST_SOURCE_MATRIX.length, activeSources:active, byClass};
}
