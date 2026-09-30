export type SourceType = "national" | "pan_africa" | "institutional" | "specialized" | "aggregator" | "company_careers" | "remote";
export type CaptureMode = "browser" | "http" | "api" | "rss" | "unknown";
export type SourceStatus = "active" | "discovered" | "blocked" | "degraded" | "retired";

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

// Q3 census control marker: exhaustive quarterly source discovery is maintained separately.\nconst PAN_AFRICA = ["CM","DZ","EG","LY","MA","MR","TN","BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG","CF","TD","CG","CD","GQ","GA","ST","BI","AO","KE","UG","TZ","RW","ET","DJ","ER","SO","SS","SD","KM","MG","MU","SC","ZA","ZM","ZW","MW","MZ","NA","BW","SZ","LS"];

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
  ] as Array<[string,string,SourceType]>).map(([key,name,type])=>({key,name,type,status:"discovered" as const,enabled:false,countries:PAN_AFRICA,languages:["en","fr","pt","ar"],captureMode:"unknown" as const,renderRequired:false,priority:10,notes:"Découverte V3; URL, pays exacts et méthode d'accès à qualifier avant activation."})),
];


const AFRICA_CENSUS_Q3_A: SourceDefinition[] = [{key:"africarrieres_q3",name:"Africarrières",type:"pan_africa",status:"active",enabled:true,url:"https://"+"africarrieres.com/",countries:PAN_AFRICA,languages:["fr","en"],captureMode:"http",renderRequired:false,priority:95}];
for (const source of AFRICA_CENSUS_Q3_A) SOURCE_REGISTRY.push(source);

const AFRICA_CENSUS_Q3_B: SourceDefinition[] = [
  {key:"freshtalent_q3",name:"FreshTalent Africa",type:"pan_africa",status:"active",enabled:true,url:"https://"+"freshtalent.africa/",countries:PAN_AFRICA,languages:["en","fr","pt","sw","ar"],captureMode:"http",renderRequired:false,priority:94},
  {key:"jobaa_q3",name:"Jobaa",type:"pan_africa",status:"active",enabled:true,url:"https://"+"jobaa.org/countries",countries:PAN_AFRICA,languages:["en","fr","pt","ar"],captureMode:"http",renderRequired:false,priority:88},
  {key:"careerlink_africa_q3",name:"CareerLink Africa",type:"pan_africa",status:"active",enabled:true,url:"https://"+"www.careerlinkafrica.com/",countries:["NG","KE","ZA","GH","EG","ET","MA","UG","TZ","RW","SN","CI","CM","ZM","ZW"],languages:["en","fr"],captureMode:"http",renderRequired:false,priority:85},
  {key:"perican_q3",name:"Perican",type:"remote",status:"active",enabled:true,url:"https://"+"perican.africa/",countries:PAN_AFRICA,languages:["en"],captureMode:"http",renderRequired:false,priority:75}
];
for (const source of AFRICA_CENSUS_Q3_B) SOURCE_REGISTRY.push(source);

const AFRICA_CENSUS_Q3_C: SourceDefinition[] = [
  {key:"mapage_africa_q3",name:"MaPage Africa",type:"aggregator",status:"active",enabled:true,url:"https://"+"mapage.africa/index.php/opportunities?cat=jobs&lang=en",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:false,priority:72},
  {key:"emploitic_dz_q3",name:"Emploitic Algérie",type:"national",status:"active",enabled:true,url:"https://"+"emploitic.com/offres-d-emploi",countries:["DZ"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:125},
  {key:"wuzzuf_eg_q3",name:"Wuzzuf Egypt",type:"national",status:"active",enabled:true,url:"https://"+"wuzzuf.net/search/jobs",countries:["EG"],languages:["en","ar"],captureMode:"http",renderRequired:false,priority:125},
  {key:"rekrute_ma_q3",name:"ReKrute Maroc",type:"national",status:"active",enabled:true,url:"https://"+"www.rekrute.com/fr/offres-emploi-maroc.html",countries:["MA"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:120}
];
for (const source of AFRICA_CENSUS_Q3_C) SOURCE_REGISTRY.push(source);

const AFRICA_CENSUS_Q3_D: SourceDefinition[] = [
  {key:"emploi_ma_q3",name:"Emploi.ma",type:"national",status:"active",enabled:true,url:"https://"+"www.emploi.ma/recherche-jobs-maroc",countries:["MA"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:118},
  {key:"tanitjobs_tn_q3",name:"Tanitjobs Tunisie",type:"national",status:"active",enabled:true,url:"https://"+"www.tanitjobs.com/jobs/",countries:["TN"],languages:["fr","ar"],captureMode:"http",renderRequired:false,priority:120},
  {key:"brightermonday_ke_q3",name:"BrighterMonday Kenya",type:"national",status:"active",enabled:true,url:"https://"+"www.brightermonday.co.ke/jobs",countries:["KE"],languages:["en"],captureMode:"http",renderRequired:false,priority:120},
  {key:"brightermonday_ug_q3",name:"BrighterMonday Uganda",type:"national",status:"active",enabled:true,url:"https://"+"www.brightermonday.co.ug/jobs",countries:["UG"],languages:["en"],captureMode:"http",renderRequired:false,priority:120}
];
for (const source of AFRICA_CENSUS_Q3_D) SOURCE_REGISTRY.push(source);

const AFRICA_CENSUS_Q3_E: SourceDefinition[] = [
  {key:"fuzu_ug_q3",name:"Fuzu Uganda",type:"national",status:"active",enabled:true,url:"https://"+"www.fuzu.com/uganda",countries:["UG"],languages:["en"],captureMode:"http",renderRequired:false,priority:105},
  {key:"ethiojobs_et_q3",name:"Ethiojobs",type:"national",status:"active",enabled:true,url:"https://"+"ethiojobs.net/jobs",countries:["ET"],languages:["en","am"],captureMode:"http",renderRequired:false,priority:120},
  {key:"pnet_za_q3",name:"PNet South Africa",type:"national",status:"active",enabled:true,url:"https://"+"www.pnet.co.za/",countries:["ZA"],languages:["en"],captureMode:"http",renderRequired:false,priority:120},
  {key:"gozambiajobs_zm_q3",name:"Go Zambia Jobs",type:"national",status:"active",enabled:true,url:"https://"+"gozambiajobs.com/jobs",countries:["ZM"],languages:["en"],captureMode:"http",renderRequired:false,priority:115},
  {key:"vacancymail_zw_q3",name:"VacancyMail Zimbabwe",type:"national",status:"active",enabled:true,url:"https://"+"vacancymail.co.zw/jobs/",countries:["ZW"],languages:["en"],captureMode:"http",renderRequired:false,priority:115}
];
for (const source of AFRICA_CENSUS_Q3_E) SOURCE_REGISTRY.push(source);

// Central Africa V1 — sources qualified during the country-by-country web audit.
// Cameroon is intentionally excluded from this rollout.
const CENTRAL_AFRICA_INTERNATIONAL: SourceDefinition[] = [
  {key:"reliefweb",name:"ReliefWeb Jobs",type:"institutional",status:"active",enabled:true,url:"https://reliefweb.int/jobs",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:false,priority:80},
  {key:"unjobs",name:"UNjobs",type:"institutional",status:"active",enabled:true,url:"https://unjobs.org/",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:false,priority:80},
  {key:"impactpool",name:"Impactpool",type:"specialized",status:"active",enabled:true,url:"https://www.impactpool.org/jobs",countries:PAN_AFRICA,languages:["en","fr"],captureMode:"http",renderRequired:true,priority:70}
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
  {key:"onem_app_cd",name:"ONEM RDC — application",type:"institutional",status:"active",enabled:true,url:"https://www.app.onem.cd/demandeurs-demploi/offres-demploi",countries:["CD"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120},
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

for (const override of [...CENTRAL_AFRICA_INTERNATIONAL, ...CENTRAL_AFRICA_SOURCES]) {
  const index = SOURCE_REGISTRY.findIndex((source) => source.key === override.key);
  if (index >= 0) SOURCE_REGISTRY[index] = override;
  else SOURCE_REGISTRY.push(override);
}





// West Africa V1 — country-by-country qualified sources from the second audit layer.
const WEST_AFRICA_SOURCES: SourceDefinition[] = [
  {key:"anpe_bj",name:"ANPE Bénin",type:"institutional",status:"active",enabled:true,url:"https://anpe.bj/",countries:["BJ"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120,notes:"Service public de l'emploi; portail officiel et offres vérifiées."},
  {key:"sica_anpe_bj",name:"SICA ANPE Bénin",type:"institutional",status:"active",enabled:true,url:"https://sica.anpe.bj/portail-offres",countries:["BJ"],languages:["fr"],captureMode:"browser",renderRequired:true,priority:125,notes:"Portail d'offres JS; à traiter par navigateur pour la récolte complète."},
  {key:"gouv_bj_emploi",name:"Gouvernement du Bénin — Offres d'emploi",type:"institutional",status:"active",enabled:true,url:"https://www.gouv.bj/opportunites/offres-emploi/1/",countries:["BJ"],languages:["fr"],captureMode:"http",renderRequired:false,priority:115},
  {key:"iefp_cv",name:"IEFP / PEPE Cabo Verde",type:"institutional",status:"active",enabled:true,url:"https://pepe.iefp.cv/frontend/web/pt/site/oferta-emprego",countries:["CV"],languages:["pt"],captureMode:"http",renderRequired:false,priority:120},
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
  {key:"hrjobs_liberia",name:"HR Jobs Liberia",type:"institutional",status:"active",enabled:true,url:"https://hrjobsliberia.com/",countries:["LR"],languages:["en"],captureMode:"http",renderRequired:false,priority:120},
  {key:"malijob",name:"MaliJob",type:"national",status:"active",enabled:true,url:"https://www.malijob.com/",countries:["ML"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100},
  {key:"emploi_ml",name:"Emploi.ml",type:"national",status:"discovered",enabled:false,url:"https://www.emploi.ml/",countries:["ML"],languages:["fr"],captureMode:"http",renderRequired:false,priority:90,notes:"À qualifier au prochain smoke crawl."},
  {key:"anpe_bf",name:"ANPE Burkina Faso",type:"institutional",status:"discovered",enabled:false,url:"https://anpe.bf/",countries:["BF"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120,notes:"URL institutionnelle candidate; activation après smoke audit."},
  {key:"anpe_ne",name:"ANPE Niger",type:"institutional",status:"discovered",enabled:false,url:"https://anpe.ne/",countries:["NE"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120,notes:"URL institutionnelle candidate; activation après smoke audit."},
  {key:"anpetogo",name:"ANPE Togo",type:"institutional",status:"discovered",enabled:false,url:"https://anpetogo.org/",countries:["TG"],languages:["fr"],captureMode:"http",renderRequired:false,priority:120,notes:"URL institutionnelle candidate; activation après smoke audit."},
  {key:"jobguinee",name:"GuineeJob",type:"national",status:"discovered",enabled:false,url:"https://www.guineejob.com/",countries:["GN"],languages:["fr"],captureMode:"http",renderRequired:false,priority:100,notes:"À qualifier par accessibilité et fraîcheur."},
  {key:"emploi_gw",name:"IEFP Guinea-Bissau",type:"institutional",status:"discovered",enabled:false,url:"https://iefp.gw/",countries:["GW"],languages:["pt"],captureMode:"http",renderRequired:false,priority:100,notes:"À qualifier; portail institutionnel candidat."},
  {key:"jobsearch_gm",name:"Gambia JobSearch",type:"national",status:"discovered",enabled:false,url:"https://jobsearch.gm/",countries:["GM"],languages:["en"],captureMode:"http",renderRequired:false,priority:100,notes:"À qualifier par smoke crawl."},
  {key:"jobartis_ao",name:"Jobartis Angola",type:"national",status:"discovered",enabled:false,url:"https://www.jobartis.com/",countries:["AO"],languages:["pt"],captureMode:"http",renderRequired:false,priority:110,notes:"Angola traité dans le lot lusophone; activation après audit d'accès."},
  {key:"emprego_ao",name:"Emprego.co.ao",type:"national",status:"discovered",enabled:false,url:"https://www.emprego.co.ao/",countries:["AO"],languages:["pt"],captureMode:"http",renderRequired:false,priority:105,notes:"À qualifier par smoke crawl."},
  {key:"fne_west",name:"FNE/ANPE/Services publics — West Africa discovery",type:"institutional",status:"discovered",enabled:false,url:"",countries:["BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG"],languages:["fr","en","pt"],captureMode:"unknown",renderRequired:false,priority:60,notes:"Placeholder de contrôle; ne doit jamais être récolté comme URL."}
];

for (const override of WEST_AFRICA_SOURCES) {
  const index = SOURCE_REGISTRY.findIndex((source) => source.key === override.key);
  if (index >= 0) SOURCE_REGISTRY[index] = override;
  else SOURCE_REGISTRY.push(override);
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
  return {
    countries: AFRICA_COUNTRIES.length,
    sources: SOURCE_REGISTRY.length,
    activeSources: active.length,
    discoveredSources: discovered.length,
    withUrl: SOURCE_REGISTRY.filter((s)=>Boolean(s.url)).length,
    renderSources: SOURCE_REGISTRY.filter((s)=>s.renderRequired).length,
    structuredSources: SOURCE_REGISTRY.filter((s)=>Boolean(s.structuredAdapter)).length,
  };
}
