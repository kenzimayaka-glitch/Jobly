import { NextRequest } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "./server-auth";

export const JIA_MEMORY_CATEGORIES = ["career","mobility","campus","community","financial_signal","interaction_style"] as const;
export type JiaMemoryCategory = (typeof JIA_MEMORY_CATEGORIES)[number];

export const JIA_EVENT_TYPES = [
  "SESSION_START","SESSION_END","PAGE_VIEW","JOB_VIEW","JOB_SAVE","JOB_APPLY_START","JOB_APPLY_COMPLETE","AI_INTERACTION","SEARCH","LEARNING_ACTIVITY","PROFILE_UPDATE","NOTIFICATION_OPEN",
  "application_submitted","assessment_completed","campus_onboarded","event_checked_in","event_followup_sent","community_post_shared","mentorship_requested","mobility_plan_simulated","mobility_advance_requested",
] as const;
export type JiaEventType = (typeof JIA_EVENT_TYPES)[number];

export function safeJiaMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0,20)) {
    if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(key)) continue;
    if (typeof raw === "string") out[key]=raw.slice(0,300);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key]=raw;
    else if (typeof raw === "boolean" || raw===null) out[key]=raw;
  }
  return out;
}

export async function recordJiaEvent(req:NextRequest,payload:{eventType:string;sessionId?:string;path?:string;durationMs?:number;metadata?:unknown}) {
  const auth=await getAuthUser(req); if(!auth)return{ok:false as const,status:401,message:"Session requise."};
  const sb=adminClient(),user=await ensureUser(sb,auth);
  if(!user.privacyAcceptedAt)return{ok:true as const,recorded:false,reason:"PRIVACY_NOT_ACCEPTED"};
  if(!JIA_EVENT_TYPES.includes(payload.eventType as JiaEventType))return{ok:false as const,status:400,message:"Événement J’IA inconnu."};
  const eventType=payload.eventType as JiaEventType;
  const durationMs=typeof payload.durationMs==="number"&&Number.isFinite(payload.durationMs)?Math.max(0,Math.min(Math.round(payload.durationMs),86400000)):null;
  const path=typeof payload.path==="string"?payload.path.slice(0,500):null;
  const sessionId=typeof payload.sessionId==="string"?payload.sessionId.slice(0,100):null;
  const metadata=safeJiaMetadata(payload.metadata);
  const {error}=await sb.from("JiaEvent").insert({userId:user.id,eventType,sessionId,path,durationMs,metadata});
  if(error)return{ok:false as const,status:500,message:error.message};
  const memoryCategory:JiaMemoryCategory =
    eventType.startsWith("mobility_")?"mobility":
    eventType.startsWith("campus_")?"campus":
    (eventType.startsWith("event_")||eventType==="community_post_shared"||eventType==="mentorship_requested")?"community":
    (["JOB_VIEW","JOB_SAVE","JOB_APPLY_START","JOB_APPLY_COMPLETE","application_submitted","assessment_completed"].includes(eventType))?"career":"interaction_style";
  if(["PAGE_VIEW","SESSION_START","JOB_VIEW","application_submitted","assessment_completed","campus_onboarded","event_checked_in","community_post_shared","mentorship_requested","mobility_plan_simulated","mobility_advance_requested"].includes(eventType)){
    const key=eventType==="JOB_VIEW"?"last_job_view":"last_"+eventType.toLowerCase();
    await sb.from("JiaMemory").upsert({userId:user.id,category:memoryCategory,key,value:{eventType,path,metadata},confidence:0.5,source:"behavioral",lastObservedAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{onConflict:"userId,category,key"});
  }
  return{ok:true as const,recorded:true};
}
