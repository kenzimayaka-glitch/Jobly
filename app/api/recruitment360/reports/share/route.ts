import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { adminClient } from "@/lib/server-auth";

export const runtime="nodejs";

function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}

function sanitize(report:any,scope:string,applicationId?:string){
 const applications=Array.isArray(report?.applications)?report.applications:[];
 const selected=scope==="APPLICATION_SUMMARY"?applications.filter((a:any)=>a.applicationId===applicationId):applications;
 return {
  job:{title:report?.job?.title||"Recrutement",companyName:report?.job?.companyName||"Entreprise",location:report?.job?.location||null,contract:report?.job?.contract||null,mode:report?.job?.mode||null},
  recruitment:{currentState:report?.recruitment?.currentState||null,createdAt:report?.recruitment?.createdAt||null,closedAt:report?.recruitment?.closedAt||null,completedAt:report?.recruitment?.completedAt||null},
  funnel:report?.funnel||{},
  metrics:report?.metrics||{},
  reviews:report?.reviews||{},
  applications:selected.map((a:any)=>({applicationId:a.applicationId,candidateName:a.candidateName,state:a.state,submittedAt:a.submittedAt,updatedAt:a.updatedAt,atsScore:a.atsScore,decisionOutcome:a.decisionOutcome,decisionAt:a.decisionAt,scoreTotal:a.scoreTotal}))
 };
}

export async function GET(req:NextRequest){
 const token=req.nextUrl.searchParams.get("token")||"";
 if(token.length<32)return NextResponse.json({message:"Lien invalide."},{status:404});
 const sb=adminClient();
 const {data:share,error}=await sb.from("RecruitmentReportShare").select("id,recruitmentId,applicationId,scope,expiresAt,revokedAt,createdByUserId,accessCount").eq("tokenHash",hashToken(token)).maybeSingle();
 if(error||!share||share.revokedAt||new Date(share.expiresAt).getTime()<=Date.now())return NextResponse.json({message:"Lien expiré ou révoqué."},{status:410});
 const {data:report,error:re}=await sb.rpc("recruitment360_lot7_get_report",{p_recruitment_id:share.recruitmentId,p_actor_user_id:share.createdByUserId});
 if(re)return NextResponse.json({message:"Rapport indisponible."},{status:404});
 const clean=sanitize(report,share.scope,share.applicationId||undefined);
 await sb.from("RecruitmentReportShare").update({"lastAccessedAt":new Date().toISOString(),"accessCount":Number(share.accessCount||0)+1}).eq("id",share.id);
 return NextResponse.json({report:clean,expiresAt:share.expiresAt});
}
