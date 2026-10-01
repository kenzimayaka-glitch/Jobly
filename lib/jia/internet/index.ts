import {DuckDuckGoAdapter} from "./search";
import {fetchSource} from "./fetch";
import {contextualize} from "./contextualize";
import {freshnessPolicy} from "./freshness";
import {detectChanges} from "./changeDetection";
import {verifyEvidence} from "./verify";
import {getJiaInternetConfig,canInternetRead} from "./policy";
import {getObservationCache,getSearchCache,getSourceCache,setObservationCache,setSearchCache,setSourceCache} from "./cache";
import type {BrainSignal,ExternalObservation,JiaInternetConfig,MemoryDecision,SearchResult,SourceEvidence} from "./types";
const adapter=new DuckDuckGoAdapter();
function memoryDecision(o:ExternalObservation,c:JiaInternetConfig):MemoryDecision{if(!o.internetAvailable)return"IGNORE";if(o.context.impact>=.8&&o.confidence>=c.memoryThreshold)return"IMPORTANT_EVENT";if(o.confidence>=c.memoryThreshold&&o.context.relevance>=.7)return"BELIEF";if(o.context.relevance>=.65)return"TEMPORARY_MEMORY";if(o.sourcesUsed.length)return"CACHE";return"IGNORE";}
function empty(query:string,limitation:string):ExternalObservation{return{query,sourcesFound:0,sourcesUsed:[],facts:[],supportingSources:[],contradictingSources:[],status:"UNKNOWN",confidence:0,freshness:"unknown",changes:[],context:{domains:[],relevance:0,impact:0,urgency:0},memoryDecision:"IGNORE",internetAvailable:false,limitations:[limitation]};}
function signal(o:ExternalObservation):BrainSignal{const proposal=o.context.relevance>=.7&&o.confidence>=.62?"Je propose d'examiner ce signal externe concernant "+(o.context.domains.slice(0,3).join(", ")||"Jobly")+".":undefined;return{type:"JIA_EXTERNAL_SIGNAL",observation:o,beliefCandidate:o.confidence>=.62&&o.status!=="CONTESTED"?{belief:o.facts[0]||o.query,confidence:o.confidence,status:o.status,evidence:o.supportingSources.slice(0,4)}:undefined,proposal};}
async function search(q:string,c:JiaInternetConfig){const cached=getSearchCache(q);if(cached)return cached;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),c.timeoutMs);try{const r=await adapter.search(q,c.maxSources,controller.signal);setSearchCache(q,r,c.cacheTtlMs);return r;}finally{clearTimeout(timer);}}
export async function observeInternet(query:string,overrides?:Partial<JiaInternetConfig>):Promise<BrainSignal>{
  const base=getJiaInternetConfig();const c={...base,...overrides};const q=query.trim().slice(0,300);if(!q)throw new Error("query_required");
  const cached=getObservationCache(q);if(cached)return signal(cached);if(!canInternetRead(c))return signal(empty(q,"Internet Brain désactivé."));
  const limitations:string[]=[];const results:SearchResult[]=[];let internetAvailable=true;
  try{results.push(...await search(q,c));}catch(e){internetAvailable=false;limitations.push(e instanceof Error?e.message:"search_failed");}
  const unique=Array.from(new Map(results.map(r=>[r.url,r])).values()).slice(0,c.maxSources);const sources:SourceEvidence[]=[];
  for(const r of unique){try{const cachedSource=getSourceCache(r.url);const s=cachedSource||await fetchSource(r.url,c.timeoutMs);if(!cachedSource)setSourceCache(r.url,s,c.cacheTtlMs);s.freshness=freshnessPolicy({informationType:q,publishedAt:s.publishedAt,retrievedAt:s.retrievedAt});sources.push(s);}catch(e){limitations.push(r.url+": "+(e instanceof Error?e.message:"fetch_failed"));}}
  const v=verifyEvidence(q,sources);const o=contextualize(q,{query:q,sourcesFound:unique.length,sourcesUsed:sources,facts:v.facts,supportingSources:v.supportingSources,contradictingSources:v.contradictingSources,status:v.status,confidence:v.confidence,freshness:sources.some(s=>s.freshness==="fresh")?"fresh":sources.some(s=>s.freshness==="recent")?"recent":"unknown",changes:detectChanges(sources),context:{domains:[],relevance:0,impact:0,urgency:0},memoryDecision:"IGNORE",internetAvailable,limitations});
  o.memoryDecision=memoryDecision(o,c);setObservationCache(q,o,c.cacheTtlMs);return signal(o);
}