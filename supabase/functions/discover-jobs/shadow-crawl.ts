import { resolveCountrySources } from "./country-url-resolver.ts";

type Metric = {
  sourceKey:string; countryCode:string; url:string; strategy:string; confidence:string;
  httpStatus:number|null; accessMs:number; bytes:number; discovered:number; extracted:number; eligible:number;
  freshnessHints:number; error:string|null;
};

function clean(s:string){return String(s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
function links(html:string,base:string){
  const out:string[]=[]; const re=/<a[^>]+href=["']([^"']+)["'][^>]*>/gi; let m;
  while((m=re.exec(html)) && out.length<200){
    try { const u=new URL(m[1],base).toString(); if(/job|emploi|offer|vacan|career|recruit|recrut|advert/i.test(u)) out.push(u); } catch {}
  }
  return [...new Set(out)];
}
function jsonLdJobs(html:string){
  let n=0; const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while((m=re.exec(html))){try{const p=JSON.parse(m[1]); for(const x of (Array.isArray(p)?p:[p])) if(x?.["@type"]==="JobPosting" || (Array.isArray(x?.["@type"])&&x["@type"].includes("JobPosting"))) n++;}catch{}}
  return n;
}
function freshnessHints(html:string){return (html.match(/datePosted|validThrough|published|publication|postDate|updatedAt/gi)||[]).length;}

async function crawl(countryCode:string):Promise<Metric[]>{
  const results:Metric[]=[];
  for(const resolved of resolveCountrySources(countryCode)){
    const started=Date.now(); let status:number|null=null, bytes=0, discovered=0, extracted=0, eligible=0, freshness=0, error:string|null=null;
    try{
      const r=await fetch(resolved.url,{redirect:"follow",headers:{"user-agent":"JOBLY-Africa-ShadowCrawl/1.0","accept":"text/html,application/xhtml+xml,application/json"}});
      status=r.status; const text=await r.text(); bytes=new TextEncoder().encode(text).length;
      discovered=links(text,resolved.url).length;
      extracted=jsonLdJobs(text);
      eligible=extracted || Math.min(discovered,60);
      freshness=freshnessHints(text);
      if(!r.ok) error=`HTTP ${r.status}`;
    }catch(e){error=e instanceof Error?e.message:String(e);}
    results.push({...resolved,httpStatus:status,accessMs:Date.now()-started,bytes,discovered,extracted,eligible,freshnessHints:freshness,error});
  }
  return results;
}

const countries=(Deno.args.length?Deno.args:["CM"]).map(x=>x.toUpperCase());
const started=Date.now(); const metrics:Metric[]=[];
for(const country of countries) metrics.push(...await crawl(country));
const summary={
  generatedAt:new Date().toISOString(), mode:"SHADOW_ONLY", publication:false, deployment:false,
  countries, sources:metrics.length,
  accessible:metrics.filter(x=>x.httpStatus!==null && x.httpStatus<400).length,
  failed:metrics.filter(x=>x.error!==null || (x.httpStatus!==null && x.httpStatus>=400)).length,
  totalDiscovered:metrics.reduce((n,x)=>n+x.discovered,0),
  totalExtracted:metrics.reduce((n,x)=>n+x.extracted,0),
  totalEligible:metrics.reduce((n,x)=>n+x.eligible,0),
  durationMs:Date.now()-started
};
console.log(JSON.stringify({summary,metrics},null,2));
