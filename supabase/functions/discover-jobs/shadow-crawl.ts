import { resolveCountrySources } from "./country-url-resolver.ts";
import { crawlExhaustiveSource } from "./exhaustive-crawler.ts";

const countries=(Deno.args.length?Deno.args:["CM","DZ","EG","LY","MA","MR","TN","BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG","CF","TD","CG","CD","GQ","GA","ST","BI","AO","KE","UG","TZ","RW","ET","DJ","ER","SO","SS","SD","KM","MG","MU","SC","ZA","ZM","ZW","MW","MZ","NA","BW","SZ","LS"]).map(x=>x.trim().toUpperCase()).filter(Boolean);
const started=Date.now();
const GLOBAL_BUDGET_MS=110*60*1000;
const SOURCE_BUDGET_MS=3*60*1000;
const SOURCE_CONCURRENCY=8;
const deadlineAt=started+GLOBAL_BUDGET_MS;

type Metric=Record<string,any>;
const tasks:{country:string;source:any}[]=[];
for(const country of countries){
  for(const source of resolveCountrySources(country)) tasks.push({country,source});
}

const metrics:Metric[]=[];
const harvestCandidates:Metric[]=[];
let cursor=0;
async function worker(){
  while(Date.now()<deadlineAt){
    const i=cursor++;
    if(i>=tasks.length) return;
    const {country,source}=tasks[i];
    if(!source.url){
      metrics.push({sourceKey:source.sourceKey,sourceName:source.sourceKey,countryCode:country,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,rejectedReasons:{unresolved:1},advertisedCount:null,errors:["UNRESOLVED_SOURCE"]});
      continue;
    }
    try{
      const result=await crawlExhaustiveSource(
        {...source,enabled:true,status:"active",key:source.sourceKey,name:source.sourceKey,countries:[country],languages:[],captureMode:"http",renderRequired:false,priority:0},
        country,
        {deadlineAt:Math.min(deadlineAt,Date.now()+SOURCE_BUDGET_MS)}
      );
      metrics.push({...result.stats,samples:result.items.slice(0,10).map(x=>({title:x.title,url:x.url,type:x.opportunityType,deadline:x.deadline}))});
      for(const item of result.items) {
        const published = item.published ? new Date(item.published) : null;
        const fresh = published && Number.isFinite(published.getTime()) && (Date.now() - published.getTime()) < 62 * 86400000;
        if(!fresh) continue;
        harvestCandidates.push({sourceKey:source.sourceKey,countryCode:country,title:item.title,description:item.description,company:item.company,location:item.location,url:item.url,deadline:item.deadline,published:item.published,opportunityType:item.opportunityType});
      }
    }catch(e){
      metrics.push({sourceKey:source.sourceKey,sourceName:source.sourceKey,countryCode:country,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,rejectedReasons:{runtime:1},advertisedCount:null,errors:[e instanceof Error?e.message:String(e)]});
    }
  }
}
await Promise.all(Array.from({length:Math.min(SOURCE_CONCURRENCY,Math.max(1,tasks.length))},()=>worker()));

const completedCountries=[...new Set(metrics.map(x=>x.countryCode))];
const control=metrics.map(x=>({
  country:x.countryCode,source:x.sourceName,sourceCount:x.advertisedCount,discovered:x.discoveredUrls,extracted:x.extracted,
  eligible:x.eligible,expired:x.expired,rejected:x.rejected,internships:x.internships,consultancies:x.consultancies,
  tenders:x.tenders,errors:x.errors.length,gap:x.advertisedCount===null?null:x.advertisedCount-x.eligible
}));
const summary={
  generatedAt:new Date().toISOString(),mode:"EXHAUSTIVE_SHADOW_HARVEST",publication:false,deployment:false,
  countries,completedCountries,partial:metrics.length<tasks.length,
  sources:metrics.length,totalPlannedSources:tasks.length,
  accessible:metrics.filter(x=>x.errors.length===0).length,failed:metrics.filter(x=>x.errors.length>0).length,
  listingPages:metrics.reduce((n,x)=>n+x.listingPages,0),detailPages:metrics.reduce((n,x)=>n+x.detailPages,0),
  discoveredUrls:metrics.reduce((n,x)=>n+x.discoveredUrls,0),totalExtracted:metrics.reduce((n,x)=>n+x.extracted,0),
  totalEligible:metrics.reduce((n,x)=>n+x.eligible,0),expired:metrics.reduce((n,x)=>n+x.expired,0),
  rejected:metrics.reduce((n,x)=>n+x.rejected,0),internships:metrics.reduce((n,x)=>n+x.internships,0),
  consultancies:metrics.reduce((n,x)=>n+x.consultancies,0),tenders:metrics.reduce((n,x)=>n+x.tenders,0),
  durationMs:Date.now()-started,globalBudgetMs:GLOBAL_BUDGET_MS,sourceBudgetMs:SOURCE_BUDGET_MS
};
const uniqueCandidates=[...new Map(harvestCandidates.map(item=>[item.sourceKey+"\
"+item.url,item])).values()];
await Deno.writeTextFile("africa-shadow-harvest-candidates.json",JSON.stringify(uniqueCandidates,null,2));
console.log(JSON.stringify({summary:{...summary,harvestCandidates:uniqueCandidates.length},control,metrics},null,2));
