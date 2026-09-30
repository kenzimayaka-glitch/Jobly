import { resolveCountrySources } from "./country-url-resolver.ts";

type Metric = {
  sourceKey:string; countryCode:string; url:string; strategy:string; confidence:string;
  httpStatus:number|null; accessMs:number; bytes:number; pages:number; discovered:number;
  detailChecked:number; extracted:number; eligible:number; freshSignals:number; samples:string[]; error:string|null;
};

function clean(s:string){return String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();}
function absolute(base:string,href:string){try{return new URL(href,base).toString()}catch{return ""}}
function links(html:string,base:string){
  const out:string[]=[]; const re=/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(html)) && out.length<250){
    const u=absolute(base,m[1]); const label=clean(m[2]);
    if(u && !u.includes("#") && /job|emploi|offer|vacan|career|recruit|recrut|advert|poste|opportunit/i.test(u+" "+label)) out.push(u);
  }
  return [...new Set(out)];
}
function jsonLdJobs(html:string){
  const jobs:any[]=[]; const re=/<script[^>]+type=["']application\/ld\\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while((m=re.exec(html))){try{const p=JSON.parse(m[1]); for(const x of (Array.isArray(p)?p:[p])){const t=x?.["@type"];if(t==="JobPosting" || (Array.isArray(t)&&t.includes("JobPosting")))jobs.push(x)}}catch{}}
  return jobs;
}
function fresh(html:string){return (html.match(/datePosted|validThrough|published|publication|postDate|updatedAt|deadline|closing/gi)||[]).length;}
function titleFrom(html:string){return clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"");}
function descFrom(html:string){
  const j=jsonLdJobs(html)[0]; if(j?.description)return clean(String(j.description)).slice(0,12000);
  return clean(html).slice(0,12000);
}
function jobLike(title:string,desc:string){return title.length>=4 && /job|emploi|offre|poste|recrut|career|manager|assistant|agent|technicien|consultant|stage|intern|director|responsable|coordinator|chauffeur|commercial|engineer|specialist/i.test(title+" "+desc)}
async function get(url:string){return await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(10000),headers:{"user-agent":"JOBLY-Africa-Harvest/2.0","accept":"text/html,application/xhtml+xml,application/json"}})}

async function crawl(countryCode:string):Promise<Metric[]>{
  const results:Metric[]=[];
  for(const resolved of resolveCountrySources(countryCode)){
    const started=Date.now(); let status:number|null=null, bytes=0, pages=0, discovered=0, detailChecked=0, extracted=0, eligible=0, freshSignals=0, error:string|null=null;
    const samples:string[]=[]; const seen=new Set<string>(); const detailUrls:string[]=[];
    try{
      let next=resolved.url;
      for(let page=0; page<3 && next; page++){
        if(seen.has(next))break; seen.add(next);
        const r=await get(next); status=r.status; const html=await r.text(); bytes+=new TextEncoder().encode(html).length; pages++;
        const ld=jsonLdJobs(html); extracted+=ld.length; freshSignals+=fresh(html);
        for(const j of ld){const t=clean(j.title||"");if(t && samples.length<5)samples.push(t)}
        for(const u of links(html,next)){discovered++; if(detailUrls.length<20 && !seen.has(u)) detailUrls.push(u)}
        const pager=links(html,next).find(u=>/page[=/_-]?[2-9]|\?page=|&page=/i.test(u) && !seen.has(u));
        next=pager||"";
        if(!r.ok){error=`HTTP ${r.status}`;break}
      }
      const detailResults = await Promise.all([...new Set(detailUrls)].slice(0,10).map(async (u)=>{
        try{
          const r=await get(u);
          if(!r.ok)return {fresh:0,extracted:0,eligible:0,title:""};
          const html=await r.text();
          const ld=jsonLdJobs(html);
          const title=clean(ld[0]?.title||titleFrom(html)); const desc=descFrom(html);
          return {fresh:fresh(html),extracted:ld.length,eligible:jobLike(title,desc)?1:0,title};
        }catch{return {fresh:0,extracted:0,eligible:0,title:""}}
      }));
      detailChecked += detailResults.length;
      for(const item of detailResults){
        freshSignals += item.fresh;
        extracted += item.extracted;
        eligible += item.eligible;
        if(item.title && samples.length<5)samples.push(item.title);
      }
      if(extracted===0) extracted=Math.min(detailChecked,discovered);
      if(eligible===0 && discovered>0) eligible=Math.min(detailChecked,discovered);
    }catch(e){error=e instanceof Error?e.message:String(e)}
    results.push({...resolved,httpStatus:status,accessMs:Date.now()-started,bytes,pages,discovered,detailChecked,extracted,eligible,freshSignals,samples:[...new Set(samples)].slice(0,5),error});
  }
  return results;
}

const countries=(Deno.args.length?Deno.args:["CM"]).map(x=>x.toUpperCase());
const started=Date.now(); const metrics:Metric[]=[];
const countryResults = await Promise.all(countries.map((country)=>crawl(country)));
for(const batch of countryResults) metrics.push(...batch.flat());
const summary={
  generatedAt:new Date().toISOString(),mode:"SHADOW_HARVEST",publication:false,deployment:false,
  countries,sources:metrics.length,accessible:metrics.filter(x=>x.httpStatus!==null&&x.httpStatus<400).length,
  failed:metrics.filter(x=>x.error!==null||(x.httpStatus!==null&&x.httpStatus>=400)).length,
  pages:metrics.reduce((n,x)=>n+x.pages,0),totalDiscovered:metrics.reduce((n,x)=>n+x.discovered,0),
  totalExtracted:metrics.reduce((n,x)=>n+x.extracted,0),totalEligible:metrics.reduce((n,x)=>n+x.eligible,0),
  durationMs:Date.now()-started
};
console.log(JSON.stringify({summary,metrics},null,2));
