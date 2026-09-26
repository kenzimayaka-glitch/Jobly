import { fetchStructuredSource } from "./sources.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const SOURCES = [
  { key: "emploi_cm", name: "Emploi.cm", url: "https://www.emploi.cm/recherche-jobs-cameroun", enabled: true },
  { key: "emplois_cameroun", name: "Emplois Cameroun", url: "https://emploiscameroun.com/offres/", enabled: true },
  { key: "jobincamer", name: "Job in Cameroun", url: "https://www.jobincamer.com/adverts/jobs", enabled: true },
  { key: "jobinfocamer", name: "JobInfoCamer", url: "https://www.jobinfocamer.com/", enabled: true },
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
function clean(s:string|null|undefined){return(s||"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()}
function absolute(base:string,href:string){try{return new URL(href,base).toString()}catch{return href}}
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function inferContract(text:string){const t=text.toLowerCase();if(/\bcdi\b|permanent|full[- ]?time/.test(t))return"CDI";if(/\bcdd\b|temporary|contract/.test(t))return"CDD";if(/stage|internship|intern/.test(t))return"STAGE";if(/freelance/.test(t))return"FREELANCE";return"AUTRE"}
function inferRemote(text:string){const t=text.toLowerCase();if(/remote|télétravail|teletravail/.test(t)&&/hybrid|hybride/.test(t))return"PARTIAL";if(/remote|télétravail|teletravail/.test(t))return"YES";return"NO"}
function inferCity(text:string){const t=text.toLowerCase();return CITY_NAMES.find(c=>t.includes(c.toLowerCase()))||"Cameroon"}
function inferCompany(text:string){const t=clean(text);const m=t.match(/^(.+?)\s+(?:recrute|is hiring|recruits)\b/i);return m?.[1]?.trim()||""}
function inferExperience(text:string){const m=text.match(/(\d+)\s*(?:\+|à|-)\s*(?:\d+)?\s*(?:ans?|years?)/i);return m?Number(m[1]):0}
function extractPhone(text:string){const matches=text.match(/(?:\+?237[\s.-]?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|6[5-9]\d{7})/g)||[];return matches.map(x=>x.replace(/[\s.-]/g,"")).map(x=>x.startsWith("237")?"+"+x:"+237"+x).filter((x,i,a)=>a.indexOf(x)===i).slice(0,3)}
function extractLinks(html:string,base:string){const out:string[]=[];const re=/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;while((m=re.exec(html))&&out.length<80){const href=absolute(base,m[1]);const label=clean(m[2]);if(label.length>=5&&!/^javascript:/i.test(href)&&!href.includes("#"))out.push(href)}return[...new Set(out)]}
function extractJsonLd(html:string){const jobs:any[]=[];const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(html))){try{const parsed=JSON.parse(m[1]);for(const x of(Array.isArray(parsed)?parsed:[parsed]))if(x?.['@type']==='JobPosting')jobs.push(x)}catch{}}return jobs}
function isLikelyJobUrl(sourceKey:string,url:string){if(sourceKey==="emplois_cameroun")return /emploiscameroun\.com\/offre\//i.test(url);if(sourceKey==="jobincamer")return /jobincamer\.com\/job\//i.test(url);if(sourceKey==="jobinfocamer")return /jobinfocamer\.com\/job\//i.test(url);if(sourceKey==="emploi_cm")return /emploi\.cm/i.test(url)&&(/job=/i.test(url)||/offre|emploi|recrut/i.test(url));return /job|emploi|offre|advert|career|vacan|recruit|recrut|jobs\//i.test(url)}
function parseListing(html:string,base:string,sourceKey:string){const items:any[]=[];for(const j of extractJsonLd(html))items.push({title:clean(j.title),description:clean(j.description),company:clean(j.hiringOrganization?.name),location:clean(j.jobLocation?.address?.addressLocality||j.jobLocation?.name),url:j.url||base,deadline:j.validThrough||null,published:j.datePosted||null});for(const url of extractLinks(html,base)){if(!isLikelyJobUrl(sourceKey,url))continue;if(items.some(x=>x.url===url))continue;items.push({title:"",description:"",company:"",location:"",url,deadline:null,published:null})}return items.slice(0,60)}
async function fetchText(url:string){const r=await fetch(url,{headers:{"user-agent":"JOBLY-Discovery/2.0","accept":"text/html,application/xhtml+xml"},redirect:"follow"});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.text()}
async function enrich(item:any,source:any){if(item.title&&item.company)return item;try{const html=await fetchText(item.url);const json=extractJsonLd(html)[0];if(json)return{...item,title:clean(json.title)||item.title,description:clean(json.description)||item.description,company:clean(json.hiringOrganization?.name)||item.company,location:clean(json.jobLocation?.address?.addressLocality||json.jobLocation?.name)||item.location,deadline:json.validThrough||item.deadline,published:json.datePosted||item.published};const title=clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"")).replace(/\s*[-|].*$/," ");return{...item,title:title||"Offre d'emploi",description:clean(html).slice(0,3000)||`Offre publiée sur ${source.name}`,location:inferCity(clean(html)),company:item.company||inferCompany(title)||"Employeur non précisé",deadline:parseDate(clean(html))} }catch{return item}}

async function analyzeWithGemini(item:any){
  if(!GEMINI_API_KEY)return null;
  const prompt=`Tu es l'agent IA de JOBLY, plateforme camerounaise d'agrégation d'offres d'emploi. Analyse l'offre ci-dessous. Retourne UNIQUEMENT un JSON valide avec les clés: title, company, city, region, sector, contractType, remoteMode, minExperienceYears, salaryMin, salaryMax, salaryCurrency, skills, summary, qualityScore, flags. qualityScore est un entier 0-100. skills est un tableau de chaînes. flags est un tableau de chaînes. N'invente jamais une information absente: utilise null ou [] si inconnue. Si la ville n'est pas précisée mais que l'offre est clairement Cameroun-wide, city='Cameroon'. Réponds en français si l'offre est française, sinon dans la langue de l'offre.\n\nOFFRE:\n${JSON.stringify({title:item.title,company:item.company,location:item.location,description:String(item.description||"").slice(0,10000),source:item.source})}`;
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})});
  if(!r.ok)throw new Error(`Gemini ${r.status}`);
  const data=await r.json();const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";if(!text)throw new Error("Gemini empty response");return JSON.parse(text);
}

Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response(JSON.stringify({message:"POST required"}),{status:405,headers:{"content-type":"application/json"}});
 const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const started=Date.now();let discovered=0,inserted=0,updated=0,expired=0,aiProcessed=0,aiFailed=0;const sourceStats:any[]=[];
 for(const source of SOURCES.filter(s=>s.enabled)){let found=0,si=0,su=0,error="";try{const structured=await fetchStructuredSource(source.key);const html=structured===null?await fetchText(source.url):"";const raw=structured??parseListing(html,source.url,source.key);found=raw.length;const items=[];for(const r of raw.slice(0,100)){const e=structured?r:await enrich(r,source);if(e.title&&e.title.length>=4&&e.url)items.push({...e,source:source.name})}discovered+=items.length;
   for(const item of items){const externalId=hash(item.url||`${item.title}|${item.company}|${item.location}`);const contentHash=hash(`${item.title}|${item.company}|${item.description}|${item.location}|${item.deadline||""}`);let ai:any=null;try{ai=await analyzeWithGemini(item);if(ai)aiProcessed++}catch{aiFailed++}
    const text=`${item.title} ${item.description}`;const phoneNumbers=extractPhone(text);let companyId:string|null=null;const companyName=String(ai?.company||item.company||"").trim();if(companyName){const existingCompany=await supabase.from("Company").select("id").eq("name",companyName).maybeSingle();if(existingCompany.error)throw existingCompany.error;if(existingCompany.data?.id)companyId=existingCompany.data.id;else{const createdCompany=await supabase.from("Company").insert({name:companyName}).select("id").single();if(createdCompany.error)throw createdCompany.error;companyId=createdCompany.data.id}}const row:any={title:ai?.title||item.title,companyId,description:item.description||`Offre publiée via ${source.name}.`,language:/[àâçéèêëîïôùûüÿœ]/i.test(text)?"fr":"en",location:ai?.city||item.location||inferCity(text),contractType:ai?.contractType||inferContract(text),salaryMin:Number.isFinite(ai?.salaryMin)?ai.salaryMin:null,salaryMax:Number.isFinite(ai?.salaryMax)?ai.salaryMax:null,salaryCurrency:ai?.salaryCurrency||"XAF",source:source.name,sourceKey:source.key,sourceUrl:item.url,externalId,contentHash,deadline:item.deadline||parseDate(item.description),sourcePublishedAt:item.published||null,lastSeenAt:new Date().toISOString(),isActive:true,remoteMode:ai?.remoteMode||inferRemote(text),minExperienceYears:Number.isFinite(ai?.minExperienceYears)?ai.minExperienceYears:inferExperience(text),aiProcessed:Boolean(ai),aiProcessedAt:ai?new Date().toISOString():null,aiSector:ai?.sector||null,aiSummary:ai?.summary||null,aiQualityScore:Number.isFinite(ai?.qualityScore)?Math.max(0,Math.min(100,ai.qualityScore)):null,aiFlags:Array.isArray(ai?.flags)?ai.flags:[],aiSkills:Array.isArray(ai?.skills)?ai.skills:[],updatedAt:new Date().toISOString(),applicationReady:phoneNumbers.length===0,applicationProfile:phoneNumbers.length?{channel:"WHATSAPP_PHONE",phoneNumbers,comingSoon:true}:{channel:"EMAIL",comingSoon:false}};
    const existing=await supabase.from("Job").select("id").eq("sourceKey",source.key).eq("externalId",externalId).maybeSingle();if(existing.data?.id){const{error:e}=await supabase.from("Job").update(row).eq("id",existing.data.id);if(e)throw e;updated++;su++}else{const{error:e}=await supabase.from("Job").insert(row);if(e)throw e;inserted++;si++}}
   sourceStats.push({source:source.name,found,inserted:si,updated:su})}catch(e){error=e instanceof Error?e.message:String(e);sourceStats.push({source:source.name,found,inserted:si,updated:su,error})}}
 const cutoff=new Date(Date.now()-72*60*60*1000).toISOString();const{data:stale}=await supabase.from("Job").update({isActive:false,updatedAt:new Date().toISOString()}).eq("isActive",true).not("sourceKey","is",null).lt("lastSeenAt",cutoff).select("id");expired+=stale?.length||0;const{data:dead}=await supabase.from("Job").update({isActive:false,updatedAt:new Date().toISOString()}).eq("isActive",true).lt("deadline",new Date().toISOString()).select("id");expired+=dead?.length||0;
 return new Response(JSON.stringify({ok:true,provider:GEMINI_API_KEY?"GEMINI":"RULES_FALLBACK",model:GEMINI_API_KEY?GEMINI_MODEL:null,discovered,inserted,updated,expired,aiProcessed,aiFailed,durationMs:Date.now()-started,sources:sourceStats,lastUpdatedAt:new Date().toISOString()}),{headers:{"content-type":"application/json"}})
});
