import { fetchStructuredSource } from "./sources.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const NORMALIZED_VERSION = "jobly-offer-v1";

type NormalizedOffer = {
  version: string; title: string | null; company: string | null; location: string[];
  region: string | null; sector: string | null; contractType: string | null; remoteMode: string | null;
  salary: { min: number | null; max: number | null; currency: string | null };
  experience: string[]; education: string[]; skills: string[]; qualities: string[];
  missions: string[]; benefits: string[]; description: string[]; application: string[];
  deadline: string | null; source: { name: string; url: string }; qualityScore: number | null; flags: string[];
};

function normalize(value:string):string {
  return repairMojibake(decodeEntities(value||"")).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9@.+#/_ -]+/g," ").replace(/\s+/g," ").trim();
}

function cleanHumanText(value:string):string {
  let text=String(value||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"\n")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,"\n")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,"\n")
    .replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi,"\n")
    .replace(/window\.(?:dataLayer|gtag|fbq)\s*\([^\n]*\)?[;]?/gi,"\n")
    .replace(/(?:^|\n)\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=.*(?:\n|$)/g,"\n")
    .replace(/<[^>]+>/g," ");
  return repairMojibake(decodeEntities(text))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g," ")
    .replace(/\uFFFD+/g," ").replace(/\r/g,"")
    .replace(/[ \t]+\n/g,"\n").replace(/\n[ \t]+/g,"\n")
    .replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}

function fallbackNormalized(item:any):NormalizedOffer {
  const raw=cleanHumanText(String(item.description||""));
  const sections:Record<string,string[]>={description:[],missions:[],profile:[],formation:[],experience:[],skills:[],qualities:[],benefits:[],application:[]};
  const aliases:Record<string,string>={
    mission:"missions",missions:"missions",responsabilites:"missions","responsabilites principales":"missions",taches:"missions",
    profil:"profile","profil recherche":"profile","profil du candidat":"profile",exigences:"profile",qualifications:"profile",
    formation:"formation",formations:"formation",diplome:"formation",diplomes:"formation",etudes:"formation",
    experience:"experience","experience professionnelle":"experience",competence:"skills",competences:"skills","competences techniques":"skills","savoir faire":"skills",
    qualite:"qualities",qualites:"qualities","savoir etre":"qualities",avantage:"benefits",avantages:"benefits","ce que nous offrons":"benefits","conditions de travail":"benefits",
    candidature:"application","pour postuler":"application","modalites de candidature":"application","comment postuler":"application","documents a fournir":"application","documents a joindre":"application"
  };
  let current="description";
  for(const line of raw.split(/\n+/).map(x=>x.trim()).filter(Boolean)){
    const m=line.match(/^(.{2,80}?)\s*[:：]\s*(.+)$/); const key=m?normalize(m[1]):normalize(line);
    if(aliases[key]){current=aliases[key];if(m?.[2])sections[current].push(m[2].trim());continue;}
    if(/^(missions|responsabilites|taches|profil|formation|experience|competences|qualites|avantages|candidature|pour postuler|description)$/.test(key))continue;
    sections[current].push(line);
  }
  const cleanArray=(xs:string[])=>Array.from(new Set(xs.map(x=>cleanHumanText(x)).filter(x=>x.length>=2))).slice(0,40);
  return {version:NORMALIZED_VERSION,title:cleanHumanText(String(item.title||""))||null,company:cleanHumanText(String(item.company||""))||null,
    location:item.location?String(item.location).split(/[,;|]/).map((x:string)=>cleanHumanText(x)).filter(Boolean):[],region:null,sector:null,
    contractType:inferContract(raw),remoteMode:inferRemote(raw),salary:{min:null,max:null,currency:"XAF"},
    experience:Array.from(new Set([...cleanArray(sections.experience),...extractExperience(raw)])).slice(0,10),education:cleanArray(sections.formation),skills:cleanArray(sections.skills),qualities:cleanArray(sections.qualities),
    missions:cleanArray(sections.missions),benefits:cleanArray(sections.benefits),description:cleanArray(sections.description),application:Array.from(new Set([...cleanArray(sections.application),...extractApplication(raw)])).slice(0,12),
    deadline:item.deadline||null,source:{name:String(item.source||""),url:String(item.url||"")},qualityScore:null,flags:[]};
}

function normalizeAiResult(ai:any,item:any):NormalizedOffer {
  const base=fallbackNormalized(item);
  const arr=(v:any)=>Array.isArray(v)?v.map((x:any)=>cleanHumanText(String(x))).filter((x:string)=>x.length>=2).slice(0,40):[];
  const n=(v:any)=>Number.isFinite(Number(v))?Number(v):null; const s=ai?.sections||{};
  return {...base,title:cleanHumanText(String(ai?.title||base.title||""))||null,company:cleanHumanText(String(ai?.company||base.company||""))||null,
    location:arr(ai?.location).length?arr(ai.location):base.location,region:cleanHumanText(String(ai?.region||""))||null,sector:cleanHumanText(String(ai?.sector||""))||null,
    contractType:cleanHumanText(String(ai?.contractType||base.contractType||""))||null,remoteMode:cleanHumanText(String(ai?.remoteMode||base.remoteMode||""))||null,
    salary:{min:n(ai?.salaryMin),max:n(ai?.salaryMax),currency:cleanHumanText(String(ai?.salaryCurrency||"XAF"))||"XAF"},
    experience:arr(s.experience).length?arr(s.experience):base.experience,education:arr(s.education).length?arr(s.education):base.education,
    skills:arr(s.skills).length?arr(s.skills):base.skills,qualities:arr(s.qualities).length?arr(s.qualities):base.qualities,
    missions:arr(s.missions).length?arr(s.missions):base.missions,benefits:arr(s.benefits).length?arr(s.benefits):base.benefits,
    description:arr(s.description).length?arr(s.description):base.description,application:arr(s.application).length?arr(s.application):base.application,
    deadline:ai?.deadline||base.deadline,qualityScore:n(ai?.qualityScore),flags:arr(ai?.flags)};
}


const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const SOURCES = [
  { key: "emploi_cm", name: "Emploi.cm", url: "https://www.emploi.cm/recherche-jobs-cameroun", enabled: true },
  { key: "emplois_cameroun", name: "Emplois Cameroun", url: "https://emploiscameroun.com/offres/", enabled: true },
  { key: "jobincamer", name: "Job in Cameroun", url: "https://www.jobincamer.com/adverts/jobs", enabled: true },
  { key: "jobinfocamer", name: "JobInfoCamer", url: "https://www.jobinfocamer.com/", enabled: true },
  { key: "infosconcourseducation", name: "Infos Concours Education", url: "https://infosconcourseducation.com/category/offre-demploiss/", enabled: true },
  { key: "fne", name: "FNE Cameroun", url: "https://www.fnecm.org/", enabled: true },
  { key: "reliefweb", name: "ReliefWeb", url: "https://reliefweb.int/jobs?advanced-search=%28Cameroun%29", enabled: true },
  { key: "unjobs", name: "UNjobs", url: "https://unjobs.org/duty_stations/cameroon", enabled: true },
  { key: "impactpool", name: "Impactpool", url: "https://www.impactpool.org/jobs?location=Cameroon", enabled: true },
  // Structured feeds/APIs — activated when the corresponding credential is configured.
  { key: "minajobs_rss", name: "MinaJobs RSS", url: "https://cm2024.minajobs.net/rss", enabled: true },
  { key: "techmap_cm", name: "Techmap CM", url: "https://api.techmap.io/", enabled: true },
  { key: "jobspipe_cm", name: "JobsPipe CM", url: "https://api.jobspipe.dev/v1/jobs/search", enabled: true },
  { key: "jooble_cm", name: "Jooble CM", url: "https://jooble.org/api/", enabled: true },
  // ONG / humanitaire / développement international — agrégateurs spécialisés
  { key: "idealists", name: "Idealist", url: "https://www.idealist.org/en/jobs", enabled: true },
  { key: "devex", name: "Devex Jobs", url: "https://www.devex.com/jobs", enabled: true },
  { key: "devnetjobs", name: "DevNetJobs", url: "https://devnetjobs.org/", enabled: true },
  { key: "unjobnet", name: "UNjobnet", url: "https://www.unjobnet.org/", enabled: true },
  // Portails officiels d'organisations internationales / agences ONU
  { key: "un_careers", name: "UN Careers", url: "https://careers.un.org/", enabled: true },
  { key: "undp_jobs", name: "UNDP Jobs", url: "https://jobs.undp.org/", enabled: true },
  { key: "unicef_jobs", name: "UNICEF Careers", url: "https://jobs.unicef.org/", enabled: true },
  { key: "linkedin", name: "LinkedIn", url: "https://www.linkedin.com/jobs/jobs-in-cameroon", enabled: false },
  { key: "indeed", name: "Indeed", url: "https://cm.indeed.com/jobs?q=&l=Cameroon", enabled: false },
  { key: "glassdoor", name: "Glassdoor", url: "https://www.glassdoor.com/Job/cameroon-jobs-SRCH_IL.0,8_IN35.htm", enabled: false },
];
const CITY_NAMES=["Yaoundé","Douala","Bafoussam","Bamenda","Bertoua","Buea","Ebolowa","Garoua","Maroua","Ngaoundéré","Kribi","Limbe","Kousseri","Mbalmayo","Edéa","Dschang","Foumban","Limbé","Kumba","Kumbo","Nkongsamba","Tiko","Cameroon","Tout le Cameroun"];
function decodeEntities(s:string){return s.replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&bull;|&#8226;/gi,"•").replace(/&ndash;|&#8211;/gi,"–").replace(/&mdash;|&#8212;/gi,"—");}
function repairMojibake(s:string){if(!/(?:Ã.|Â.|â.)/.test(s))return s;try{const bytes=new Uint8Array([...s].map(ch=>ch.charCodeAt(0)<=255?ch.charCodeAt(0):63));const repaired=new TextDecoder("utf-8",{fatal:false}).decode(bytes);return repaired&&!repaired.includes("�")?repaired:s}catch{return s}}
function clean(s:string|null|undefined){return repairMojibake(decodeEntities((s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()))}
function cleanDescription(s:string|null|undefined){if(!s)return "";const text=repairMojibake(decodeEntities(String(s).replace(/<br\s*\/?>(?=.)/gi,"\n").replace(/<\/(p|div|section|article|li|h[1-6])>/gi,"\n").replace(/<li[^>]*>/gi,"• ").replace(/<[^>]+>/g," ").replace(/\r/g,"")));return text.replace(/[ \t]+\n/g,"\n").replace(/\n[ \t]+/g,"\n").replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim()}
function absolute(base:string,href:string){try{return new URL(href,base).toString()}catch{return href}}
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function inferContract(text:string){const t=text.toLowerCase();if(/\bcdi\b|permanent|full[- ]?time/.test(t))return"CDI";if(/\bcdd\b|temporary|contract/.test(t))return"CDD";if(/stage|internship|intern/.test(t))return"STAGE";if(/freelance/.test(t))return"FREELANCE";return"AUTRE"}
function inferRemote(text:string){const t=text.toLowerCase();if(/remote|télétravail|teletravail/.test(t)&&/hybrid|hybride/.test(t))return"PARTIAL";if(/remote|télétravail|teletravail/.test(t))return"YES";return"NO"}
function inferCity(text:string){const t=text.toLowerCase();return CITY_NAMES.find(c=>t.includes(c.toLowerCase()))||"Cameroon"}
function inferCompany(text:string){const t=clean(text);const m=t.match(/^(.+?)\s+(?:recrute|is hiring|recruits)\b/i);return m?.[1]?.trim()||""}
function inferExperience(text:string){const m=text.match(/(\d+)\s*(?:\+|à|-)\s*(?:\d+)?\s*(?:ans?|years?)/i);return m?Number(m[1]):0}
function extractExperience(text:string):string[]{const out:string[]=[];const patterns=[/(?:au moins|minimum|minimale?|minimum de)\s+(\d+)\s*(?:ans?|years?)/gi,/(\d+)\s*(?:\+|à|-)\s*(?:\d+)?\s*(?:ans?|years?)/gi,/(?:expérience|experience)\s*(?:professionnelle)?\s*[:：-]?\s*([^\n.;]{3,90})/gi];for(const re of patterns){for(const m of text.matchAll(re)){const v=cleanHumanText(String(m[0]||m[1]||"")).trim();if(v.length>=3)out.push(v)}}return Array.from(new Set(out)).slice(0,10)}
function extractApplication(text:string):string[]{const out:string[]=[];const emails=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];for(const e of emails)out.push("Email : "+e);const urls=text.match(/https?:\/\/[^\s<>\"']+/gi)||[];for(const u of urls)if(!/facebook|instagram|youtube|linkedin|twitter|google\./i.test(u))out.push("Lien : "+u.replace(/[),.;]+$/,""));const phones=extractPhone(text);for(const p of phones)out.push("Téléphone : "+p);const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);for(const line of lines)if(/postuler|candidature|envoyer.*cv|déposer.*cv|deposer.*cv|apply|application|pour postuler/i.test(line)&&line.length<300)out.push(cleanHumanText(line));return Array.from(new Set(out)).slice(0,12)}
function inferOpportunityType(item:any):"EMPLOI"|"CONCOURS"|"FORMATION"|"RECRUTEMENT_INSUFFISANT"{
  const title=String(item.title||"");
  const description=String(item.description||"");
  const titleText=normalize(title);
  const text=normalize(title+" "+description);
  const campusTitle=/\b(concours|admission|examen d'?entree|test d'?entree|formation|certification|masterclass|bootcamp|bourse|programme de formation|atelier de formation|webinaire de formation)\b/.test(titleText);
  if(campusTitle){
    if(/\b(concours|admission|examen d'?entree|test d'?entree)\b/.test(titleText)) return "CONCOURS";
    return "FORMATION";
  }
  const roleSignal=/\b(agent|assistant|assistante|commercial|commerciale|manager|responsable|technicien|technicienne|chauffeur|vendeur|vendeuse|comptable|ingenieur|ingenieure|developpeur|developpeuse|marketing|rh|ressources humaines|charge de|chef de|directeur|directrice|consultant|consultante|coordinateur|coordinatrice|superviseur|superviseuse|stagiaire|stage|intern|offre d'emploi|emploi|poste|data analyst|operations manager)\b/.test(text);
  const campusSignal=/\b(concours|admission|examen d'?entree|test d'?entree|formation|certification|masterclass|bootcamp|cours|bourse d'?etude|programme de formation)\b/.test(text);
  if(campusSignal && !roleSignal){
    if(/concours|admission|examen d'?entree|test d'?entree/.test(text)) return "CONCOURS";
    return "FORMATION";
  }
  const genericRecruitment=/\b(recrutement|recrute)\b|appel a candidatures?|appel a candidature|campagne de recrutement/.test(titleText);
  const explicitRoleInTitle=/\b(agent|assistant|assistante|commercial|commerciale|manager|responsable|technicien|technicienne|chauffeur|vendeur|vendeuse|comptable|ingenieur|ingenieure|developpeur|developpeuse|marketing|rh|charge de|chef de|directeur|directrice|consultant|consultante|coordinateur|coordinatrice|superviseur|superviseuse|stagiaire|stage|intern|emploi|poste)\b/.test(titleText);
  const companySignal=Boolean(String(item.company||"").trim()) || /\b(societe|entreprise|cabinet|organisation|ong|groupe|holding|compagnie|agence)\b/.test(text);
  const applicationSignal=/@|https?:\/\/|postuler|candidature|envoyer (?:votre|son) cv|deposer (?:votre|son) cv|apply|application|contactez|contact/.test(text);
  const substantiveDescription=description.trim().length>=180;
  if(genericRecruitment && !explicitRoleInTitle && !roleSignal && (!companySignal || (!applicationSignal && !substantiveDescription))) return "RECRUTEMENT_INSUFFISANT";
  // A discovery record is not eligible for Jobly Offres until its source\n  // provides a substantive job description. Weak snippets remain stored for\n  // Campus/recovery workflows but are never exposed as employment offers.\n  if(description.trim().length<180) return "RECRUTEMENT_INSUFFISANT";
  return "EMPLOI";
}

function offerQuality(row:any):number {
  const description=String(row.description||"").trim();
  const nc=row.normalizedContent||{};
  const sections=["missions","profile","education","experience","skills","qualities","benefits","application","description"];
  const sectionCount=sections.reduce((n,k)=>n+(Array.isArray(nc?.[k])?nc[k].length:0),0);
  const title=String(row.title||"").trim().length>=4?10:0;
  const company=row.companyId?8:(String(row.company||"").trim()?5:0);
  const body=Math.min(45,Math.floor(description.length/40));
  const structure=Math.min(30,sectionCount*2);
  const quality=Number(row.aiQualityScore);
  const ai=Number.isFinite(quality)?Math.max(0,Math.min(100,quality))*0.25:0;
  return Math.round(title+company+body+structure+ai);
}
function extractPhone(text:string){const matches=text.match(/(?:\+?237[\s.-]?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|6[5-9]\d{7})/g)||[];return matches.map(x=>x.replace(/[\s.-]/g,"")).map(x=>x.startsWith("237")?"+"+x:"+237"+x).filter((x,i,a)=>a.indexOf(x)===i).slice(0,3)}
function extractLinks(html:string,base:string){const out:string[]=[];const re=/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;while((m=re.exec(html))&&out.length<80){const href=absolute(base,m[1]);const label=clean(m[2]);if(label.length>=5&&!/^javascript:/i.test(href)&&!href.includes("#"))out.push(href)}return[...new Set(out)]}
function extractJsonLd(html:string){const jobs:any[]=[];const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(html))){try{const parsed=JSON.parse(m[1]);for(const x of(Array.isArray(parsed)?parsed:[parsed]))if(x?.['@type']==='JobPosting')jobs.push(x)}catch{}}return jobs}
function isLikelyJobUrl(sourceKey:string,url:string){if(sourceKey==="emplois_cameroun")return /emploiscameroun\.com\/offre\//i.test(url);if(sourceKey==="jobincamer")return /jobincamer\.com\/job\//i.test(url);if(sourceKey==="jobinfocamer")return /jobinfocamer\.com\/job\//i.test(url);if(sourceKey==="emploi_cm")return /emploi\.cm/i.test(url)&&(/job=/i.test(url)||/offre|emploi|recrut/i.test(url));return /job|emploi|offre|advert|career|vacan|recruit|recrut|jobs\//i.test(url)}
function parseListing(html:string,base:string,sourceKey:string){const items:any[]=[];for(const j of extractJsonLd(html))items.push({title:clean(j.title),description:cleanDescription(j.description),company:clean(j.hiringOrganization?.name),website:clean(j.hiringOrganization?.url||j.hiringOrganization?.sameAs)||null,location:clean(j.jobLocation?.address?.addressLocality||j.jobLocation?.name),url:j.url||base,deadline:j.validThrough||null,published:j.datePosted||null});for(const url of extractLinks(html,base)){if(!isLikelyJobUrl(sourceKey,url))continue;if(items.some(x=>x.url===url))continue;items.push({title:"",description:"",company:"",location:"",url,deadline:null,published:null})}return items.slice(0,60)}
async function fetchText(url:string){const r=await fetch(url,{headers:{"user-agent":"JOBLY-Discovery/2.0","accept":"text/html,application/xhtml+xml"},redirect:"follow"});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.text()}
function needsSourceRefresh(item:any):boolean {
  const description=String(item.description||"");
  if(description.length<180) return true;
  if(/(?:�|Ã.|Â.|â.|\bIng\s+nieur\b|\bd\s+[’']?\s*Etude\b)/i.test(description)) return true;
  return false;
}
async function enrich(item:any,source:any){
  // Structured/API/RSS payloads are authoritative: do not replace them with
  // HTML scraped from the source page just because an optional field is empty.
  // This keeps Jobly based on the source's actual offer data.
  if(item._structured && item.title && String(item.description||"").trim().length>=180) return item;
  if(item.title&&item.company&&!needsSourceRefresh(item)) return item;
  try{
    const html=await fetchText(item.url);
    const json=extractJsonLd(html)[0];
    if(json)return{...item,title:clean(json.title)||item.title,description:cleanDescription(json.description)||item.description,company:clean(json.hiringOrganization?.name)||item.company,website:clean(json.hiringOrganization?.url||json.hiringOrganization?.sameAs)||item.website||null,location:clean(json.jobLocation?.address?.addressLocality||json.jobLocation?.name)||item.location,deadline:json.validThrough||item.deadline,published:json.datePosted||item.published};
    const title=clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"")).replace(/\s*[-|].*$/," ");
    const sourceDescription=cleanDescription(html).slice(0,10000);
    return{...item,title:title||item.title||"Offre d'emploi",description:sourceDescription||item.description||`Offre publiée sur ${source.name}`,location:item.location||inferCity(clean(html)),company:item.company||inferCompany(title)||"Employeur non précisé",deadline:item.deadline||parseDate(clean(html))};
  }catch{return item}
}

async function analyzeWithGemini(item:any){
  if(!GEMINI_API_KEY)return null;
  const prompt=`Tu es J’IA, le moteur de normalisation de JOBLY. Transforme l’annonce brute en données structurées. Ignore totalement HTML, CSS, JavaScript, menus, navigation, publicité, cookies et tracking. Ne conserve que l’information humaine de l’annonce. Retourne UNIQUEMENT un JSON valide avec title, company, location (tableau), region, sector, contractType, remoteMode, minExperienceYears, salaryMin, salaryMax, salaryCurrency, deadline, summary, qualityScore, flags (tableau) et sections={description,missions,profile,education,experience,skills,qualities,benefits,application}, chaque section étant un tableau de chaînes. Classe chaque phrase dans la section la plus appropriée. N’invente jamais une donnée absente: null ou []. qualityScore mesure l’exploitabilité de l’annonce, pas son attractivité.

OFFRE:
${JSON.stringify({title:item.title,company:item.company,location:item.location,description:String(item.description||"").slice(0,15000),source:item.source})}`
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})});
  if(!r.ok)throw new Error(`Gemini ${r.status}`);
  const data=await r.json();const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";if(!text)throw new Error("Gemini empty response");return JSON.parse(text);
}

async function backfillExistingOffers(supabase:any){
  const pageSize=50; let offset=0, scanned=0, repaired=0, skipped=0;
  while(true){
    const {data:jobs,error}=await supabase.from("Job").select("id,title,description,companyId,location,deadline,source,sourceKey,sourceUrl,externalId,normalizedContent,normalizedVersion,aiQualityScore").eq("isActive",true).or("normalizedVersion.is.null,normalizedContent.is.null").range(offset,offset+pageSize-1);
    if(error) throw error; if(!jobs?.length) break;
    scanned+=jobs.length;
    for(const job of jobs){
      const item={title:String(job.title||""),company:"",location:String(job.location||""),description:String(job.description||""),deadline:job.deadline||null,url:String(job.sourceUrl||""),source:String(job.source||"Jobly"),published:null};
      if(!item.url || item.description.trim().length<2){skipped++;continue;}
      let ai:any=null; try{ai=await analyzeWithGemini(item)}catch{}
      const normalized=normalizeAiResult(ai,item);
      const row={normalizedContent:normalized,normalizedVersion:NORMALIZED_VERSION,normalizedAt:new Date().toISOString(),title:normalized.title||job.title,description:normalized.description.join("\n\n")||job.description,location:normalized.location.join(", ")||job.location,contractType:normalized.contractType||null,remoteMode:normalized.remoteMode||null,salaryMin:normalized.salary.min,salaryMax:normalized.salary.max,salaryCurrency:normalized.salary.currency||"XAF",aiProcessed:Boolean(ai),aiProcessedAt:ai?new Date().toISOString():null,aiQualityScore:Number.isFinite(normalized.qualityScore)?Math.max(0,Math.min(100,normalized.qualityScore)):null,aiSummary:normalized.description.slice(0,3).join(" "),aiFlags:normalized.flags,aiSkills:normalized.skills,updatedAt:new Date().toISOString()};
      const {error:e}=await supabase.from("Job").update(row).eq("id",job.id); if(e) throw e; repaired++;
    }
    if(jobs.length<pageSize) break; offset+=pageSize;
  }
  return {scanned,repaired,skipped};
}

Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response(JSON.stringify({message:"POST required"}),{status:405,headers:{"content-type":"application/json"}});
 const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const started=Date.now();let discovered=0,inserted=0,updated=0,expired=0,aiProcessed=0,aiFailed=0;const sourceStats:any[]=[];const runBackfill=req.headers.get("x-jobly-backfill")==="true";let backfill:any=null;
 for(const source of SOURCES.filter(s=>s.enabled)){let found=0,si=0,su=0,error="";try{const structured=await fetchStructuredSource(source.key);const html=structured===null?await fetchText(source.url):"";const raw=(structured??parseListing(html,source.url,source.key)).map((x:any)=>structured!==null?{...x,_structured:true}:x);found=raw.length;const items=[];for(const r of raw.slice(0,100)){const e=await enrich(r,source);if(e.title&&e.title.length>=4&&e.url)items.push({...e,source:source.name})}discovered+=items.length;
   for(const item of items){const externalId=hash(item.url||`${item.title}|${item.company}|${item.location}`);const contentHash=hash(`${item.title}|${item.company}|${item.description}|${item.location}|${item.deadline||""}`);let ai:any=null;try{ai=await analyzeWithGemini(item);if(ai)aiProcessed++}catch{aiFailed++}
    const normalizedContent=normalizeAiResult(ai,item);
    const text=`${item.title} ${item.description}`;const opportunityType=inferOpportunityType(item);const phoneNumbers=extractPhone(text);let companyId:string|null=null;const companyName=String(ai?.company||item.company||"").trim();const companyWebsite=String(item.website||"").trim()||null;let companyLogo:string|null=null;
    if(companyWebsite){try{const host=new URL(companyWebsite.startsWith("http")?companyWebsite:`https://${companyWebsite}`).hostname.replace(/^www\./,"");companyLogo=`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;}catch{}}
    if(companyName){const existingCompany=await supabase.from("Company").select("id,website,logoUrl").eq("name",companyName).maybeSingle();if(existingCompany.error)throw existingCompany.error;if(existingCompany.data?.id){companyId=existingCompany.data.id;const updates:any={};if(companyWebsite&&!existingCompany.data.website)updates.website=companyWebsite;if(companyLogo&&!existingCompany.data.logoUrl)updates.logoUrl=companyLogo;if(Object.keys(updates).length)await supabase.from("Company").update(updates).eq("id",companyId);}else{const createdCompany=await supabase.from("Company").insert({name:companyName,website:companyWebsite,logoUrl:companyLogo}).select("id").single();if(createdCompany.error)throw createdCompany.error;companyId=createdCompany.data.id}}const row:any={opportunityType,title:normalizedContent.title||ai?.title||item.title,companyId,description:normalizedContent.description.join("\n\n")||cleanDescription(item.description)||`Offre publiée via ${source.name}.`,language:/[àâçéèêëîïôùûüÿœ]/i.test(text)?"fr":"en",location:normalizedContent.location.join(", ")||item.location||inferCity(text),contractType:normalizedContent.contractType||ai?.contractType||inferContract(text),salaryMin:normalizedContent.salary.min,salaryMax:normalizedContent.salary.max,salaryCurrency:normalizedContent.salary.currency||"XAF",source:source.name,sourceKey:source.key,sourceUrl:item.url,externalId,contentHash,deadline:item.deadline||parseDate(item.description),sourcePublishedAt:item.published||null,lastSeenAt:new Date().toISOString(),isActive:true,remoteMode:normalizedContent.remoteMode||ai?.remoteMode||inferRemote(text),minExperienceYears:Number.isFinite(ai?.minExperienceYears)?ai.minExperienceYears:inferExperience(text),aiProcessed:Boolean(ai),aiProcessedAt:ai?new Date().toISOString():null,aiSector:normalizedContent.sector||null,aiSummary:ai?.summary||normalizedContent.description.slice(0,3).join(" "),aiQualityScore:Number.isFinite(normalizedContent.qualityScore)?Math.max(0,Math.min(100,normalizedContent.qualityScore)):null,aiFlags:Array.isArray(ai?.flags)?ai.flags:[],aiSkills:Array.isArray(ai?.skills)?ai.skills:normalizedContent.skills,normalizedContent,normalizedVersion:NORMALIZED_VERSION,normalizedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),applicationReady:phoneNumbers.length===0,applicationProfile:phoneNumbers.length?{channel:"WHATSAPP_PHONE",phoneNumbers,comingSoon:true}:{channel:"EMAIL",comingSoon:false}};
    const existing=await supabase.from("Job").select("id,title,description,normalizedContent,normalizedVersion,aiQualityScore,companyId,updatedAt,lastSeenAt,isActive").eq("sourceKey",source.key).eq("externalId",externalId).maybeSingle();if(existing.error)throw existing.error;if(existing.data?.id){
      const candidateQuality=offerQuality(row);
      const existingQuality=offerQuality(existing.data);
      if(!existing.data.normalizedContent || !existing.data.normalizedVersion || candidateQuality>=existingQuality){
        const{error:e}=await supabase.from("Job").update(row).eq("id",existing.data.id);if(e)throw e;updated++;su++;
      }else{
        // Never let a poorer source refresh destroy an already usable canonical offer.
        const{error:e}=await supabase.from("Job").update({lastSeenAt:row.lastSeenAt,isActive:true,sourcePublishedAt:row.sourcePublishedAt||null}).eq("id",existing.data.id);if(e)throw e;
      }
    }else{const{error:e}=await supabase.from("Job").insert(row);if(e)throw e;inserted++;si++}}
   sourceStats.push({source:source.name,found,inserted:si,updated:su})}catch(e){error=e instanceof Error?e.message:String(e);sourceStats.push({source:source.name,found,inserted:si,updated:su,error})}}
 if(runBackfill){backfill=await backfillExistingOffers(supabase);}
 const{data:dead}=await supabase.from("Job").update({isActive:false,updatedAt:new Date().toISOString()}).eq("isActive",true).lt("deadline",new Date().toISOString()).select("id");expired+=dead?.length||0;
 return new Response(JSON.stringify({ok:true,provider:GEMINI_API_KEY?"GEMINI":"RULES_FALLBACK",model:GEMINI_API_KEY?GEMINI_MODEL:null,discovered,inserted,updated,expired,aiProcessed,aiFailed,backfill,durationMs:Date.now()-started,sources:sourceStats,lastUpdatedAt:new Date().toISOString()}),{headers:{"content-type":"application/json"}})
});
