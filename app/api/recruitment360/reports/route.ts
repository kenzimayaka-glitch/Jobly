import { NextRequest,NextResponse } from "next/server";
import { adminClient,ensureUser,getAuthUser } from "../../../../lib/server-auth";

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth),rid=req.nextUrl.searchParams.get("recruitmentId"),aid=req.nextUrl.searchParams.get("applicationId");
  if(!rid)return NextResponse.json({message:"recruitmentId requis."},{status:400});
  if(aid){
   const {data:reviews,error}=await s.from("RecruitmentReview").select("*").eq("applicationId",aid).order("createdAt",{ascending:false});
   if(error)throw new Error(error.message);
   const {data:reports,error:re}=await s.from("RecruitmentReport").select("*").eq("applicationId",aid).order("generatedAt",{ascending:false});
   if(re)throw new Error(re.message);
   return NextResponse.json({reviews:reviews??[],reports:reports??[]});
  }
  const {data,error}=await s.rpc("recruitment360_lot7_list_reports",{p_recruitment_id:rid,p_actor_user_id:u.id});
  if(error)throw new Error(error.message);
  const {data:reviews,error:rv}=await s.from("RecruitmentReview").select("*").eq("recruitmentId",rid).order("createdAt",{ascending:false});
  if(rv)throw new Error(rv.message);
  return NextResponse.json({reports:data??[],reviews:reviews??[]});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500});}
}
export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth),b=await req.json();
  if(b.action==="report"){
   const {data,error}=await s.rpc("recruitment360_lot7_generate_report",{p_recruitment_id:b.recruitmentId,p_actor_user_id:u.id,p_report_type:b.reportType??"RECRUITMENT",p_application_id:b.applicationId??null});
   if(error)throw new Error(error.message);return NextResponse.json({report:data},{status:201});
  }
  if(b.action==="review"){
   const {data,error}=await s.rpc("recruitment360_lot7_submit_review",{p_recruitment_id:b.recruitmentId,p_application_id:b.applicationId,p_actor_user_id:u.id,p_recommendation:b.recommendation,p_review_text:b.reviewText,p_visible_to_candidate:Boolean(b.visibleToCandidate)});
   if(error)throw new Error(error.message);return NextResponse.json({review:data},{status:201});
  }
  return NextResponse.json({message:"action invalide."},{status:400});
 }catch(e){const m=e instanceof Error?e.message:"Opération impossible.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:m.includes("REQUIRED")||m.includes("INVALID")||m.includes("SHORT")?400:409});}
}