import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../../lib/server-auth";
import { createVideoRoom, recordingIsAllowed } from "../../../../../../../lib/recruitment360/video-provider";

type Ctx={params:Promise<{id:string}>};

async function workspace(s:any,id:string,userId:string){
 const {data:i,error}=await s.from("RecruitmentInterview").select("id,recruitmentId,applicationId,startsAt,endsAt,status,meetingProvider,meetingUrl").eq("id",id).single();
 if(error||!i)throw new Error("INTERVIEW_NOT_FOUND");
 const {data:a}=await s.from("Application").select("id,userId").eq("id",i.applicationId).single();
 const {data:r}=await s.from("RecruitmentRole").select("id,role").eq("recruitmentId",i.recruitmentId).eq("userId",userId).maybeSingle();
 if(String(a?.userId)!==String(userId)&&!r)throw new Error("FORBIDDEN");
 return {i,a,r};
}
export async function GET(req:NextRequest,c:Ctx){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const id=(await c.params).id,s=adminClient(),u=await ensureUser(s,auth),{i}=await workspace(s,id,u.id);
  const {data:session}=await s.from("RecruitmentInterviewVideoSession").select("*").eq("interviewId",id).maybeSingle();
  const {data:consents}=await s.from("RecruitmentInterviewRecordingConsent").select("userId,consented,consentedAt,revokedAt,consentVersion").eq("interviewId",id);
  const mine=(consents||[]).find((x:any)=>String(x.userId)===String(u.id));
  const {data:notes}=r?await s.from("RecruitmentInterviewNote").select("id,authorUserId,body,createdAt,updatedAt").eq("interviewId",id).order("createdAt",{ascending:true}):{data:[]};
  return NextResponse.json({interview:i,video:session,viewerRole:r?.role||"TALENT",myConsent:mine||null,consentCount:(consents||[]).filter((x:any)=>x.consented&&!x.revokedAt).length,notes:notes||[],recordingAllowed:session?recordingIsAllowed(session.provider):false});
 }catch(e){const m=e instanceof Error?e.message:"Erreur.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:m==="INTERVIEW_NOT_FOUND"?404:500});}
}
export async function POST(req:NextRequest,c:Ctx){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const id=(await c.params).id,b=await req.json(),s=adminClient(),u=await ensureUser(s,auth),{i,r}=await workspace(s,id,u.id);
  if(b.action==="prepare"){
   let {data:session}=await s.from("RecruitmentInterviewVideoSession").select("*").eq("interviewId",id).maybeSingle();
   if(!session){
    const roomName="jobly-"+crypto.randomBytes(18).toString("base64url");
    const room=createVideoRoom(roomName);
    const {data:created,error}=await s.from("RecruitmentInterviewVideoSession").insert({interviewId:id,provider:room.provider,roomName,createdByUserId:u.id,recordingStatus:room.provider==="EXTERNAL"?"OFF":"CONSENT_PENDING"}).select("*").single();
    if(error)throw new Error(error.message);session=created;
   }
   const room=createVideoRoom(session.roomName);
   return NextResponse.json({video:session,room,moderator:Boolean(r)});
  }
  const {data:session,error:se}=await s.from("RecruitmentInterviewVideoSession").select("*").eq("interviewId",id).single();
  if(se||!session)throw new Error("VIDEO_SESSION_NOT_FOUND");
  if(b.action==="start"){const {data:updated,error}=await s.from("RecruitmentInterviewVideoSession").update({status:"LIVE",startedAt:session.startedAt||new Date().toISOString(),updatedAt:new Date().toISOString()}).eq("id",session.id).select("*").single();if(error)throw new Error(error.message);return NextResponse.json({video:updated});}
  if(b.action==="end"){const {data:updated,error}=await s.rpc("recruitment360_lot9_finalize_video",{p_session_id:session.id,p_actor_user_id:u.id,p_participant_count:Math.max(1,Number(b.participantCount||1))});if(error)throw new Error(error.message);return NextResponse.json({video:updated});}
  if(b.action==="consent"){
   const consent=Boolean(b.consented);const {data:updated,error}=await s.from("RecruitmentInterviewRecordingConsent").upsert({interviewId:id,userId:u.id,consented:consent,consentVersion:"2026-10-01",consentedAt:consent?new Date().toISOString():null,revokedAt:consent?null:new Date().toISOString(),updatedAt:new Date().toISOString()},{onConflict:"interviewId,userId"}).select("*").single();if(error)throw new Error(error.message);
   return NextResponse.json({consent:updated});
  }
  if(b.action==="recording"){
   if(!r)throw new Error("FORBIDDEN");
   if(!recordingIsAllowed(session.provider))throw new Error("RECORDING_DISABLED_IN_FREE_TEST");
   const {data:all}=await s.from("RecruitmentInterviewRecordingConsent").select("userId,consented,revokedAt").eq("interviewId",id);
   if((all||[]).length<2||(all||[]).some((x:any)=>!x.consented||x.revokedAt))throw new Error("BOTH_PARTIES_MUST_CONSENT");
   const next=b.enabled?"RECORDING":"READY";const {data:updated,error}=await s.from("RecruitmentInterviewVideoSession").update({recordingStatus:next,recordingStartedAt:b.enabled?new Date().toISOString():session.recordingStartedAt,recordingEndedAt:b.enabled?null:new Date().toISOString(),updatedAt:new Date().toISOString()}).eq("id",session.id).select("*").single();if(error)throw new Error(error.message);return NextResponse.json({video:updated});
  }
  if(b.action==="note"){
   if(!r)throw new Error("FORBIDDEN");
   const body=String(b.body||"").trim();if(!body||body.length>10000)throw new Error("NOTE_REQUIRED");
   const {data:note,error}=await s.from("RecruitmentInterviewNote").insert({interviewId:id,authorUserId:u.id,body}).select("*").single();if(error)throw new Error(error.message);return NextResponse.json({note});
  }
  if(b.action==="presence"){
   const {data,error}=await s.rpc("recruitment360_lot5_update_presence",{p_interview_id:id,p_actor_user_id:u.id,p_participant_user_id:u.id,p_status:b.status==="LEFT"?"LEFT":"JOINED",p_role:r?.role||"TALENT"});if(error)throw new Error(error.message);return NextResponse.json({attendance:data});
  }
  return NextResponse.json({message:"Action inconnue."},{status:400});
 }catch(e){const m=e instanceof Error?e.message:"Erreur.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:m.includes("REQUIRED")||m.includes("DISABLED")||m.includes("MUST")?400:409});}
}
