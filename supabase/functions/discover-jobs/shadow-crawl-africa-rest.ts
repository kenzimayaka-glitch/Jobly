import { AFRICA_REST_COUNTRIES, AFRICA_REST_SOURCE_MATRIX, type AfricaRestSource } from "./africa-rest-sources.ts";
import { crawlExhaustiveSource } from "./exhaustive-crawler.ts";

const DEFAULT_COUNTRIES = AFRICA_REST_COUNTRIES.map(c=>c.code);
const requested = Deno.args.length ? Deno.args.map(x=>x.toUpperCase()).filter(x=>DEFAULT_COUNTRIES.includes(x)) : DEFAULT_COUNTRIES;
const countries = [...new Set(requested)];
const nameByCode = Object.fromEntries(AFRICA_REST_COUNTRIES.map(c=>[c.code,c.name]));
const slugByCode:Record<string,string> = {
  DZ:"algeria",EG:"egypt",LY:"libya",MA:"morocco",MR:"mauritania",TN:"tunisia",
  BJ:"benin",BF:"burkina-faso",CV:"cape-verde",CI:"cote-divoire",GM:"gambia",GH:"ghana",GN:"guinea",GW:"guinea-bissau",LR:"liberia",ML:"mali",NE:"niger",NG:"nigeria",SN:"senegal",SL:"sierra-leone",TG:"togo",
  AO:"angola",KE:"kenya",UG:"uganda",TZ:"tanzania",RW:"rwanda",ET:"ethiopia",DJ:"djibouti",ER:"eritrea",SO:"somalia",SS:"south-sudan",SD:"sudan",KM:"comoros",MG:"madagascar",MU:"mauritius",SC:"seychelles",
  ZA:"south-africa",ZM:"zambia",ZW:"zimbabwe",MW:"malawi",MZ:"mozambique",NA:"namibia",BW:"botswana",SZ:"eswatini",LS:"lesotho"
};

function resolve(source:AfricaRestSource,country:string):string {
  const slug=slugByCode[country] || country.toLowerCase();
  const name=nameByCode[country] || country;
  switch(source.key) {
    case "africarrieres_rest": return `https://africarrieres.com/${slug}/en/jobs`;
    case "unjobs_rest": return `https://unjobs.org/duty_stations/${slug}`;
    case "impactpool_rest": return `https://www.impactpool.org/countries/${encodeURIComponent(name)}`;
    case "jobaa_rest": return `https://jobaa.org/${country.toLowerCase()}/latest-jobs`;
    default: return source.url || "";
  }
}

function canonical(url:string):string {
  try {
    const u=new URL(url); u.hash="";
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid"].forEach(k=>u.searchParams.delete(k));
    return u.toString().replace(/\/$/,"");
  } catch { return url; }
}

function zero(source:AfricaRestSource,country:string,error:string) {
  return {sourceKey:source.key,sourceName:source.name,countryCode:country,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,rejectedReasons:{runtime:1},advertisedCount:null,errors:[error],items:[]};
}

async function runOne(source:AfricaRestSource,country:string) {
  const url=resolve(source,country);
  if(!url) return zero(source,country,"UNRESOLVED_SOURCE");
  try {
    const result=await crawlExhaustiveSource({...source,url,enabled:true,status:"active",name:source.name,countries:[country]},country);
    return {...result.stats,items:result.items};
  } catch(e) {
    return zero(source,country,e instanceof Error?e.message:String(e));
  }
}

const started=Date.now();
const first: any[]=[];
for (const country of countries) {
  const sources=AFRICA_REST_SOURCE_MATRIX.filter(s=>s.enabled&&s.status==="active"&&s.countries.includes(country));
  const batch=await Promise.all(sources.map(s=>runOne(s,country)));
  first.push(...batch);
}

const retryTargets=first.filter(x =>
  x.errors.length>0 ||
  x.extracted===0 ||
  (x.advertisedCount!==null && x.advertisedCount>0 && x.eligible < Math.max(1,Math.floor(x.advertisedCount*0.5)))
);

const second:any[]=[];
for (const item of retryTargets) {
  const source=AFRICA_REST_SOURCE_MATRIX.find(s=>s.key===item.sourceKey);
  if(!source) continue;
  second.push(await runOne(source,item.countryCode));
}

const finalByKey=new Map<string,any>();
for(const item of first) finalByKey.set(item.countryCode+"::"+item.sourceKey,{...item,attempts:1,finalSweep:false});
for(const retry of second) {
  const key=retry.countryCode+"::"+retry.sourceKey;
  const previous=finalByKey.get(key);
  if(!previous) { finalByKey.set(key,{...retry,attempts:2,finalSweep:true}); continue; }
  const choose = (retry.eligible>previous.eligible || retry.extracted>previous.extracted || (previous.errors.length>0 && retry.errors.length===0)) ? retry : previous;
  finalByKey.set(key,{...choose,attempts:2,finalSweep:true,firstAttempt:{extracted:previous.extracted,eligible:previous.eligible,errors:previous.errors}});
}
const metrics=[...finalByKey.values()];
const uniqueByCountry:Record<string,Set<string>>={};
for(const m of metrics) {
  uniqueByCountry[m.countryCode] ||= new Set<string>();
  for(const item of (m.items||[])) uniqueByCountry[m.countryCode].add(canonical(item.url));
}
const countrySummary=countries.map(country=>{
  const rows=metrics.filter(m=>m.countryCode===country);
  return {
    country,
    name:nameByCode[country],
    sources:rows.length,
    accessible:rows.filter(r=>r.errors.length===0).length,
    failed:rows.filter(r=>r.errors.length>0).length,
    listingPages:rows.reduce((n,r)=>n+r.listingPages,0),
    detailPages:rows.reduce((n,r)=>n+r.detailPages,0),
    discoveredUrls:rows.reduce((n,r)=>n+r.discoveredUrls,0),
    extracted:rows.reduce((n,r)=>n+r.extracted,0),
    eligible:rows.reduce((n,r)=>n+r.eligible,0),
    uniqueEligible:new Set(rows.flatMap(r=>(r.items||[]).map((x:any)=>canonical(x.url)))).size,
    expired:rows.reduce((n,r)=>n+r.expired,0),
    rejected:rows.reduce((n,r)=>n+r.rejected,0),
    errors:rows.reduce((n,r)=>n+r.errors.length,0),
    advertised:rows.reduce((n,r)=>n+(r.advertisedCount||0),0)
  };
});
const summary={
  generatedAt:new Date().toISOString(),
  mode:"AFRICA_REST_3_LEVEL_EXHAUSTIVE_SHADOW_HARVEST",
  publication:false,deployment:false,
  levels:{
    level1:"country/channel mapping",
    level2:"source-by-source crawl: local, national, institutional, private, specialized, international",
    level3:"final sweep of failed/zero/large-gap sources"
  },
  countries,
  sources:metrics.length,
  firstPassSources:first.length,
  finalSweepTargets:retryTargets.length,
  finalSweepRuns:second.length,
  accessible:metrics.filter(x=>x.errors.length===0).length,
  failed:metrics.filter(x=>x.errors.length>0).length,
  listingPages:metrics.reduce((n,x)=>n+x.listingPages,0),
  detailPages:metrics.reduce((n,x)=>n+x.detailPages,0),
  discoveredUrls:metrics.reduce((n,x)=>n+x.discoveredUrls,0),
  totalExtracted:metrics.reduce((n,x)=>n+x.extracted,0),
  totalEligible:metrics.reduce((n,x)=>n+x.eligible,0),
  totalUniqueEligible:Object.values(uniqueByCountry).reduce((n,s)=>n+s.size,0),
  expired:metrics.reduce((n,x)=>n+x.expired,0),
  rejected:metrics.reduce((n,x)=>n+x.rejected,0),
  internships:metrics.reduce((n,x)=>n+x.internships,0),
  consultancies:metrics.reduce((n,x)=>n+x.consultancies,0),
  tenders:metrics.reduce((n,x)=>n+x.tenders,0),
  errors:metrics.reduce((n,x)=>n+x.errors.length,0),
  durationMs:Date.now()-started
};
const control=metrics.map(x=>({
  country:x.countryCode,source:x.sourceName,sourceCount:x.advertisedCount,
  discovered:x.discoveredUrls,extracted:x.extracted,eligible:x.eligible,expired:x.expired,
  rejected:x.rejected,internships:x.internships,consultancies:x.consultancies,tenders:x.tenders,
  errors:x.errors.length,attempts:x.attempts||1,finalSweep:Boolean(x.finalSweep),
  gap:x.advertisedCount===null?null:x.advertisedCount-x.eligible
}));
console.log(JSON.stringify({summary,countrySummary,control,metrics},null,2));
