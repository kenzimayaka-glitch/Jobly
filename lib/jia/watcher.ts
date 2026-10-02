import { createHash } from "node:crypto";
import { observeInternet } from "@/lib/jia/internet";
import { ingestExternalSignal } from "@/lib/jia/cognitive";
import { publishTraceEvent } from "@/lib/jia/eventBus";
import { adminClient } from "@/lib/server-auth";
import { getAfricaCountry } from "@/lib/countries/africa";

export type JiaWatchTarget = { key:string; query:string; domain:string; intervalMs?:number; countries?:string[] };
type WatchSubscription = { id:string; userId:string; key:string; query:string; domain:string; country:string|null; frequencyMinutes:number };

function signalHash(signal: Awaited<ReturnType<typeof observeInternet>>) {
  return createHash("sha256").update(JSON.stringify({
    facts: signal.observation.facts ?? [],
    sources: (signal.observation.sourcesUsed ?? []).map((source) => source.url).sort(),
    status: signal.observation.status,
  })).digest("hex");
}
function nextCheck(frequencyMinutes:number) {
  return new Date(Date.now() + Math.max(15, frequencyMinutes) * 60_000).toISOString();
}

export async function watchExternal(userId:string,target:JiaWatchTarget,subscription?:WatchSubscription) {
  const sb=adminClient();
  const signal=await observeInternet(target.query,{mode:"PROACTIVE",maxQueries:2,maxSources:8});
  const hash=signalHash(signal);
  const previousHash=subscription?.id
    ? (await sb.from("JiaWatchSubscription").select("lastSignalHash").eq("id",subscription.id).maybeSingle()).data?.lastSignalHash
    : null;
  const changed=Boolean(previousHash && previousHash!==hash);
  const scheduledFor=new Date().toISOString();
  const runId=createHash("sha256").update(userId+":"+target.key+":"+scheduledFor).digest("hex").slice(0,32);

  await ingestExternalSignal(userId,{
    query:target.query,facts:signal.observation.facts,confidence:signal.observation.confidence,status:signal.observation.status,
    supportingSources:signal.observation.supportingSources,contradictingSources:signal.observation.contradictingSources,
    context:{...signal.observation.context,watchKey:target.key,domain:target.domain},
  });

  await sb.from("JiaWatchRun").upsert({
    id:runId,subscriptionId:subscription?.id ?? target.key,scheduledFor,status:"COMPLETED",startedAt:scheduledFor,
    finishedAt:new Date().toISOString(),signalHash:hash,changeCount:changed?1:0,confidence:signal.observation.confidence,
    intelligenceDecision:changed?"NOTIFY":"OBSERVE",relevanceScore:Number(signal.observation.context?.relevance??.5),
    impactScore:Number(signal.observation.context?.impact??.5),noveltyScore:changed?1:0,
    contradictionScore:signal.observation.status==="CONTESTED"?1:0,notificationEligible:changed,
    decisionReason:changed?"Nouveau signal depuis la dernière veille.":"Aucun changement depuis la dernière veille.",
  });

  await sb.from("JiaWatchSnapshot").upsert({
    id:createHash("sha256").update((subscription?.id??target.key)+":"+hash).digest("hex").slice(0,32),
    subscriptionId:subscription?.id??target.key,stateHash:hash,facts:signal.observation.facts??[],
    sources:signal.observation.sourcesUsed??[],context:{...signal.observation.context,watchKey:target.key,domain:target.domain},
    observedAt:new Date().toISOString(),
  },{onConflict:"subscriptionId,stateHash"});

  let notificationId:string|null=null;
  if(changed && subscription){
    const notification=await sb.from("Notification").insert({
      userId,type:"JIA_WATCH",title:"J’IA a détecté un changement",
      body:signal.observation.facts?.[0]||"Une nouvelle information correspond à ta veille.",
      link:"/notifications",entityId:subscription.id,actionType:"JIA_WATCH",
      actionPayload:{subscriptionId:subscription.id,watchKey:target.key,signalHash:hash},
      locale:"fr",channels:{push:false,email:false,inApp:true},
    }).select("id").single();
    notificationId=notification.data?.id?String(notification.data.id):null;
  }

  await publishTraceEvent(adminClient(),{
    userId,type:"JIA_EXTERNAL_WATCH",ecosystem:target.domain,source:"JIA_WATCHER",
    payload:{watchKey:target.key,query:target.query,status:signal.observation.status,confidence:signal.observation.confidence,changed},
  },{
    stage:signal.observation.status==="CONTESTED"?"HYPOTHESIS":"INSIGHT",title:"Signal externe surveillé",
    content:signal.observation.facts?.[0]||"Aucun fait exploitable.",
    confidence:signal.observation.confidence>=.78?"HIGH":signal.observation.confidence>=.58?"MEDIUM":"LOW",
    evidence:signal.observation.sourcesUsed.map((s)=>({url:s.url,title:s.title,authority:s.authority,confidence:s.confidence})),
    metadata:{watchKey:target.key,memoryDecision:signal.observation.memoryDecision,changes:signal.observation.changes,changed},
  });

  if(subscription){
    await sb.from("JiaWatchSubscription").update({
      lastCheckedAt:new Date().toISOString(),nextCheckAt:nextCheck(subscription.frequencyMinutes),
      lastSignalHash:hash,lastConfidence:signal.observation.confidence,updatedAt:new Date().toISOString(),
    }).eq("id",subscription.id);
    if(notificationId) await sb.from("JiaWatchRun").update({notificationId}).eq("id",runId);
  }
  return {...signal,changed,notificationId,signalHash:hash};
}

export async function upsertWatchSubscription(userId:string,target:JiaWatchTarget,options?:{frequencyMinutes?:number;notificationMode?:string}) {
  const sb=adminClient();
  const frequencyMinutes=Math.max(15,Number(options?.frequencyMinutes??1440));
  const payload={
    id:createHash("sha256").update(userId+":"+target.key).digest("hex").slice(0,32),userId,key:target.key,
    query:target.query,domain:target.domain,country:target.countries?.join(",")||null,frequencyMinutes,active:true,
    notificationMode:options?.notificationMode??"DIGEST",validationMode:"EXPLICIT_CONFIRMATION",
    nextCheckAt:nextCheck(frequencyMinutes),updatedAt:new Date().toISOString(),
  };
  const {data,error}=await sb.from("JiaWatchSubscription").upsert(payload,{onConflict:"userId,key"}).select("*").single();
  if(error) throw new Error(error.message);
  return data as WatchSubscription;
}
export async function stopWatchSubscription(userId:string,key:string) {
  const sb=adminClient();
  const {data,error}=await sb.from("JiaWatchSubscription").update({active:false,nextCheckAt:null,updatedAt:new Date().toISOString()})
    .eq("userId",userId).eq("key",key).select("id,key,active").maybeSingle();
  if(error) throw new Error(error.message);
  return data;
}
export async function runDueWatchSubscriptions(limit=20) {
  const sb=adminClient(),now=new Date().toISOString();
  const {data:subscriptions,error}=await sb.from("JiaWatchSubscription").select("*").eq("active",true).lte("nextCheckAt",now)
    .order("nextCheckAt",{ascending:true}).limit(limit);
  if(error) throw new Error(error.message);
  const results=[];
  for(const subscription of subscriptions??[]){
    try{
      const target:JiaWatchTarget={key:subscription.key,query:subscription.query,domain:subscription.domain,countries:subscription.country?subscription.country.split(",").filter(Boolean):undefined};
      results.push(await watchExternal(String(subscription.userId),target,subscription as WatchSubscription));
    }catch(error){
      await sb.from("JiaWatchSubscription").update({lastCheckedAt:now,nextCheckAt:nextCheck(Number(subscription.frequencyMinutes??1440)),updatedAt:now}).eq("id",subscription.id);
      results.push({subscriptionId:subscription.id,error:error instanceof Error?error.message:"Watcher error"});
    }
  }
  return results;
}
export function monAfriqueWatchTarget(countries:string[]):JiaWatchTarget {
  const selected=Array.from(new Set(countries)).map(code=>getAfricaCountry(code)).filter(Boolean);
  const names=selected.map(country=>country!.name);
  const query=names.length ? `nouvelles offres emploi ${names.join(" OR ")} recrutement` : "nouvelles offres emploi Afrique recrutement";
  return {key:"mon-afrique",query,domain:"Jobs",countries:selected.map(country=>country!.code)};
}
export function defaultWatchTargets():JiaWatchTarget[] {
  return [
    {key:"jobs-cameroon",query:"nouvelles offres emploi Cameroun recrutement",domain:"Jobs"},
    {key:"skills-africa",query:"compétences recherchées emploi Afrique 2026",domain:"Career"},
    {key:"recruitment-market",query:"recrutement entreprises Cameroun marché emploi 2026",domain:"Business"},
    {key:"mobility",query:"mobilité professionnelle Afrique opportunités emploi 2026",domain:"Mobility"},
  ];
}
