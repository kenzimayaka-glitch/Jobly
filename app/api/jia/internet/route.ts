import type {NextRequest} from "next/server";
import {getAuthUser} from "@/lib/server-auth";
import {observeInternet} from "@/lib/jia/internet";
import {getJiaInternetConfig} from "@/lib/jia/internet/policy";
import {adminClient,ensureUser} from "@/lib/server-auth";
import {ingestExternalSignal} from "@/lib/jia/cognitive";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
  const auth=await getAuthUser(request);if(!auth)return Response.json({error:"SESSION_REQUIRED"},{status:401});
  try{const body=await request.json();const query=typeof body?.query==="string"?body.query:"";const c=getJiaInternetConfig();
    if(!c.enabled)return Response.json({type:"JIA_EXTERNAL_SIGNAL",observation:{...emptyPayload(query),limitations:["Internet Brain désactivé."]}});
    const result=await observeInternet(query,{mode:body?.mode==="PROACTIVE"?"PROACTIVE":c.mode,maxQueries:Math.min(c.maxQueries,Number(body?.maxQueries)||c.maxQueries),maxSources:Math.min(c.maxSources,Number(body?.maxSources)||c.maxSources)});
    const sb=adminClient(), user=await ensureUser(sb,auth);
    await ingestExternalSignal(user.id,{query:result.observation.query,facts:result.observation.facts,confidence:result.observation.confidence,status:result.observation.status,supportingSources:result.observation.supportingSources,contradictingSources:result.observation.contradictingSources,context:result.observation.context});
    return Response.json(result);
  }catch(error){return Response.json({type:"JIA_EXTERNAL_SIGNAL",observation:{...emptyPayload(""),limitations:[error instanceof Error?error.message:"internet_brain_failed"]}});}
}
function emptyPayload(query:string){return{query,internetAvailable:false,status:"UNKNOWN",sourcesFound:0,sourcesUsed:[],facts:[],supportingSources:[],contradictingSources:[],confidence:0,freshness:"unknown",changes:[],context:{domains:[],relevance:0,impact:0,urgency:0},memoryDecision:"IGNORE",limitations:[]};}