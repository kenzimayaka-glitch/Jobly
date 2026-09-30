import type { SourceDefinition } from "./source-registry.ts";

export type ExhaustiveItem = {
  title:string; description:string; company:string; location:string; url:string;
  deadline:string|null; published:string|null;
  opportunityType:"EMPLOI"|"STAGE"|"CONSULTANCE"|"APPEL_A_CANDIDATURE"|"APPEL_OFFRES"|"FORMATION"|"EVENEMENT"|"AUTRE";
};
export type ExhaustiveStats = {
  sourceKey:string; sourceName:string; countryCode:string; listingPages:number; detailPages:number;
  discoveredUrls:number; extracted:number; eligible:number; fresh:number; expired:number;
  internships:number; consultancies:number; applications:number; tenders:number; rejected:number;
  rejectedReasons:Record<string,number>; advertisedCount:number|null; errors:string[];
};
const REQUEST_TIMEOUT_MS=12000, CONCURRENCY=24;
const JOB_WORDS=/\b(job|jobs|emploi|emplois|offre|offres|poste|postes|vacan|career|careers|recruit|recrut|recrutement|opportunit|stage|intern|consultan|consultancy|contract|position|vacancy|hiring|work|talent|manager|assistant|agent|technicien|commercial|engineer|specialist|director|responsable|coordinateur|chauffeur|comptable)\b/i;
const TENDER_WORDS=/\b(appel d['’]?offres?|march[ée] public|demande de cotation|fourniture|acquisition|soumission|tender|procurement|dao|rfq|rfi|manifestation d['’]?int[ée]r[êe]t)\b/i;
const TRAINING_WORDS=/\b(formation|certification|masterclass|bootcamp|webinaire|atelier de formation|cours|bourse d['’]?[ée]tude|scholarship)\b/i;
const EVENT_WORDS=/\b(conf[ée]rence|forum|salon|[ée]v[ée]nement|event|summit|webinar)\b/i;
const INTERNSHIP_WORDS=/\b(stage|stagiaire|internship|intern|graduate trainee|trainee)\b/i;
const CONSULTANCY_WORDS=/\b(consultant|consultante|consultancy|consultation|expert\s+ind[ée]pendant|prestation de service|prestataire)\b/i;
const RECRUITMENT_WORDS=/\b(appel[\s-]+[àa] candidatures?|recrutement|recrute|recruitment|hiring)\b/i;

function clean(value:any):string {
  return String(value??"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi," ").replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n").replace(/<\/(p|div|section|article|li|h[1-6])>/gi,"\n").replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/\s+/g," ").trim();
}
function absolute(base:string,href:string):string { try{return new URL(href,base).toString().split("#")[0]}catch{return ""} }
function sameHost(a:string,b:string):boolean { try{return new URL(a).hostname.replace(/^www\./,"")===new URL(b).hostname.replace(/^www\./,"")}catch{return false} }
function canonical(url:string):string { try{const u=new URL(url);u.hash="";["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid"].forEach(k=>u.searchParams.delete(k));return u.toString().replace(/\/$/,"")}catch{return url} }
function links(html:string,base:string):Array<{url:string;label:string;rel:string}> {
  const out=[]; const re=/<a\b([^>]*?)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(html))){const u=absolute(base,m[2]);if(u)out.push({url:u,label:clean(m[4]),rel:(m[1]+" "+m[3]).toLowerCase()});} return out;
}
function jsonLdJobs(html:string):any[] {
  const jobs:any[]=[]; const re=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while((m=re.exec(html))){try{const parsed=JSON.parse(m[1]);const values=Array.isArray(parsed)?parsed:[parsed];const walk=(x:any)=>{if(!x||typeof x!=="object")return;const t=x["@type"];if(t==="JobPosting"||(Array.isArray(t)&&t.includes("JobPosting")))jobs.push(x);if(Array.isArray(x["@graph"]))x["@graph"].forEach(walk)};values.forEach(walk)}catch{}} return jobs;
}
function meta(html:string,names:string[]):string|null {
  for(const name of names){const escaped=name.replace(/[.*+?^()|[\]\\]/g,"\\$&");const re=new RegExp("<meta\\b[^>]+(?:name|property)=['\"]"+escaped+"['\"][^>]+content=['\"]([^'\"]+)['\"]","i");const m=html.match(re);if(m?.[1])return clean(m[1]);}return null;
}
function firstDate(values:any[]):string|null {for(const v of values){if(!v)continue;const d=new Date(String(v));if(Number.isFinite(d.getTime()))return d.toISOString()}return null}
function inferType(title:string,description:string):ExhaustiveItem["opportunityType"] {
  const t=String(title+" "+description);
  if(TENDER_WORDS.test(t))return "APPEL_OFFRES";
  if(TRAINING_WORDS.test(t)&&!INTERNSHIP_WORDS.test(t))return "FORMATION";
  if(EVENT_WORDS.test(t)&&!JOB_WORDS.test(t))return "EVENEMENT";
  if(INTERNSHIP_WORDS.test(t))return "STAGE";
  if(CONSULTANCY_WORDS.test(t))return "CONSULTANCE";
  if(RECRUITMENT_WORDS.test(title)&&!JOB_WORDS.test(title)&&description.length<180)return "APPEL_A_CANDIDATURE";
  if(JOB_WORDS.test(t)&&description.length>=120)return "EMPLOI";
  return "AUTRE";
}
function extractJob(j:any,sourceUrl:string):ExhaustiveItem {
  const title=clean(j?.title), description=clean(j?.description), company=clean(j?.hiringOrganization?.name);
  const loc=j?.jobLocation?.address?.addressLocality||j?.jobLocation?.address?.addressRegion||j?.jobLocation?.name||"";
  return {title,description,company,location:clean(Array.isArray(loc)?loc.join(", "):loc),url:clean(j?.url)||sourceUrl,
    deadline:firstDate([j?.validThrough,j?.expirationDate]),published:firstDate([j?.datePosted,j?.datePublished,j?.dateModified]),opportunityType:inferType(title,description)};
}
function extractHtmlItem(html:string,url:string):ExhaustiveItem {
  const ld=jsonLdJobs(html)[0]; if(ld)return extractJob(ld,url);
  const title=clean(meta(html,["og:title","twitter:title"])||html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"");
  const body=clean(html).slice(0,30000);
  return {title,description:body,company:"",location:"",url,deadline:firstDate([meta(html,["validThrough","deadline","dateDeadline","article:expiration_time"])]),
    published:firstDate([meta(html,["article:published_time","datePublished","date"]) ]),opportunityType:inferType(title,body)};
}
async function fetchPage(url:string):Promise<{status:number;html:string}> {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{const r=await fetch(url,{redirect:"follow",signal:controller.signal,headers:{"user-agent":"JOBLY-Africa-Exhaustive/3.0 (+https://jobly-c0651.vercel.app)","accept":"text/html,application/xhtml+xml,application/json"}});return {status:r.status,html:await r.text()}}finally{clearTimeout(timer)}
}
function isPagination(link:{url:string;label:string;rel:string}):boolean {
  const l=(link.label+" "+link.url+" "+link.rel).toLowerCase();
  return /rel=["']?next|aria-label=["']?next|\b(next|suivant|older|previous|précédent|page suivante|load more|charger plus)\b/.test(l)
    || /(?:[?&](?:page|p|paged)=\d+|\/page\/\d+|\/page-\d+|\/\d+\/?$)/i.test(link.url);
}
function isDetail(link:{url:string;label:string},sourceUrl:string):boolean {
  if(!sameHost(link.url,sourceUrl)||isPagination(link))return false;
  return JOB_WORDS.test(link.url+" "+link.label)||/\/(?:job|jobs|emploi|emplois|offre|offres|career|careers|vacancy|vacancies|position|recruitment|recrutement|postes?)\//i.test(link.url);
}
function advertisedCount(html:string):number|null {
  const text=clean(html),patterns=[/(?:plus de|over|more than)\s*([\d\s,.]+)\s*(?:offres?|emplois?|jobs?|positions?)/i,/([\d\s,.]+)\s*(?:offres?|emplois?|jobs?|positions?)\s*(?:disponibles?|ouvertes?|trouvées?|enregistrées?|actives?)/i,/(?:voir|afficher|show)\s*([\d\s,.]+)\s*(?:offres?|emplois?|jobs?)/i];
  for(const re of patterns){const m=text.match(re);if(m){const n=Number(String(m[1]).replace(/[\s,.]/g,""));if(Number.isFinite(n)&&n>0&&n<1000000)return n}}return null;
}
function dateExpired(value:string|null):boolean {if(!value)return false;const t=new Date(value).getTime();return Number.isFinite(t)&&t<Date.now()}
async function mapConcurrent<T,R>(items:T[],fn:(item:T)=>Promise<R>,limit=CONCURRENCY):Promise<R[]> {
  const out:R[]=new Array(items.length);let cursor=0;const workers=Array.from({length:Math.min(limit,Math.max(1,items.length))},async()=>{while(true){const i=cursor++;if(i>=items.length)break;try{out[i]=await fn(items[i])}catch{out[i]=undefined as R}}});await Promise.all(workers);return out;
}

export async function crawlExhaustiveSource(source:SourceDefinition&{url:string},countryCode:string):Promise<{items:ExhaustiveItem[];stats:ExhaustiveStats}> {
  const stats:ExhaustiveStats={sourceKey:source.key,sourceName:source.name,countryCode,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,rejectedReasons:{},advertisedCount:null,errors:[]};
  const pagesToVisit=[source.url],seenPages=new Set<string>(),detailUrls=new Map<string,string>(),listingHtmls:string[]=[];
  while(pagesToVisit.length){
    const pageUrl=pagesToVisit.shift()!,key=canonical(pageUrl);if(seenPages.has(key))continue;seenPages.add(key);
    try{
      const r=await fetchPage(pageUrl);stats.listingPages++;
      if(r.status>=400){stats.errors.push("HTTP "+r.status+" "+pageUrl);continue}
      listingHtmls.push(r.html);if(stats.advertisedCount===null)stats.advertisedCount=advertisedCount(r.html);
      const pageLinks=links(r.html,pageUrl);
      for(const j of jsonLdJobs(r.html)){const item=extractJob(j,pageUrl);if(item.title){detailUrls.set(canonical(item.url),item.url)}}
      for(const link of pageLinks){
        if(isPagination(link)&&sameHost(link.url,source.url)&&!seenPages.has(canonical(link.url)))pagesToVisit.push(link.url);
        if(isDetail(link,source.url))detailUrls.set(canonical(link.url),link.url);
      }
    }catch(e){stats.errors.push(pageUrl+": "+(e instanceof Error?e.message:String(e)))}
  }
  stats.discoveredUrls=detailUrls.size;
  const details=await mapConcurrent([...detailUrls.values()],async(url)=>{try{const r=await fetchPage(url);if(r.status>=400)return null;return extractHtmlItem(r.html,url)}catch{return null}});
  const byUrl=new Map<string,ExhaustiveItem>();
  for(const item of details){if(!item?.title)continue;stats.detailPages++;const key=canonical(item.url),previous=byUrl.get(key);if(!previous||item.description.length>previous.description.length)byUrl.set(key,item)}
  for(const html of listingHtmls)for(const j of jsonLdJobs(html)){const item=extractJob(j,source.url);if(item.title&&!byUrl.has(canonical(item.url)))byUrl.set(canonical(item.url),item)}
  stats.extracted=byUrl.size;
  for(const item of byUrl.values()){
    if(dateExpired(item.deadline)){stats.expired++;stats.rejected++;stats.rejectedReasons.expired=(stats.rejectedReasons.expired||0)+1;continue}
    if(item.opportunityType==="APPEL_OFFRES"){stats.tenders++;stats.rejected++;stats.rejectedReasons.tender=(stats.rejectedReasons.tender||0)+1;continue}
    if(["FORMATION","EVENEMENT","AUTRE"].includes(item.opportunityType)){stats.rejected++;const k=item.opportunityType.toLowerCase();stats.rejectedReasons[k]=(stats.rejectedReasons[k]||0)+1;continue}
    if(item.opportunityType==="STAGE")stats.internships++;if(item.opportunityType==="CONSULTANCE")stats.consultancies++;if(item.opportunityType==="APPEL_A_CANDIDATURE")stats.applications++;stats.eligible++;stats.fresh++;
  }
  const items=[...byUrl.values()].filter(item=>!dateExpired(item.deadline)&&["EMPLOI","STAGE","CONSULTANCE","APPEL_A_CANDIDATURE"].includes(item.opportunityType));
  return {items,stats};
}
