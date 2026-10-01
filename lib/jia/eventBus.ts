import type { SupabaseClient } from "@supabase/supabase-js";

export type JiaEventEnvelope={type:string;userId:string;ecosystem?:string;source?:string;correlationId?:string;occurredAt?:string;payload?:Record<string,unknown>};

function clean(v:unknown,max:number){return typeof v==="string"?v.trim().slice(0,max):undefined;}
function safePayload(v:Record<string,unknown>|undefined){if(!v)return{};return Object.fromEntries(Object.entries(v).slice(0,30).map(([k,x])=>[k.slice(0,80),typeof x==="string"?x.slice(0,800):x]));}

export async function publishJiaEvent(sb:SupabaseClient,event:JiaEventEnvelope){
 const occurredAt=event.occurredAt??new Date().toISOString(), correlationId=clean(event.correlationId,120)??crypto.randomUUID();
 const metadata={...safePayload(event.payload),ecosystem:clean(event.ecosystem,40)??null,source:clean(event.source,120)??null,correlationId,busVersion:"1.0"};
 const {data,error}=await sb.from("JiaEvent").insert({userId:event.userId,eventType:clean(event.type,120)??"JIA_EVENT",metadata,occurredAt,createdAt:occurredAt}).select("id,eventType,occurredAt,metadata").single();
 if(error)throw new Error(error.message); return data;
}

export async function publishTraceEvent(sb:SupabaseClient,event:JiaEventEnvelope,trace:{stage:string;title:string;content:string;confidence?:string;evidence?:unknown;metadata?:Record<string,unknown>;status?:string}){
 const correlationId=clean(event.correlationId,120)??crypto.randomUUID();
 const savedEvent=await publishJiaEvent(sb,{...event,correlationId});
 const {data,error}=await sb.from("JiaIntelligenceTrace").insert({userId:event.userId,stage:trace.stage,title:trace.title.slice(0,240),content:trace.content.slice(0,4000),confidence:trace.confidence??"MEDIUM",evidence:trace.evidence??[],sourceType:event.source??"JIA_EVENT_BUS",sourceRef:"event:"+event.type,status:trace.status ?? "COMPLETED",metadata:{...(trace.metadata??{}),correlationId}}).select("id,stage,status,confidence,createdAt").single();
 if(error)throw new Error(error.message); return{event:savedEvent,trace:data};
}
