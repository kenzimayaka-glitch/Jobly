import type {SupabaseClient} from "@supabase/supabase-js";
import {buildCEOIntelligence} from "@/lib/ceoIntelligence";
import {buildJiaContext} from "@/lib/jiaContext";
import {buildCareerTwin,getCognitiveSnapshot,ingestExternalSignal,remember,updateBelief,createPrediction,reflect} from "./cognitive";
import {publishTraceEvent} from "./eventBus";
import {buildJiaSelfModel} from "./selfModel";
import {buildNextBestActions,type Signal} from "./intelligence";
import {planJiaAction} from "./agent";
import {evaluateJiaPolicy} from "./policy";
import {observeInternet} from "./internet";

export const JIA_COGNITIVE_CYCLE=["PERCEIVE","UNDERSTAND","MEMORY","BELIEF","WORLD_MODEL","REASON","PREDICT","ANTICIPATE","GOAL","PLAN","POLICY","PROPOSE","ACT","VERIFY","EVALUATE","REFLECT","LEARN"] as const;
export type JiaCycleInput={userId:string;ecosystem?:"TALENT"|"RECRUITER"|"PARTNER"|"MOBILITY"|"COMMUNITY"|"BUSINESS"|"ADMIN";scope?:"USER"|"ADMIN";ceoSnapshot?:(Awaited<ReturnType<typeof buildCEOIntelligence>> & {joblyIntelligence360?:{alerts?:Array<{id:string;severity:string;title:string;detail:string}>;decisions?:Array<{id:string;title:string;module:string;recommendation:string;priority:string;status:string}>;currentMetrics?:Array<{key:string;label:string;available:boolean;change:number|null}>}});path?:string;action?:string;message?:string;internetQuery?:string;includeInternet?:boolean};

export async function runUnifiedCognitiveCycle(sb:SupabaseClient,input:JiaCycleInput){
 const ecosystem=input.ecosystem??"TALENT";
 const adminScope=input.scope==="ADMIN"||ecosystem==="ADMIN";
 const [{context},snapshot]=await Promise.all([
  adminScope?Promise.resolve({context:null as any,error:null}):buildJiaContext(sb,input.userId,{operation:"UNIFIED_COGNITIVE_CYCLE",input:{path:input.path??"",action:input.action??"",message:input.message??""}}),
  getCognitiveSnapshot(input.userId)
 ]);
 const ceo:NonNullable<JiaCycleInput["ceoSnapshot"]>|null =
  adminScope ? (input.ceoSnapshot ?? await buildCEOIntelligence(sb)) : null;
 let internetAvailable=Boolean((snapshot.self?.state as Record<string,unknown>|undefined)?.internetAvailable);
 let internetObservation:Awaited<ReturnType<typeof observeInternet>>["observation"]|null=null;
 const failures:string[]=[];
 if(input.includeInternet&&input.internetQuery?.trim()){
  try{
   const signal=await observeInternet(input.internetQuery.trim(),{mode:"READ",maxQueries:3,maxSources:10});
   internetObservation=signal.observation;
   internetAvailable=signal.observation.internetAvailable;
   if(signal.observation.internetAvailable&&(signal.observation.sourcesUsed.length>0||signal.observation.facts.length>0)){
    await ingestExternalSignal(input.userId,{query:signal.observation.query,facts:signal.observation.facts,confidence:signal.observation.confidence,status:signal.observation.status,supportingSources:signal.observation.supportingSources,contradictingSources:signal.observation.contradictingSources,context:signal.observation.context});
   }else if(!signal.observation.internetAvailable){
    failures.push("INTERNET_UNAVAILABLE");
    await reflect({userId:input.userId,triggerType:"INTERNET_FAILURE",expectation:{query:input.internetQuery},result:{available:false,limitations:signal.observation.limitations},error:{message:"Internet Brain returned no available network evidence"},learning:{policy:"OFFLINE_FALLBACK"},nextStrategy:{useCachedVerifiedSignals:true}});
   }
  }catch(error){internetAvailable=false; failures.push("INTERNET_UNAVAILABLE"); await reflect({userId:input.userId,triggerType:"INTERNET_FAILURE",expectation:{query:input.internetQuery},result:{available:false},error:{message:error instanceof Error?error.message:"unknown"},learning:{policy:"OFFLINE_FALLBACK"},nextStrategy:{useCachedVerifiedSignals:true}}); }
 }
 const signals:Signal[]=[];
 if(internetObservation?.internetAvailable&&internetObservation.sourcesUsed.length>0){
  const externalConfidence=internetObservation.confidence>=.75?"HIGH":internetObservation.confidence>=.45?"MEDIUM":"LOW";
  const evidenceSummary=internetObservation.facts.slice(0,3).join(" · ")||("Sources externes consultées : "+internetObservation.sourcesUsed.length);
  signals.push({id:"internet-brain-evidence",type:"EXTERNAL_WEB_EVIDENCE",title:"Éléments externes vérifiés",detail:evidenceSummary+" · statut "+internetObservation.status+" · fraîcheur "+internetObservation.freshness,confidence:externalConfidence});
 }
 if(adminScope&&ceo){
   for(const alert of ceo.alerts)signals.push({id:"ceo-risk:"+alert.id,type:"CEO_RISK",title:alert.title,detail:alert.detail,confidence:alert.severity==="CRITICAL"?"HIGH":"MEDIUM"});
   for(const alert of ceo.joblyIntelligence360?.alerts??[])signals.push({id:"bi-alert:"+alert.id,type:"BI_ALERT",title:alert.title,detail:alert.detail,confidence:alert.severity.toLowerCase()==="critical"?"HIGH":"MEDIUM"});
   for(const metric of ceo.joblyIntelligence360?.currentMetrics??[]){
    if(metric.available&&metric.change!==null&&metric.change<=-20)signals.push({id:"bi-decline:"+metric.key,type:"BI_TREND_DECLINE",title:metric.label+" en baisse",detail:"Variation observée de "+metric.change.toFixed(1)+"% sur la période comparée.",confidence:"MEDIUM"});
   }
   for(const decision of (ceo.joblyIntelligence360?.decisions??[]).filter((item)=>item.priority.toLowerCase()==="critical"||item.priority.toLowerCase()==="high").slice(0,10))signals.push({id:"bi-decision:"+decision.id,type:"BI_DECISION",title:decision.title,detail:decision.recommendation,confidence:decision.priority.toLowerCase()==="critical"?"HIGH":"MEDIUM"});
   for(const opportunity of ceo.opportunities)signals.push({id:"ceo-opportunity:"+opportunity.id,type:"CEO_OPPORTUNITY",title:opportunity.title,detail:opportunity.reason,confidence:"MEDIUM"});
   if(ceo.temporal.pendingApprovals>0)signals.push({id:"ceo-approvals",type:"CEO_APPROVAL_QUEUE",title:"Approbations CEO en attente",detail:String(ceo.temporal.pendingApprovals)+" trace(s) attendent une validation.",confidence:"HIGH"});
 }else{
   if(context?.gaps?.length)signals.push({id:"career-gap",type:"CAREER_GAP",title:"Career Gap",detail:context.gaps.join(" · "),confidence:"HIGH"});
   if((context?.readiness??0)>=70)signals.push({id:"profile-ready",type:"PROFILE_TO_OPPORTUNITY",title:"Readiness élevée",detail:"Le profil dispose de signaux suffisants pour recalculer ses opportunités.",confidence:"MEDIUM"});
   if(input.action&&/search|recherch|filtr|offre|job/i.test(input.action))signals.push({id:"search-intent",type:"SEARCH_PATTERN",title:"Intention de recherche",detail:"Une recherche récente peut être transformée en plan.",confidence:"MEDIUM"});
 }
 const recommendations=buildNextBestActions(signals),top=recommendations[0]??null;
 const cycleConfidence=top?.confidence==="HIGH"?.88:top?.confidence==="MEDIUM"?.65:.4;
 await remember({userId:input.userId,type:"WORKING",content:{kind:"UNIFIED_CYCLE_CONTEXT",path:input.path??"",action:input.action??"",message:input.message??"",ecosystem,signals,recommendation:top?.title??null},source:"JIA_RUNTIME",confidence:cycleConfidence,importance:.4,relevance:.9,contradictionKey:"working-context:"+ecosystem+":"+(input.path??"unknown").slice(0,120),futureUtility:.6});
 if(top) await updateBelief({userId:input.userId,key:"next-best-action:"+ecosystem,belief:"La prochaine action pertinente identifiée est : "+top.title,confidence:cycleConfidence,status:"LIKELY",evidence:signals.map(s=>s.id)});
 const predictionRequested=/\b(prévoir|prévision|prediction|predict|forecast|dans\s+(?:7|30|90)\s+jours)\b/i.test(input.message??"");
 const prediction=predictionRequested&&top?await createPrediction({userId:input.userId,prediction:"Le signal de prochaine action restera pertinent pour le cycle à venir : "+top.title,probability:cycleConfidence,horizon:"NEXT_CYCLE",context:{ecosystem,path:input.path??"",signalIds:signals.map(s=>s.id),recommendationId:top.id},expectedAt:new Date(Date.now()+7*86400000).toISOString()}):null;
 const policy=evaluateJiaPolicy({level:"PROPOSE",minimumLevel:"PROPOSE",ecosystem,action:top?.title??"JIA_ANALYZE",consent:true,risk:0.2});
 let actionRun:null|Awaited<ReturnType<typeof planJiaAction>>=null;
 if(top&&policy.allowed){
  try{
   actionRun=await planJiaAction({
    userId:input.userId,goal:{type:"NEXT_BEST_ACTION",title:top.title},plan:{cycle:JIA_COGNITIVE_CYCLE,recommendation:top},
    policy:{level:"PROPOSE",minimumLevel:"PROPOSE",ecosystem,action:top.title,risk:0.2,consent:true},
    precondition:{userContextAvailable:Boolean(context),recommendationConfidence:top.confidence},
    action:{type:top.actionType,entityType:top.entityType??null,entityId:top.entityId??null}
   });
  }catch(error){
   failures.push("ACTION_PLAN_FAILED");
   await reflect({userId:input.userId,triggerType:"ACTION_PLAN_FAILURE",expectation:{action:top.actionType},result:{planned:false},error:{message:error instanceof Error?error.message:"unknown"},learning:{policy:"ALTERNATIVE_STRATEGY"},nextStrategy:{action:"PROPOSE_ONLY"}});
  }
 }
 const trace=await publishTraceEvent(sb,{userId:input.userId,type:"JIA_COGNITIVE_CYCLE",ecosystem,source:"JIA_RUNTIME",payload:{path:input.path??"",action:input.action??"",recommendationId:top?.id??null}},{
  stage:top?"RECOMMENDATION":"INSIGHT",title:"Cycle cognitif unifié",
  content:top?"Prochaine action proposée : "+top.title:"Cycle exécuté sans action proposée.",
  confidence:top?.confidence??"MEDIUM",evidence:signals,metadata:{cycle:JIA_COGNITIVE_CYCLE,internetAvailable,internetStatus:internetObservation?.status??null,internetSources:internetObservation?.sourcesUsed.length??0,failures,memoryCount:snapshot.memory.length,predictionCount:snapshot.predictions.length}
 });
 if(!adminScope) await buildCareerTwin(input.userId);
 const selfModel=await buildJiaSelfModel(sb,input.userId,{ecosystem,internetAvailable,currentGoal:top?.title??null,extraLimitations:failures});
 return{ok:true,cycle:JIA_COGNITIVE_CYCLE,context,recommendations,prediction,actionRun,selfModel,trace,ceo,internet:internetObservation?{
  available:internetObservation.internetAvailable,status:internetObservation.status,confidence:internetObservation.confidence,
  freshness:internetObservation.freshness,facts:internetObservation.facts.slice(0,5),
  sources:internetObservation.sourcesUsed.slice(0,8).map(source=>({title:source.title,url:source.url,authority:source.authority,freshness:source.freshness})),
  limitations:internetObservation.limitations
 }:null};
}
