import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}
function bad(message:string){return NextResponse.json({message},{status:message==="FORBIDDEN"?403:400});}

async function getWorkspaceReport(sb:any,recruitmentId:string,userId:string){
 const {data,error}=await sb.rpc("recruitment360_lot7_get_report",{p_recruitment_id:recruitmentId,p_actor_user_id:userId});
 if(error)throw new Error(error.message);
 return data;
}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const sb=adminClient(),user=await ensureUser(sb,auth),id=req.nextUrl.searchParams.get("recruitmentId");
  if(!id){
   const {data:roles,error:re}=await sb.from("RecruitmentRole").select("recruitmentId,role").eq("userId",user.id).in("role",["OWNER","HR","MANAGER","DG_READONLY","DELEGATE"]);
   if(re)throw new Error(re.message);
   const ids=[...new Set((roles??[]).map((x:any)=>x.recruitmentId))];
   if(!ids.length)return NextResponse.json({recruitments:[]});
   const {data:recs,error:ce}=await sb.from("Recruitment360").select("id,recruiterJobId,currentState,createdAt,completedAt").in("id",ids); if(ce)throw new Error(ce.message);
   const jobIds=(recs??[]).map((x:any)=>x.recruiterJobId);
   const {data:jobs,error:je}=jobIds.length?await sb.from("RecruiterJob").select("id,title,companyName").in("id",jobIds):{data:[],error:null}; if(je)throw new Error(je.message);
   const jm=new Map((jobs??[]).map((j:any)=>[j.id,j]));
   return NextResponse.json({recruitments:(recs??[]).map((r:any)=>({...r,title:jm.get(r.recruiterJobId)?.title||"Recrutement",companyName:jm.get(r.recruiterJobId)?.companyName||""}))});
  }
  const report=await getWorkspaceReport(sb,id,user.id);
  const {data:reviews,error:rvError}=await sb.from("RecruitmentReview").select("id,applicationId,reviewerUserId,reviewerRole,processRating,experienceRating,joblyRating,recommendation,comment,status,createdAt").eq("recruitmentId",id).order("createdAt",{ascending:false});
  if(rvError)throw new Error(rvError.message);
  const apps=Array.isArray(report?.applications)?report.applications:[];
  const firstSubmitted=apps.map((a:any)=>a.submittedAt).filter(Boolean).map((x:string)=>new Date(x).getTime()).sort((a:number,b:number)=>a-b)[0];
  if(report?.recruitment?.completedAt&&firstSubmitted){
   const days=Math.round(((new Date(report.recruitment.completedAt).getTime()-firstSubmitted)/86400000)*100)/100;
   report.metrics={...(report.metrics||{}),timeToHireDays:days};
  }
  const total=Number(report?.metrics?.applicationCount||0),withdrawn=Number(report?.metrics?.withdrawnCount||0);
  report.metrics={...(report.metrics||{}),abandonmentRate:total?Math.round((withdrawn/total)*10000)/100:0};
  const companyName=String(report?.job?.companyName||"").trim();
  if(companyName){
   const {data:jobs,error:je}=await sb.from("RecruiterJob").select("id").eq("companyName",companyName); if(je)throw new Error(je.message);
   const jobIds=(jobs||[]).map((j:any)=>j.id);
   const {data:recs,error:ce}=jobIds.length?await sb.from("Recruitment360").select("id").in("recruiterJobId",jobIds):{data:[],error:null}; if(ce)throw new Error(ce.message);
   const recIds=(recs||[]).map((r:any)=>r.id);
   const {data:companyReviews,error:cre}=recIds.length?await sb.from("RecruitmentReview").select("processRating,experienceRating,joblyRating").in("recruitmentId",recIds).eq("status","PUBLISHED"): {data:[],error:null}; if(cre)throw new Error(cre.message);
   const avg=(key:string)=>companyReviews?.length?Math.round((companyReviews.reduce((s:any,x:any)=>s+Number(x[key]||0),0)/companyReviews.length)*100)/100:null;
   report.companyScore={companyName,processAverage:avg("processRating"),experienceAverage:avg("experienceRating"),joblyAverage:avg("joblyRating"),publishedReviewCount:companyReviews?.length||0};
  }
  return NextResponse.json({report,reviews:reviews||[]});
 }catch(e){const m=e instanceof Error?e.message:"Erreur.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:500});}
}

export async function POST(req:NextRequest){
 const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const sb=adminClient(),user=await ensureUser(sb,auth),body=await req.json(),action=String(body.action||"");
  if(action==="createShare"){
   const recruitmentId=String(body.recruitmentId||"");
   if(!recruitmentId)return bad("RECRUITMENT_ID_REQUIRED");
   const {data:role}=await sb.from("RecruitmentRole").select("id").eq("recruitmentId",recruitmentId).eq("userId",user.id).in("role",["OWNER","HR","MANAGER","DG_READONLY","DELEGATE"]).maybeSingle();
   if(!role)throw new Error("FORBIDDEN");
   const hours=Math.min(Math.max(Number(body.hours||24),1),168);
   const token=randomBytes(32).toString("base64url");
   const expiresAt=new Date(Date.now()+hours*3600*1000).toISOString();
   const {data,error}=await sb.from("RecruitmentReportShare").insert({recruitmentId,applicationId:body.applicationId||null,tokenHash:hashToken(token),scope:body.applicationId?"APPLICATION_SUMMARY":"RECRUITMENT_SUMMARY",expiresAt,createdByUserId:user.id}).select("id,expiresAt,scope").single();
   if(error)throw new Error(error.message);
   return NextResponse.json({share:{...data,url:"/recruitment360/report/share?token="+encodeURIComponent(token)}} ,{status:201});
  }
  if(action==="revokeShare"){
   const shareId=String(body.shareId||"");
   const {data:share,error:se}=await sb.from("RecruitmentReportShare").select("id,recruitmentId").eq("id",shareId).single(); if(se)throw new Error(se.message);
   const {data:role}=await sb.from("RecruitmentRole").select("id").eq("recruitmentId",share.recruitmentId).eq("userId",user.id).in("role",["OWNER","HR","MANAGER","DELEGATE"]).maybeSingle();
   if(!role)throw new Error("FORBIDDEN");
   const {error}=await sb.from("RecruitmentReportShare").update({revokedAt:new Date().toISOString()}).eq("id",shareId); if(error)throw new Error(error.message);
   return NextResponse.json({ok:true});
  }
  if(action==="review"){
   const {data,error}=await sb.rpc("recruitment360_lot7_submit_review",{p_application_id:body.applicationId,p_actor_user_id:user.id,p_reviewer_role:body.reviewerRole,p_process_rating:Number(body.processRating),p_experience_rating:Number(body.experienceRating),p_jobly_rating:Number(body.joblyRating),p_recommendation:body.recommendation==null?null:Boolean(body.recommendation),p_comment:body.comment||null});
   if(error)throw new Error(error.message);
   return NextResponse.json({review:data},{status:201});
  }
  if(action==="moderateReview"){
   const {data,error}=await sb.rpc("recruitment360_lot7_moderate_review",{p_review_id:body.reviewId,p_actor_user_id:user.id,p_status:body.status});
   if(error)throw new Error(error.message);
   return NextResponse.json({review:data});
  }
  throw new Error("ACTION_INVALID");
 }catch(e){const m=e instanceof Error?e.message:"Erreur.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:400});}
}
