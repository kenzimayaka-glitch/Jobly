import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth),applicationId=req.nextUrl.searchParams.get("applicationId"),recruitmentId=req.nextUrl.searchParams.get("recruitmentId");
  if(applicationId){
   const {data,error}=await s.from("RecruitmentDecision").select("*,RecruitmentDecisionVote(*)").eq("applicationId",applicationId).maybeSingle();
   if(error)throw new Error(error.message);return NextResponse.json({decision:data});
  }
  let ids:string[]=[];
  if(recruitmentId)ids=[recruitmentId];
  else{
   const {data:roles,error}=await s.from("RecruitmentRole").select("recruitmentId").eq("userId",u.id).in("role",["OWNER","HR","MANAGER","DELEGATE","JURY"]);
   if(error)throw new Error(error.message);ids=[...new Set((roles??[]).map((x:any)=>x.recruitmentId))];
  }
  const rows:any[]=[];
  for(const id of ids){
   const {data,error}=await s.rpc("recruitment360_lot6_list_candidates",{p_recruitment_id:id,p_actor_user_id:u.id});
   if(error)throw new Error(error.message);rows.push(...(data??[]));
  }
  const appIds=rows.map(x=>x.application_id);
  if(appIds.length){
   const {data:apps,error}=await s.from("Application").select("id,userId,recruiterJobId").in("id",appIds);if(error)throw new Error(error.message);
   const uids=[...new Set((apps??[]).map((x:any)=>x.userId).filter(Boolean))];
   const {data:users,error:ue}=uids.length?await s.from("User").select("id,firstName,lastName,displayName").in("id",uids):{data:[],error:null};if(ue)throw new Error(ue.message);
   const names=new Map((users??[]).map((x:any)=>[x.id,x.displayName||[x.firstName,x.lastName].filter(Boolean).join(" ")||"Candidat"]));
   const appMap=new Map((apps??[]).map((x:any)=>[x.id,x]));
   rows.forEach(x=>{const a=appMap.get(x.application_id);x.candidateName=a?names.get(a.userId)||"Candidat":"Candidat"});
  }
  return NextResponse.json({candidates:rows});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500});}
}

export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth),b=await req.json();
  if(b.action==="vote"){
   const {data,error}=await s.rpc("recruitment360_lot6_submit_vote",{p_application_id:b.applicationId,p_actor_user_id:u.id,p_recommendation:b.recommendation,p_score:b.score==null?null:Number(b.score),p_rationale:b.rationale??null,p_interview_id:b.interviewId??null});
   if(error)throw new Error(error.message);return NextResponse.json({decision:data},{status:201});
  }
  const {data,error}=await s.rpc("recruitment360_lot6_finalize_decision",{p_application_id:b.applicationId,p_actor_user_id:u.id,p_outcome:b.outcome,p_rationale:b.rationale,p_next_action:b.nextAction??null,p_score_total:b.scoreTotal==null?null:Number(b.scoreTotal),p_score_breakdown:b.scoreBreakdown??{}});
  if(error)throw new Error(error.message);
  const {data:a}=await s.from("Application").select("userId").eq("id",b.applicationId).single();
  if(a?.userId)await s.from("Notification").insert({userId:a.userId,type:"RECRUITMENT_DECISION",title:b.outcome==="REJECTED"?"Mise à jour de votre candidature":b.outcome==="POOL"?"Candidature conservée":"Suite de votre candidature",body:b.outcome==="REJECTED"?"Votre candidature a été clôturée.":b.outcome==="POOL"?"Votre candidature est conservée dans le vivier.":"Votre candidature avance dans le processus.",link:"/career",entityId:data.id,recruitmentId:data.recruitmentId,applicationId:b.applicationId,actionType:"OPEN_DECISION",actionPayload:{decisionId:data.id,outcome:b.outcome}});
  return NextResponse.json({decision:data},{status:201});
 }catch(e){const m=e instanceof Error?e.message:"Décision impossible.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:m.includes("REQUIRED")||m.includes("INVALID")?400:409});}
}