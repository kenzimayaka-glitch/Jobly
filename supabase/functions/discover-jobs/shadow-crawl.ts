import { resolveCountrySources, resolveSourceUrl } from "./country-url-resolver.ts";
import { SOURCE_REGISTRY, type SourceDefinition } from "./source-registry.ts";
import { resolveEffectivePublicationDate } from "../_shared/job-freshness.ts";
import { extractApplicationContact, resolveSourceDisplayModel } from "../_shared/application-contact.ts";
import { crawlExhaustiveSource } from "./exhaustive-crawler.ts";

const countries=(Deno.args.length?Deno.args:["CM","DZ","EG","LY","MA","MR","TN","BJ","BF","CV","CI","GM","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG","CF","TD","CG","CD","GQ","GA","ST","BI","AO","KE","UG","TZ","RW","ET","DJ","ER","SO","SS","SD","KM","MG","MU","SC","ZA","ZM","ZW","MW","MZ","NA","BW","SZ","LS"]).map(x=>x.trim().toUpperCase()).filter(Boolean);
const requestedSourceKeys=[...new Set((Deno.env.get("SOURCE_KEYS")??"").split(",").map(x=>x.trim()).filter(Boolean))];
if(requestedSourceKeys.length>20) throw new Error("A source batch is limited to 20 unique keys.");

const started=Date.now();
const GLOBAL_BUDGET_MS=110*60*1000;
const SOURCE_BUDGET_MS=3*60*1000;
const SOURCE_CONCURRENCY=8;
const deadlineAt=started+GLOBAL_BUDGET_MS;

type Metric=Record<string,any>;
type BatchSource=SourceDefinition&{sourceKey:string;sourceName:string;url:string};
type Task={country:string;source:BatchSource};
const metrics:Metric[]=[];
const tasks:Task[]=[];

if(requestedSourceKeys.length){
  const requested=new Set(requestedSourceKeys);
  const definitions=SOURCE_REGISTRY.filter(source=>requested.has(source.key));
  const found=new Set(definitions.map(source=>source.key));
  for(const missing of requestedSourceKeys.filter(key=>!found.has(key))){
    metrics.push({sourceKey:missing,sourceName:missing,countryCode:"",listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,contactRejected:0,missingPublicationDate:0,freshnessRejected:0,harvestCandidates:0,rejectedReasons:{unknown_source:1},advertisedCount:null,errors:["UNKNOWN_SOURCE_KEY"]});
  }
  for(const definition of definitions){
    const source={...definition,enabled:true,status:"active" as const};
    const targetCountries=source.countries.filter(code=>countries.includes(code));
    if(!targetCountries.length){
      metrics.push({sourceKey:source.key,sourceName:source.name,countryCode:"",listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,contactRejected:0,missingPublicationDate:0,freshnessRejected:0,harvestCandidates:0,rejectedReasons:{country_not_selected:1},advertisedCount:null,errors:["NO_COUNTRY_IN_RUN_SCOPE"]});
      continue;
    }
    for(const country of targetCountries){
      const resolved=resolveSourceUrl(source,country);
      if(!resolved.url){
        metrics.push({sourceKey:source.key,sourceName:source.name,countryCode:country,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,contactRejected:0,missingPublicationDate:0,freshnessRejected:0,harvestCandidates:0,rejectedReasons:{unresolved:1},advertisedCount:null,errors:["UNRESOLVED_SOURCE_URL"]});
        continue;
      }
      tasks.push({country,source:{...source,key:source.key,name:source.name,sourceKey:source.key,sourceName:source.name,url:resolved.url}});
    }
  }
}else{
  for(const country of countries){
    for(const resolved of resolveCountrySources(country)){
      const definition=SOURCE_REGISTRY.find(source=>source.key===resolved.sourceKey);
      if(!definition) continue;
      tasks.push({country,source:{...definition,key:definition.key,name:definition.name,sourceKey:definition.key,sourceName:definition.name,url:resolved.url}});
    }
  }
}

const harvestCandidates:Metric[]=[];
let cursor=0;
async function worker(){
  while(Date.now()<deadlineAt){
    const i=cursor++;
    if(i>=tasks.length) return;
    const {country,source}=tasks[i];
    let contactAccepted=0,contactRejected=0,missingPublicationDate=0,freshnessRejected=0;
    try{
      const result=await crawlExhaustiveSource(
        {...source,enabled:true,status:"active",key:source.key,name:source.name,countries:[country]},
        country,
        {deadlineAt:Math.min(deadlineAt,Date.now()+SOURCE_BUDGET_MS)}
      );
      for(const item of result.items) {
        if(source.key==="ajira_portal" && /kuitwa kwenye usaili|call for interview|interview shortlist|placement results|appointed candidates|majina ya walioitwa|walioitwa kazini/i.test(item.title+" "+item.description)) continue;

        const contact=extractApplicationContact(item.title+"\n"+item.description);
        if(!contact.email&&!contact.phone){contactRejected++;continue;}

        // No publication date means no automatic admission: do not replace it with today's harvest date.
        if(!item.published){missingPublicationDate++;continue;}
        const observedAt=new Date().toISOString();
        const freshness=resolveEffectivePublicationDate({
          sourcePublishedAt:item.published,
          firstHarvestAt:null,
          createdAt:null,
          deadline:item.deadline,
          now:observedAt,
        });
        if(!freshness.visible){freshnessRejected++;continue;}

        const displayModel=resolveSourceDisplayModel(source.key,source.type,source.captureMode,source.renderRequired);
        harvestCandidates.push({
          sourceKey:source.key,sourceName:source.name,sourceType:source.type,sourceCaptureMode:source.captureMode,
          renderRequired:source.renderRequired,displayModel,countryCode:country,title:item.title,description:item.description,
          company:item.company,location:item.location,url:item.url,deadline:item.deadline,published:item.published,
          applicationEmail:contact.email,applicationPhone:contact.phone,discoveredAt:observedAt,
          publicationDateEstimated:freshness.publicationDateEstimated,
          publicationDateSource:freshness.publicationDateSource,opportunityType:item.opportunityType
        });
        contactAccepted++;
      }
      metrics.push({...result.stats,sourceName:source.name,contactAccepted,contactRejected,missingPublicationDate,
        freshnessRejected,harvestCandidates:contactAccepted,displayModel:resolveSourceDisplayModel(source.key,source.type,source.captureMode,source.renderRequired),
        samples:result.items.slice(0,5).map(x=>({title:x.title,url:x.url,published:x.published,deadline:x.deadline}))});
    }catch(e){
      metrics.push({sourceKey:source.key,sourceName:source.name,countryCode:country,listingPages:0,detailPages:0,discoveredUrls:0,extracted:0,eligible:0,fresh:0,expired:0,internships:0,consultancies:0,applications:0,tenders:0,rejected:0,contactAccepted,contactRejected,missingPublicationDate,freshnessRejected,harvestCandidates:contactAccepted,rejectedReasons:{runtime:1},advertisedCount:null,errors:[e instanceof Error?e.message:String(e)]});
    }
  }
}
await Promise.all(Array.from({length:Math.min(SOURCE_CONCURRENCY,Math.max(1,tasks.length))},()=>worker()));

const completedCountries=[...new Set(metrics.map(x=>x.countryCode).filter(Boolean))];
const control=metrics.map(x=>({
  country:x.countryCode,source:x.sourceName,sourceCount:x.advertisedCount,discovered:x.discoveredUrls,extracted:x.extracted,
  eligible:x.eligible,expired:x.expired,rejected:x.rejected,contactAccepted:x.contactAccepted??0,
  contactRejected:x.contactRejected??0,missingPublicationDate:x.missingPublicationDate??0,
  freshnessRejected:x.freshnessRejected??0,harvestCandidates:x.harvestCandidates??0,
  internships:x.internships,consultancies:x.consultancies,tenders:x.tenders,errors:(x.errors??[]).length,
  gap:x.advertisedCount===null?null:x.advertisedCount-x.eligible
}));
const uniqueCandidates=[...new Map(harvestCandidates.map(item=>[item.sourceKey+"\n"+item.url,item])).values()];
const summary={
  generatedAt:new Date().toISOString(),mode:"SOURCE_BATCH_SHADOW_HARVEST",publication:false,deployment:false,
  selectedSourceKeys:requestedSourceKeys,countries,completedCountries,partial:metrics.length<(tasks.length+metrics.filter(x=>x.errors?.includes("UNKNOWN_SOURCE_KEY")||x.errors?.includes("NO_COUNTRY_IN_RUN_SCOPE")||x.errors?.includes("UNRESOLVED_SOURCE_URL")).length),
  requestedSources:requestedSourceKeys.length||null,sources:metrics.length,totalPlannedSources:tasks.length,
  accessible:metrics.filter(x=>(x.errors??[]).length===0).length,failed:metrics.filter(x=>(x.errors??[]).length>0).length,
  listingPages:metrics.reduce((n,x)=>n+x.listingPages,0),detailPages:metrics.reduce((n,x)=>n+x.detailPages,0),
  discoveredUrls:metrics.reduce((n,x)=>n+x.discoveredUrls,0),totalExtracted:metrics.reduce((n,x)=>n+x.extracted,0),
  totalEligible:metrics.reduce((n,x)=>n+x.eligible,0),contactAccepted:metrics.reduce((n,x)=>n+(x.contactAccepted??0),0),
  contactRejected:metrics.reduce((n,x)=>n+(x.contactRejected??0),0),
  missingPublicationDate:metrics.reduce((n,x)=>n+(x.missingPublicationDate??0),0),
  freshnessRejected:metrics.reduce((n,x)=>n+(x.freshnessRejected??0),0),
  harvestCandidates:uniqueCandidates.length,expired:metrics.reduce((n,x)=>n+x.expired,0),
  rejected:metrics.reduce((n,x)=>n+x.rejected,0),internships:metrics.reduce((n,x)=>n+x.internships,0),
  consultancies:metrics.reduce((n,x)=>n+x.consultancies,0),tenders:metrics.reduce((n,x)=>n+x.tenders,0),
  durationMs:Date.now()-started,globalBudgetMs:GLOBAL_BUDGET_MS,sourceBudgetMs:SOURCE_BUDGET_MS
};
await Deno.writeTextFile("africa-shadow-harvest-candidates.json",JSON.stringify(uniqueCandidates,null,2));
console.log(JSON.stringify({summary,control,metrics},null,2));
