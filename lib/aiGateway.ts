import { JIA_NAME } from "./ai/brand";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "./server-auth";
import { AI_CREDITS_BY_PLAN, AI_OPERATION_COST, type AiOperation, type AiPlan } from "./aiEconomics";

export type GatewayResult = { ok:true; operation:AiOperation; credits:number; remaining:number; provider:string; aiName:typeof JIA_NAME; output:unknown } | { ok:false; status:number; message:string };
const OPS = new Set<AiOperation>([
  "OFFER_INTELLIGENCE","CV_INTELLIGENCE","MATCHING","APPLICATION_COPILOT","APPLICATION_STRATEGY",
  "LEARNING","INTERVIEW","CAREER_COMPANION","NOTIFICATION"
]);
const normalize=(v:string)=>{const x=v.toUpperCase() as AiOperation; return OPS.has(x)?x:null};
const planOf=(s:any):AiPlan=>{const p=String(s?.planCode||"FREE"); return (["FREE","START","PREMIUM","PRO"] as string[]).includes(p)?p as AiPlan:"FREE"};
const sha=(v:unknown)=>crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const redactPII=(v:string)=>v.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").replace(/(?:\+?\d[\d\s().-]{7,}\d)/g,"[phone]").slice(0,4000);

const INPUT_KEYS:Record<AiOperation,string[]>={
  OFFER_INTELLIGENCE:["jobTitle","jobDescription","company","location","contract","skills"],
  CV_INTELLIGENCE:["cvText","targetRole","jobDescription"],
  MATCHING:["jobTitle","jobDescription","jobId","matchSignals"],
  APPLICATION_COPILOT:["jobTitle","jobDescription"],
  APPLICATION_STRATEGY:["jobTitle","jobDescription","applicationId","stage"],
  LEARNING:["goal","timePerWeek","targetRole","skillGaps"],
  INTERVIEW:["answer","difficulty","role","jobDescription","company"],
  CAREER_COMPANION:["goal","blocker","targetRole","horizon"],
  NOTIFICATION:["signalType","opportunityId","reason","urgency"]
};
const sanitizeInput=(op:AiOperation,input:any)=>{if(!input||typeof input!=="object")return {};return Object.fromEntries((INPUT_KEYS[op]||[]).filter(k=>typeof input[k]==="string"||typeof input[k]==="number"||Array.isArray(input[k])).map(k=>[k,Array.isArray(input[k])?input[k].slice(0,20).map((x:any)=>redactPII(String(x))):typeof input[k]==="string"?redactPII(String(input[k])):input[k]]));};

export async function runAiGateway(req:NextRequest, raw:string, input:any={}):Promise<GatewayResult>{
  const op=normalize(raw);if(!op)return {ok:false,status:400,message:"Opération IA inconnue."};
  const auth=await getAuthUser(req);if(!auth)return {ok:false,status:401,message:"Session requise."};
  const sb=adminClient();const user=await ensureUser(sb,auth);
  const {data:sub}=await sb.from("Subscription").select("planCode,status").eq("userId",user.id).in("status",["ACTIVE","TRIALING"]).order("createdAt",{ascending:false}).limit(1).maybeSingle();
  const plan=planOf(sub),cost=AI_OPERATION_COST[op],quota=AI_CREDITS_BY_PLAN[plan];

  const [pr,sr,er,jm]=await Promise.all([
    sb.from("Profile").select("headline,summary,location,targetRoles,preferredSectors,targetCities").eq("userId",user.id).maybeSingle(),
    sb.from("Skill").select("name,level").eq("userId",user.id).limit(50),
    sb.from("Experience").select("title,company,description").eq("userId",user.id).limit(20),
    sb.from("JiaMemory").select("category,key,value,confidence,source,lastObservedAt").eq("userId",user.id).order("lastObservedAt",{ascending:false}).limit(30)
  ]);
  if(pr.error||sr.error||er.error||jm.error)return {ok:false,status:500,message:(pr.error||sr.error||er.error||jm.error)?.message||"Contexte indisponible."};

  const gaps:string[]=[];
  if(!pr.data?.targetRoles?.length)gaps.push("Définir un métier cible");
  if(!sr.data?.length)gaps.push("Ajouter des compétences");
  if(!er.data?.length)gaps.push("Ajouter une expérience");
  if(!pr.data?.summary)gaps.push("Compléter le résumé");
  const safeInput=sanitizeInput(op,input);
  const safeProfile={...pr.data||{},headline:redactPII(String(pr.data?.headline||"")),summary:redactPII(String(pr.data?.summary||"")),location:redactPII(String(pr.data?.location||"")),targetRoles:(pr.data?.targetRoles||[]).map((x:any)=>redactPII(String(x))).slice(0,10),preferredSectors:(pr.data?.preferredSectors||[]).map((x:any)=>redactPII(String(x))).slice(0,10),targetCities:(pr.data?.targetCities||[]).map((x:any)=>redactPII(String(x))).slice(0,10)};
  const safeExperiences=(er.data||[]).map((x:any)=>({title:redactPII(String(x.title||"")),company:redactPII(String(x.company||"")),description:redactPII(String(x.description||""))}));
  const memory=(jm.data||[]).map((x:any)=>({category:String(x.category),key:String(x.key),value:x.value,confidence:Number(x.confidence||0),source:String(x.source),lastObservedAt:x.lastObservedAt}));
  const context={profile:safeProfile,skills:sr.data||[],experiences:safeExperiences,memory,gaps,readiness:Math.max(0,100-gaps.length*20),nextBestAction:gaps[0]||"Consulter les opportunités",input:safeInput,requestedModule:op};
  const started=Date.now(),requestHash=sha({op,input:safeInput,context:{profile:context.profile,skills:context.skills,experiences:context.experiences,memory:context.memory}});
  const {data:reservation,error:reservationError}=await sb.rpc("reserve_ai_credit",{p_user_id:user.id,p_plan_code:plan,p_operation:op,p_cost:cost,p_request_hash:requestHash});
  if(reservationError)return {ok:false,status:500,message:reservationError.message};
  const row=Array.isArray(reservation)?reservation[0]:reservation;
  if(!row?.allowed)return {ok:false,status:429,message:`Quota IA mensuel atteint (${Number(row?.used_credits||0)}/${quota} crédits).`};
  const usageId=String(row.usage_id);
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;const authorization=req.headers.get("authorization");
  if(!supabaseUrl||!supabaseKey||!authorization)return {ok:false,status:500,message:"Runtime Supabase IA non configuré."};
  const providerResponse=await fetch(`${supabaseUrl.replace(/\/$/,"")}/functions/v1/ai-core`,{method:"POST",headers:{Authorization:authorization,apikey:supabaseKey,"Content-Type":"application/json"},body:JSON.stringify({operation:op,input:safeInput,context,priority:"BALANCED"}),cache:"no-store",signal:AbortSignal.timeout(35000)});
  const orchestration=await providerResponse.json().catch(()=>({}));
  if(!providerResponse.ok||!orchestration?.ok)return {ok:false,status:502,message:String(orchestration?.message||"Runtime IA indisponible.").slice(0,300)};
  const {error:updateError}=await sb.from("AiUsage").update({provider:orchestration.provider,model:orchestration.model,latencyMs:Date.now()-started,success:true}).eq("id",usageId).eq("userId",user.id);
  if(updateError)return {ok:false,status:500,message:updateError.message};
  await sb.from("AuditLog").insert({userId:user.id,action:"AI_OPERATION",entityType:"AiUsage",metadata:{operation:op,credits:cost,provider:orchestration.provider,model:orchestration.model,attempts:orchestration.attempts,fallbackUsed:orchestration.fallbackUsed,requestHash,memorySignals:memory.length}});
  return {ok:true,operation:op,credits:cost,remaining:Number(row.remaining_credits),provider:orchestration.provider,aiName:JIA_NAME,output:orchestration.output}
}
