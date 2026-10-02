import {observeInternet} from "@/lib/jia/internet";
import type {BrainSignal} from "@/lib/jia/internet/types";
import {ingestExternalSignal} from "@/lib/jia/cognitive";

export type JiaMarketWatchItem={
 query:string;
 status:"CONFIRMED"|"LIKELY"|"CONTESTED"|"UNKNOWN";
 confidence:number;
 facts:string[];
 sources:Array<{title:string;url:string;domain:string;authority:number}>;
 contradictions:string[];
 changes:number;
 limitations:string[];
};

const QUERIES=[
 "marché emploi Cameroun recrutement tendances 2026",
 "compétences recherchées Afrique emploi 2026",
 "recrutement entreprises Cameroun 2026"
];

export async function buildMarketWatch(userId?:string):Promise<JiaMarketWatchItem[]>{
 const items:JiaMarketWatchItem[]=[];
 for(const query of QUERIES){
  try{
   const signal:BrainSignal=await observeInternet(query,{mode:"PROACTIVE",maxQueries:2,maxSources:6});
   const o=signal.observation;
   if(userId) await ingestExternalSignal(userId,{query:o.query,facts:o.facts,confidence:o.confidence,status:o.status,supportingSources:o.supportingSources,contradictingSources:o.contradictingSources,context:o.context});
   items.push({
    query,status:o.status,confidence:o.confidence,facts:o.facts.slice(0,5),
    sources:o.sourcesUsed.slice(0,6).map(s=>({title:s.title,url:s.url,domain:s.domain,authority:s.authority})),
    contradictions:o.contradictingSources.slice(0,10),changes:o.changes.length,limitations:o.limitations.slice(0,5)
   });
  }catch(error){
   items.push({query,status:"UNKNOWN",confidence:0,facts:[],sources:[],contradictions:[],changes:0,limitations:[error instanceof Error?error.message:"Veille indisponible."]});
  }
 }
 return items;
}
