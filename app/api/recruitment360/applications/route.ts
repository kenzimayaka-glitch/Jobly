import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "../../../../lib/server-auth";
import {hasRecruitmentRole,RECRUITMENT_READ_ROLES,RECRUITMENT_WRITE_ROLES} from "../../../../lib/recruitment360/access";

async function applicationRecruitmentId(db:ReturnType<typeof adminClient>,applicationId:string){
 const {data:application,error}=await db.from("Application").select("id,recruiterJobId").eq("id",applicationId).maybeSingle();
 if(error)throw new Error(error.message);
 if(!application?.recruiterJobId)return null;
 const {data:recruitment,error:recruitmentError}=await db.from("Recruitment360").select("id").eq("recruiterJobId",application.recruiterJobId).maybeSingle();
 if(recruitmentError)throw new Error(recruitmentError.message);
 return recruitment?.id??null;
}
async function hasRecruitmentAccess(db:ReturnType<typeof adminClient>,userId:string,recruitmentId:string,allowedRoles:readonly string[]){
 const {data,error}=await db.from("RecruitmentRole").select("role").eq("recruitmentId",recruitmentId).eq("userId",userId).limit(10);
 if(error)throw new Error(error.message);
 return (data??[]).some((row:any)=>hasRecruitmentRole(row.role,allowedRoles));
}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth),rid=req.nextUrl.searchParams.get("recruitmentId");
  const {data:roles,error:re}=await s.from("RecruitmentRole").select("recruitmentId,role").eq("userId",u.id).in("role",[...RECRUITMENT_READ_ROLES]);
  if(re)throw new Error(re.message);
  const authorizedIds=[...new Set((roles??[]).filter((row:any)=>hasRecruitmentRole(row.role)).map((row:any)=>String(row.recruitmentId)))];
  if(rid&&!authorizedIds.includes(rid))return NextResponse.json({message:"Accès refusé à ce recrutement."},{status:403});
  const ids=rid?[rid]:authorizedIds;
  if(!ids.length)return NextResponse.json({applications:[]});
  const {data:r,error:rr}=await s.from("Recruitment360").select("id,recruiterJobId").in("id",ids);
  if(rr)throw new Error(rr.message);
  const jobs=(r??[]).map((x:any)=>x.recruiterJobId).filter(Boolean);
  if(!jobs.length)return NextResponse.json({applications:[]});
  const {data:apps,error:aerr}=await s.from("Application").select("id,userId,recruiterJobId,status,cvUrl,cvPhotoUrl,letterText,createdAt,updatedAt").in("recruiterJobId",jobs).order("updatedAt",{ascending:false});
  if(aerr)throw new Error(aerr.message);
  const aid=(apps??[]).map((a:any)=>a.id);
  const [assessRes,shortRes]=await Promise.all([
   aid.length?s.from("RecruitmentApplicationAssessment").select("*").in("applicationId",aid):Promise.resolve({data:[],error:null}),
   aid.length?s.from("RecruitmentShortlist").select("*").in("applicationId",aid):Promise.resolve({data:[],error:null})
  ]);
  if(assessRes.error)throw new Error(assessRes.error.message);
  if(shortRes.error)throw new Error(shortRes.error.message);
  const am=new Map((assessRes.data??[]).map((x:any)=>[x.applicationId,x]));
  const sm=new Map((shortRes.data??[]).map((x:any)=>[x.applicationId,x]));
  return NextResponse.json({applications:(apps??[]).map((a:any)=>({...a,assessment:am.get(a.id)??null,shortlist:sm.get(a.id)??null}))});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500})}
}

export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth),b=await req.json().catch(()=>({}));
  if(b.action==="score"){
   const {data,error}=await s.rpc("recruitment360_lot3_score_application",{p_application_id:b.applicationId,p_actor_user_id:u.id});
   if(error)throw error;
   return NextResponse.json({assessment:data});
  }
  if(b.action==="shortlist"){
   const {data,error}=await s.rpc("recruitment360_lot3_set_shortlist",{p_application_id:b.applicationId,p_actor_user_id:u.id,p_status:b.status,p_reason:b.reason??null,p_defer_until:b.deferUntil??null,p_rank:b.rank??null});
   if(error)throw error;
   return NextResponse.json({shortlist:data});
  }
  if(b.action==="document"){
   const applicationId=String(b.applicationId??"").trim(),kind=String(b.kind??"").trim().toUpperCase(),url=String(b.url??"").trim();
   if(!applicationId||!kind||!url)return NextResponse.json({message:"DOCUMENT_FIELDS_REQUIRED"},{status:400});
   if(!/^[A-Z][A-Z0-9_]{1,39}$/.test(kind))return NextResponse.json({message:"DOCUMENT_KIND_INVALID"},{status:400});
   let parsed:URL;
   try{parsed=new URL(url)}catch{return NextResponse.json({message:"DOCUMENT_URL_INVALID"},{status:400});}
   if(parsed.protocol!=="https:"||parsed.username||parsed.password||url.length>2048)return NextResponse.json({message:"DOCUMENT_URL_INVALID"},{status:400});
   const recruitmentId=await applicationRecruitmentId(s,applicationId);
   if(!recruitmentId)return NextResponse.json({message:"APPLICATION_360_NOT_FOUND"},{status:404});
   if(!(await hasRecruitmentAccess(s,String(u.id),String(recruitmentId),RECRUITMENT_WRITE_ROLES)))return NextResponse.json({message:"FORBIDDEN"},{status:403});
   const fileSize=b.fileSize==null?null:Number(b.fileSize);
   if(fileSize!==null&&(!Number.isInteger(fileSize)||fileSize<0||fileSize>25*1024*1024))return NextResponse.json({message:"DOCUMENT_SIZE_INVALID"},{status:400});
   const fileName=b.fileName==null?null:String(b.fileName).slice(0,180);
   const mimeType=b.mimeType==null?null:String(b.mimeType).slice(0,128);
   const {data,error}=await s.from("RecruitmentApplicationDocument").insert({applicationId,kind,url:parsed.toString(),fileName,mimeType,fileSize}).select().single();
   if(error)throw error;
   return NextResponse.json({document:data},{status:201});
  }
  return NextResponse.json({message:"ACTION_REQUIRED"},{status:400});
 }catch(e){
  const error=e as {message?:string;code?:string};
  const message=error.message||"Erreur.";
  const status=error.code==="42501"||message.includes("FORBIDDEN")?403:400;
  return NextResponse.json({message},{status});
 }
}
