import { resolveCountrySources } from "./country-url-resolver.ts";
import { crawlExhaustiveSource } from "./exhaustive-crawler.ts";

const countries=(Deno.args.length?Deno.args:["CF","TD","CG","CD","GA","GQ","ST","BI"]).map(x=>x.toUpperCase());
const started=Date.now();
const batches=await Promise.all(countries.map(async country=>{
  const resolved=resolveCountrySources(country);
  return await Promise.all(resolved.map(async source=>{
    if(!source.url) return {sourceKey:source.sourceKey,sourceName:source.sourceKey,countryCode:country,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,rejectedReasons:{unresolved:1},advertisedCount:null,errors:["UNRESOLVED_SOURCE"]};
    try{
      const result=await crawlExhaustiveSource({...source,enabled:true,status:"active",name:source.sourceKey,countries:[country],languages:[],captureMode:"http",renderRequired:false,priority:0},country);
      return {...result.stats,samples:result.items.slice(0,10).map(x=>({title:x.title,url:x.url,type:x.opportunityType,deadline:x.deadline}))};
    }catch(e){
      return {sourceKey:source.sourceKey,sourceName:source.sourceKey,countryCode:country,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,rejectedReasons:{runtime:1},advertisedCount:null,errors:[e instanceof Error?e.message:String(e)]};
    }
  }));
}));
const metrics=batches.flat();
const summary={
  generatedAt:new Date().toISOString(),mode:"EXHAUSTIVE_SHADOW_HARVEST",publication:false,deployment:false,
  countries,sources:metrics.length,accessible:metrics.filter(x=>x.errors.length===0).length,
  failed:metrics.filter(x=>x.errors.length>0).length,
  listingPages:metrics.reduce((n,x)=>n+x.listingPages,0),detailPages:metrics.reduce((n,x)=>n+x.detailPages,0),
  discoveredUrls:metrics.reduce((n,x)=>n+x.discoveredUrls,0),totalExtracted:metrics.reduce((n,x)=>n+x.extracted,0),
  totalEligible:metrics.reduce((n,x)=>n+x.eligible,0),expired:metrics.reduce((n,x)=>n+x.expired,0),
  rejected:metrics.reduce((n,x)=>n+x.rejected,0),internships:metrics.reduce((n,x)=>n+x.internships,0),
  consultancies:metrics.reduce((n,x)=>n+x.consultancies,0),tenders:metrics.reduce((n,x)=>n+x.tenders,0),
  durationMs:Date.now()-started
};
console.log(JSON.stringify({summary,metrics},null,2));
