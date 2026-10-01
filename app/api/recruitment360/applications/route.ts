import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "../../../../lib/server-auth";
export async function GET(req:NextRequest){
 const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{const s=adminClient(),u=await ensureUser(s,auth),rid=new URL(req.url).searchParams.get("recruitmentId");
  const {data:roles,error:re}=await s.from("RecruitmentRole").select("recruitmentId").eq("userId",u.id); if(re)throw new Error(re.message);
  const ids=rid?[rid]:[...new Set((roles??[]).map((x:any)=>x.recruitmentId))]; if(!ids.length)return NextResponse.json({applications:[]});
  const {data:r,error:rr}=await s.from("Recruitment360").select("id,recruiterJobId").in("id",ids);if(rr)throw new Error(rr.message);
  const jobs=(r??[]).map((x:any)=>x.recruiterJobId); const {data:apps,error:aerr}=await s.from("Application").select("id,userId,recruiterJobId,status,cvUrl,cvPhotoUrl,letterText,createdAt,updatedAt").in("recruiterJobId",jobs).order("updatedAt",{ascending:false});if(aerr)throw new Error(aerr.message);
  const aid=(apps??[]).map((a:any)=>a.id); const {data:assess}=aid.length?await s.from("RecruitmentApplicationAssessment").select("*").in("applicationId",aid):{data:[]};
  const {data:short}=aid.length?await s.from("RecruitmentShortlist").select("*").in("applicationId",aid):{data:[]};
  const am=new Map((assess??[]).map((x:any)=>[x.applicationId,x]));const sm=new Map((short??[]).map((x:any)=>[x.applicationId,x]));
  return NextResponse.json({applications:(apps??[]).map((a:any)=>({...a,assessment:am.get(a.id)??null,shortlist:sm.get(a.id)??null}))});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500})}
}
export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{const s=adminClient(),u=await ensureUser(s,auth),b=await req.json();
  if(b.action==="score"){const {data,error}=await s.rpc("recruitment360_lot3_score_application",{p_application_id:b.applicationId,p_actor_user_id:u.id});if(error)throw new Error(error.message);return NextResponse.json({assessment:data});}
  if(b.action==="shortlist"){const {data,error}=await s.rpc("recruitment360_lot3_set_shortlist",{p_application_id:b.applicationId,p_actor_user_id:u.id,p_status:b.status,p_reason:b.reason??null,p_defer_until:b.deferUntil??null,p_rank:b.rank??null});if(error)throw new Error(error.message);return NextResponse.json({shortlist:data});}
  if(b.action==="document"){if(!b.applicationId||!b.kind||!b.url)throw new Error("DOCUMENT_FIELDS_REQUIRED");const {data,error}=await s.from("RecruitmentApplicationDocument").insert({applicationId:b.applicationId,kind:b.kind,url:b.url,fileName:b.fileName??null,mimeType:b.mimeType??null,fileSize:b.fileSize??null}).select().single();if(error)throw new Error(error.message);return NextResponse.json({document:data},{status:201});}
  throw new Error("ACTION_REQUIRED");
 }catch(e){const m=e instanceof Error?e.message:"Erreur.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:400})}
}