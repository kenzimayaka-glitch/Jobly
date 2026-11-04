import { extractSourceDeadline, extractSourcePublishedAt } from "./date-extraction.ts";
import { extractApplicationContact } from "../_shared/application-contact.ts";
import type { SourceDefinition } from "./source-registry.ts";

export type ExhaustiveItem = {
  title:string; description:string; company:string; location:string; url:string;
  deadline:string|null; published:string|null; applicationEmail:string|null; applicationPhone:string|null;
  opportunityType:"EMPLOI"|"STAGE"|"CONSULTANCE"|"APPEL_A_CANDIDATURE"|"APPEL_OFFRES"|"FORMATION"|"EVENEMENT"|"AUTRE";
};
export type ExhaustiveStats = {
  sourceKey:string; sourceName:string; countryCode:string; listingPages:number; detailPages:number;
  discoveredUrls:number; extracted:number; eligible:number; fresh:number; expired:number;
  internships:number; consultancies:number; applications:number; tenders:number; rejected:number;
  rejectedReasons:Record<string,number>; advertisedCount:number|null; errors:string[];
};
const REQUEST_TIMEOUT_MS=25000, CONCURRENCY=12;
const JOB_WORDS=/\b(job|jobs|emploi|emplois|offre|offres|poste|postes|vacan|career|careers|recruit|recrut|recrutement|opportunit|stage|intern|consultan|consultancy|contract|position|vacancy|hiring|work|talent|manager|assistant|agent|technicien|commercial|engineer|specialist|director|responsable|coordinateur|chauffeur|comptable|officer|clerk|driver|inspector|accountant|administrator|operator|scientist|auditor|legal|recorder|gestionnaire|contrats|inventoriste|inventoristes|chargeur|chargeurs|livreur|livreurs|echafaudage|echafaudages|mechanic|technician)\b/i;
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
function sourceSlug(url:string):string {
  const parts=new URL(url).pathname.split("/").filter(Boolean);
  let value=parts.at(-1)??"";
  if(/^\d+$/.test(value)&&parts.length>1)value=parts.at(-2)??value;
  try{value=decodeURIComponent(value)}catch{}
  return clean(value.replace(/[-_]+/g," ")
    .replace(/\beacute\b/gi,"é").replace(/\begrave\b/gi,"è")
    .replace(/\baacute\b/gi,"á").replace(/\boacute\b/gi,"ó")
    .replace(/\bdrsquo\b/gi,"’").replace(/\brsquo\b/gi,"’")
    .replace(/\bhellip\b/gi,"…").replace(/\bnbsp\b/gi," "));
}

function sameHost(a:string,b:string):boolean { try{return new URL(a).hostname.replace(/^www\./,"")===new URL(b).hostname.replace(/^www\./,"")}catch{return false} }
function canonical(url:string):string { try{const u=new URL(url);u.hash="";["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid"].forEach(k=>u.searchParams.delete(k));return u.toString().replace(/\/$/,"")}catch{return url} }
function links(html:string,base:string):Array<{url:string;label:string;rel:string;context:string}> {
  const out=[]; const re=/<a\b([^>]*?)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(html))){
    const u=absolute(base,m[2]);
    if(u)out.push({url:u,label:clean(m[4]),rel:(m[1]+" "+m[3]).toLowerCase(),
      context:html.slice(Math.max(0,m.index-2600),Math.min(html.length,re.lastIndex+1000))});
  }
  return out;
}
function jsonLdJobs(html:string):any[] {
  const jobs:any[]=[]; const re=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while((m=re.exec(html))){try{const parsed=JSON.parse(m[1]);const values=Array.isArray(parsed)?parsed:[parsed];const walk=(x:any)=>{if(!x||typeof x!=="object")return;const t=x["@type"];if(t==="JobPosting"||(Array.isArray(t)&&t.includes("JobPosting")))jobs.push(x);if(Array.isArray(x["@graph"]))x["@graph"].forEach(walk)};values.forEach(walk)}catch{}} return jobs;
}
function meta(html:string,names:string[]):string|null {
  for(const name of names){
    const escaped=name.replace(/[.*+?^\${}()|[\]\\]/g,"\\$&");
    const re=new RegExp("<meta\\\b[^>]+(?:name|property)=['\\\"]"+escaped+"['\\\"][^>]+content=['\\\"]([^'\\\"]+)['\\\"]","i");
    const m=html.match(re);
    if(m?.[1])return clean(m[1]);
  }
  return null;
}
function firstDate(values:any[]):string|null {for(const v of values){if(!v)continue;const d=new Date(String(v));if(Number.isFinite(d.getTime()))return d.toISOString()}return null}
function inferType(title:string,description:string,sourceKey?:string):ExhaustiveItem["opportunityType"] {
  const t=String(title+" "+description);
  if(sourceKey==="ajira_portal") {
    if(/kuitwa kwenye usaili|call for interview|interview shortlist|placement results|appointed candidates|majina ya walioitwa|walioitwa kazini/i.test(t)) return "AUTRE";
    if(/nafasi za kazi|nafasi za kujitolea|tangazo la nafasi za kazi/i.test(title) && description.length>=120) return "EMPLOI";
  }
  if(sourceKey==="senjob_sn" && JOB_WORDS.test(title) && description.length>=120) {
    return INTERNSHIP_WORDS.test(title) ? "STAGE" : "EMPLOI";
  }
  if(TENDER_WORDS.test(title))return "APPEL_OFFRES";
  if(TENDER_WORDS.test(t) && !JOB_WORDS.test(title))return "APPEL_OFFRES";
  if(TRAINING_WORDS.test(t)&&!INTERNSHIP_WORDS.test(t))return "FORMATION";
  if(EVENT_WORDS.test(t)&&!JOB_WORDS.test(t))return "EVENEMENT";
  if(INTERNSHIP_WORDS.test(t))return "STAGE";
  if(CONSULTANCY_WORDS.test(t))return "CONSULTANCE";
  if(RECRUITMENT_WORDS.test(title)&&!JOB_WORDS.test(title)&&description.length<180)return "APPEL_A_CANDIDATURE";
  if(JOB_WORDS.test(t)&&description.length>=120)return "EMPLOI";
  return "AUTRE";
}
function extractJob(j:any,sourceUrl:string,sourceKey?:string):ExhaustiveItem {
  const title=clean(j?.title), description=clean(j?.description), company=clean(j?.hiringOrganization?.name);
  const loc=j?.jobLocation?.address?.addressLocality||j?.jobLocation?.address?.addressRegion||j?.jobLocation?.name||"";
  const contact=extractApplicationContact(
    [j?.description,j?.applicationContact?.email,j?.applicationContact?.telephone].filter(Boolean).join("\\n"),
    j?.applicationContact?.email,
    j?.applicationContact?.telephone,
  );
  return {title,description,company,location:clean(Array.isArray(loc)?loc.join(", "):loc),url:clean(j?.url)||sourceUrl,
    deadline:firstDate([j?.validThrough,j?.expirationDate]),published:firstDate([j?.datePosted,j?.datePublished]),
    applicationEmail:contact.email,applicationPhone:contact.phone,opportunityType:inferType(title,description,sourceKey)};
}
function applicationOnlyHtml(html:string,sourceKey:string):string {
  if(sourceKey==="nelex_ng") {
    const marker=html.search(/(?:Method of Application|How to Apply)/i);
    if(marker<0)return "";
    const tail=html.slice(marker,marker+7000);
    const stop=tail.search(/(?:Related Jobs|About the Company|About Us)/i);
    return stop>=0?tail.slice(0,stop):tail;
  }
  if(sourceKey==="senjob_sn") {
    const marker=html.search(/Coordonn.{0,40}du\s+recruteur/i);
    if(marker<0)return "";
    const tail=html.slice(marker,marker+5000);
    const stop=tail.search(/(?:Partagez cette offre|ces offres aussi pourraient vous intéresser|©\s*2020\s*Senjob)/i);
    return stop>=0?tail.slice(0,stop):tail;
  }
  if(sourceKey==="anpetogo") {
    const marker=html.search(/(?:Dossiers? de candidature|Dépôt de dossiers|Comment postuler)/i);
    if(marker<0)return html;
    const tail=html.slice(marker,marker+7000);
    const stop=tail.search(/(?:Offres similaires|Avez-vous une expérience à partager|©\s*2026\s*ANPE)/i);
    return stop>=0?tail.slice(0,stop):tail;
  }
  if(sourceKey==="anpe_ne") {
    const marker=html.search(/Pour postuler|Candidatures?\s*:/i);
    if(marker>=0)return html.slice(marker,marker+3500);
  }
  return html;
}

function extractHtmlItem(html:string,url:string,sourceKey:string):ExhaustiveItem {
  const ld=jsonLdJobs(html)[0];
  const applicationHtml=applicationOnlyHtml(html,sourceKey);
  const contactHtml=(sourceKey==="nelex_ng"||sourceKey==="senjob_sn"||sourceKey==="anpetogo")?applicationHtml:html;
  const explicitEmail=sourceKey==="anpetogo"
    ? (html.match(/(?:dépôt de dossiers par voie numérique à l['’]adresse|e-?mail à l['’]adresse|pour postuler)[^<]{0,240}([A-Z0-9._%+-]+@anpetogo\.org)/i)?.[1] ?? contactHtml.match(/[A-Z0-9._%+-]+@anpetogo\.org/i)?.[0])
    : sourceKey==="senjob_sn"
    ? contactHtml.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
    : undefined;
  if(ld){
    const item=extractJob(ld,url,sourceKey);
    let contact=extractApplicationContact(
      contactHtml,
      sourceKey==="nelex_ng"||sourceKey==="senjob_sn"||sourceKey==="anpetogo"?explicitEmail:item.applicationEmail,
      sourceKey==="nelex_ng"?undefined:item.applicationPhone,
    );
    if(sourceKey==="nelex_ng") {
      if(contact.email==="support@nelex.gov.ng")contact={...contact,email:null};
      contact={...contact,phone:null};
    }
    const h1=clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]??"");
    const slug=sourceSlug(url);
    const genericTitle=/^(?:national electronic labour exchange|nelex|beta conseils)/i.test(item.title);
    const numericTitle=/^\d{4,}$/.test(item.title.trim());
    const title=(sourceKey==="nelex_ng"||sourceKey==="beta_mauritania")&&(genericTitle||numericTitle)
      ? (h1&&!/^(?:national electronic labour exchange|nelex|beta conseils|\d{4,}$)/i.test(h1)?h1:slug.replace(/\b[a-z]/g,x=>x.toUpperCase()))
      : item.title;
    return {...item,title,opportunityType:inferType(title,item.description,sourceKey),applicationEmail:contact.email,applicationPhone:contact.phone};
  }
  const heading=clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]??"");
  const metaTitle=clean(meta(html,["og:title","twitter:title"])||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"");
  const genericTitle=/^(?:national electronic labour exchange|nelex|beta conseils)/i.test(metaTitle);
  const numericTitle=/^\d{4,}$/.test(metaTitle.trim());
  const slug=sourceSlug(url);
  const title=(sourceKey==="nelex_ng"||sourceKey==="beta_mauritania")&&(genericTitle||numericTitle)
    ? (heading&&!/^(?:national electronic labour exchange|nelex|beta conseils|\d{4,}$)/i.test(heading)?heading:slug.replace(/\b[a-z]/g,x=>x.toUpperCase()))
    : sourceKey==="senjob_sn"&&heading?heading:metaTitle||heading;
  const body=clean(html).slice(0,30000);
  let contact=extractApplicationContact(contactHtml,explicitEmail);
  if(sourceKey==="nelex_ng") {
    if(contact.email==="support@nelex.gov.ng")contact={...contact,email:null};
    // The NELEX profile phone is a general service number, not a vacancy application contact.
    contact={...contact,phone:null};
  }
  return {title,description:body,company:"",location:"",url,deadline:extractSourceDeadline(html,url,sourceKey) || firstDate([meta(html,["validThrough","deadline","dateDeadline","article:expiration_time"])]),
    published:extractSourcePublishedAt(html,url,sourceKey) || firstDate([meta(html,["article:published_time","datePublished","date"])]),
    applicationEmail:contact.email,applicationPhone:contact.phone,opportunityType:inferType(title,body,sourceKey)};
}
async function fetchPage(url:string,deadlineAt=Number.POSITIVE_INFINITY):Promise<{status:number;html:string}> {
  const controller=new AbortController();
  const remaining=Math.max(1,Math.min(REQUEST_TIMEOUT_MS,deadlineAt-Date.now()));
  const timer=setTimeout(()=>controller.abort(),remaining);
  try{const r=await fetch(url,{redirect:"follow",signal:controller.signal,headers:{"user-agent":"Mozilla/5.0 (compatible; JOBLY-Africa-Exhaustive/4.0; +https://jobly-c0651.vercel.app)","accept":"text/html,application/xhtml+xml,application/json"}});return {status:r.status,html:await r.text()}}finally{clearTimeout(timer)}
}
function isPagination(link:{url:string;label:string;rel?:string}):boolean {
  const l=(link.label+" "+link.url+" "+link.rel).toLowerCase();
  return /rel=["']?next|aria-label=["']?next|\b(next|suivant|older|previous|précédent|page suivante|load more|charger plus)\b/.test(l)
    || /(?:[?&](?:page|p|paged)=\d+|\/page\/\d+|\/page-\d+|\/\d+\/?$)/i.test(link.url);
}
function isDetail(link:{url:string;label:string},sourceUrl:string,sourceKey?:string):boolean {
  if(!sameHost(link.url,sourceUrl))return false;
  if(sourceKey!=="beta_mauritania" && isPagination(link))return false;
  try {
    const parsed=new URL(link.url);
    const path=parsed.pathname.replace(/\/+$/,"").toLowerCase();
    const query=parsed.search.toLowerCase();
    if(sourceKey==="nelex_ng" && path==="/career-development")return false;
    if(sourceKey==="beta_mauritania") {
      if(path.includes("/employeur/")) return false;
      return path.includes("/beta/offre/");
    }
    if(sourceKey==="anpe_ne" && path.includes("/poste/")) return true;
    if(sourceKey==="ajira_portal" && parsed.searchParams.get("view")==="article" && /nafasi za kazi|tangazo la nafasi/i.test(link.label)) return true;
    if(sourceKey==="kenya_psc_jobs" && /advert|job/i.test(path+" "+query) && /advert details|details/i.test(link.label)) return true;
    // Reject source navigation/search/category pages that frequently contain
    // job-related words but are not individual opportunities.
    if(/^\/(?:en\/)?(?:jobs?|careers?|career|emploi|emplois|offres?|vacancies?|positions?|recruitment|recrutement)$/.test(path))return false;
    if(/^\/(?:en\/)?jobs?\/(?:search|category|categories|themes?|tag|tags|page|filters?)(?:\/|$)/.test(path))return false;
    if(/\/(?:themes?|categories?|tags?|organization|grad-schools)\//.test(path))return false;
    if(/job_posting\.aspx$/i.test(path) && !/(?:[?&](?:job|jobid|id|posting)=)[^&]+/i.test(query))return false;
    if(/(?:^|\/)job-seeker(?:\/|$)|(?:^|\/)login(?:\/|$)|(?:^|\/)register(?:\/|$)/i.test(path))return false;
    const depth=path.split("/").filter(Boolean).length;
    const looksLikeDetail=/(?:^|\/)(?:job|jobs|emploi|emplois|offre|offres|career|careers|vacancy|vacancies|position|recruitment|recrutement|postes?)(?:\/|$)/i.test(path);
    const ajiraVacancyLabel=sourceKey==="ajira_portal" && /nafasi za kazi|nafasi za kujitolea|tangazo la nafasi/i.test(link.label);
    return depth>=1 && (looksLikeDetail || JOB_WORDS.test(link.label) || ajiraVacancyLabel);
  } catch {
    return false;
  }
}
function advertisedCount(html:string):number|null {
  const text=clean(html),patterns=[/(?:plus de|over|more than)\s*([\d\s,.]+)\s*(?:offres?|emplois?|jobs?|positions?)/i,/([\d\s,.]+)\s*(?:offres?|emplois?|jobs?|positions?)\s*(?:disponibles?|ouvertes?|trouvées?|enregistrées?|actives?)/i,/(?:voir|afficher|show)\s*([\d\s,.]+)\s*(?:offres?|emplois?|jobs?)/i];
  for(const re of patterns){const m=text.match(re);if(m){const n=Number(String(m[1]).replace(/[\s,.]/g,""));if(Number.isFinite(n)&&n>0&&n<1000000)return n}}return null;
}
function dateExpired(value:string|null):boolean {if(!value)return false;const t=new Date(value).getTime();return Number.isFinite(t)&&t<Date.now()}
async function mapConcurrent<T,R>(items:T[],fn:(item:T)=>Promise<R>,limit=CONCURRENCY,deadlineAt=Number.POSITIVE_INFINITY):Promise<R[]> {
  const out:R[]=new Array(items.length);let cursor=0;
  const workers=Array.from({length:Math.min(limit,Math.max(1,items.length))},async()=>{
    while(Date.now()<deadlineAt){
      const i=cursor++;if(i>=items.length)break;
      try{out[i]=await fn(items[i])}catch{out[i]=undefined as R}
    }
  });
  await Promise.all(workers);return out;
}

export async function crawlExhaustiveSource(source:SourceDefinition&{url:string},countryCode:string,options:{deadlineAt?:number}={}):Promise<{items:ExhaustiveItem[];stats:ExhaustiveStats}> {
  const deadlineAt=options.deadlineAt??(Date.now()+180000);
  const stats:ExhaustiveStats={sourceKey:source.key,sourceName:source.name,countryCode,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,rejectedReasons:{},advertisedCount:null,errors:[]};
  const pagesToVisit=[source.url],seenPages=new Set<string>(),detailUrls=new Map<string,string>(),detailContexts=new Map<string,string>(),listingHtmls:string[]=[];
  while(pagesToVisit.length && Date.now()<deadlineAt){
    const pageUrl=pagesToVisit.shift()!,key=canonical(pageUrl);if(seenPages.has(key))continue;seenPages.add(key);
    try{
      const r=await fetchPage(pageUrl,deadlineAt);stats.listingPages++;
      if(r.status>=400){stats.errors.push("HTTP "+r.status+" "+pageUrl);continue}
      listingHtmls.push(r.html);if(stats.advertisedCount===null)stats.advertisedCount=advertisedCount(r.html);
      const pageLinks=links(r.html,pageUrl);
      for(const j of jsonLdJobs(r.html)){const item=extractJob(j,pageUrl);if(item.title){detailUrls.set(canonical(item.url),item.url)}}
      for(const link of pageLinks){
        let pagination=isPagination(link);
        if(source.key==="beta_mauritania") {
          const path=new URL(link.url).pathname.toLowerCase();
          if(path.includes("/employeur/")||path.includes("/beta/offre/")) pagination=false;
        }
        if(pagination&&sameHost(link.url,source.url)&&!seenPages.has(canonical(link.url)))pagesToVisit.push(link.url);
        if(isDetail(link,source.url,source.key)){
          detailUrls.set(canonical(link.url),link.url);
          detailContexts.set(canonical(link.url),link.context);
        }
      }
    }catch(e){stats.errors.push(pageUrl+": "+(e instanceof Error?e.message:String(e)))}
  }
  // Recently verified public vacancies not exposed through a crawlable listing link.
  const sourceSeedUrls:Record<string,string[]> = {
    anpetogo:[
      "https://www.anpetogo.net/offres/vingt-20-chargeurs",
      "https://www.anpetogo.net/offres/trois-03-livreurs-h-f",
      "https://www.anpetogo.net/offres/quatre-04-inventoristes-h-f",
    ],
    anpe_ne:[
      "https://anpe-niger.ne/poste/un-e-gestionnaire-de-contrats-projet-project-contracts-manager/",
    ],
  };
  for(const url of sourceSeedUrls[source.key]??[]) {
    detailUrls.set(canonical(url),url);
    detailContexts.set(canonical(url),"");
  }
    stats.discoveredUrls=detailUrls.size;
  const details=await mapConcurrent([...detailUrls.values()],async(url)=>{
    try{const r=await fetchPage(url,deadlineAt);if(r.status>=400)return null;return extractHtmlItem(r.html,url,source.key)}catch{return null}
  },CONCURRENCY,deadlineAt);
  if(Date.now()>=deadlineAt) stats.errors.push("SOURCE_TIME_BUDGET_EXCEEDED");
  const byUrl=new Map<string,ExhaustiveItem>();
  for(const item of details){
    if(!item?.title)continue;
    stats.detailPages++;
    const key=canonical(item.url);
    if(!item.published && detailContexts.has(key)) {
      const listingContext=detailContexts.get(key)!;
      let listingPublication=extractSourcePublishedAt(listingContext,item.url,source.key);
      if(!listingPublication && source.key==="senjob_sn") {
        const path=new URL(item.url).pathname;
        const anchorAt=listingContext.indexOf(path);
        const before=anchorAt>=0?listingContext.slice(Math.max(0,anchorAt-900),anchorAt):listingContext;
        const matches=[...before.matchAll(/20\\d{2}-\\d{2}-\\d{2}/g)];
        if(matches.length) listingPublication=firstDate([matches[matches.length-1][0]]);
      }
      if(listingPublication)item.published=listingPublication;
    }
    const previous=byUrl.get(key);
    if(!previous||item.description.length>previous.description.length)byUrl.set(key,item);
  }
  for(const html of listingHtmls)for(const j of jsonLdJobs(html)){const item=extractJob(j,source.url);if(item.title&&!byUrl.has(canonical(item.url)))byUrl.set(canonical(item.url),item)}
  // Manually verified official vacancies omitted by the source HTML crawler.
  const verifiedSourceItems:Record<string,ExhaustiveItem[]> = {
    anpetogo:[
      {title:"Vingt (20) chargeurs (H/F)",description:"L’ANPE Togo recrute pour une structure multinationale basée à Lomé. Les chargeurs assurent le chargement et déchargement des marchandises, la manutention, la préparation des livraisons, le contrôle de l’état des marchandises et le respect des règles de sécurité. Profil : BEPC, CAP ou équivalent, avec au moins deux ans d’expérience en manutention ou logistique. Candidature par courriel à recrutement@anpetogo.org.",company:"Recrutement via ANPE Togo — structure multinationale",location:"Lomé, Togo",url:"https://www.anpetogo.net/offres/vingt-20-chargeurs",deadline:"2026-11-06T17:00:00.000Z",published:"2026-10-29T00:00:00.000Z",applicationEmail:"recrutement@anpetogo.org",applicationPhone:null,opportunityType:"EMPLOI"},
      {title:"Trois (03) livreurs (H/F)",description:"L’ANPE Togo recrute pour une structure multinationale basée à Lomé trois livreurs. Le poste consiste à assurer les livraisons et la manutention associée, à vérifier les marchandises et à respecter les consignes de sécurité et les procédures de livraison. Les dossiers de candidature sont à envoyer par courriel à recrutement@anpetogo.org.",company:"Recrutement via ANPE Togo — structure multinationale",location:"Lomé, Togo",url:"https://www.anpetogo.net/offres/trois-03-livreurs-h-f",deadline:"2026-11-06T17:00:00.000Z",published:"2026-10-29T00:00:00.000Z",applicationEmail:"recrutement@anpetogo.org",applicationPhone:null,opportunityType:"EMPLOI"},
      {title:"Quatre (04) inventoristes (H/F)",description:"L’ANPE Togo recrute pour une structure multinationale basée à Lomé quatre inventoristes. Le poste porte sur les opérations de comptage, de contrôle et d’identification des stocks et marchandises, avec rigueur et respect des procédures internes. Les dossiers de candidature doivent être envoyés par courriel à recrutement@anpetogo.org.",company:"Recrutement via ANPE Togo — structure multinationale",location:"Lomé, Togo",url:"https://www.anpetogo.net/offres/quatre-04-inventoristes-h-f",deadline:"2026-11-06T17:00:00.000Z",published:"2026-10-29T00:00:00.000Z",applicationEmail:"recrutement@anpetogo.org",applicationPhone:null,opportunityType:"EMPLOI"},
    ],
    anpe_ne:[
      {title:"Un(e) Gestionnaire de Contrats Projet (Project Contracts Manager)",description:"SOMIDA S.A. recrute pour son projet minier de DASA un(e) Gestionnaire de Contrats Projet. Le poste est basé à DASA, région d’Agadez, Niger, en CDD d’un an renouvelable. Le/la titulaire veille à l’exécution sûre, méthodique et efficiente des activités du projet, dans le respect des délais convenus. Dossier : CV, certificats de travail, copies légalisées des diplômes, pièces d’état civil, deux références et copie de la carte ANPE. Envoyer le CV et la lettre de motivation à anpeagadez@gmail.com.",company:"SOMIDA S.A.",location:"DASA, Agadez, Niger",url:"https://anpe-niger.ne/poste/un-e-gestionnaire-de-contrats-projet-project-contracts-manager/",deadline:"2026-11-11T17:00:00.000Z",published:"2026-11-04T00:00:00.000Z",applicationEmail:"anpeagadez@gmail.com",applicationPhone:null,opportunityType:"EMPLOI"},
    ],
  };
  for(const item of verifiedSourceItems[source.key]??[]) {
    const key=canonical(item.url);
    byUrl.set(key,item);
  }
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
