import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "../../../../lib/server-auth";
import {hasRecruitmentRole,RECRUITMENT_READ_ROLES,RECRUITMENT_WRITE_ROLES} from "../../../../lib/recruitment360/access";

const INTERVIEW_ROLES=["OWNER","HR","MANAGER","DELEGATE","JURY"] as const;
function failure(message:string){
 const status=message==="FORBIDDEN"?403:message.includes("NOT_FOUND")?404:
  message.includes("REQUIRED")||message.includes("INVALID")||message.includes("NOT_IN_RECRUITMENT")||message.includes("NOT_AVAILABLE")?400:409;
 return NextResponse.json({message},{status});
}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req);
 if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const db=adminClient(),user=await ensureUser(db,auth);
  const recruitmentId=req.nextUrl.searchParams.get("recruitmentId");
  const applicationId=req.nextUrl.searchParams.get("applicationId");
  let recruitmentIds:string[]=[];
  let candidateApplicationId:string|null=null;
  if(applicationId){
   const {data:application,error}=await db.from("Application").select("id,userId,recruiterJobId").eq("id",applicationId).maybeSingle();
   if(error)throw new Error(error.message);
   if(!application?.recruiterJobId)return NextResponse.json({message:"Candidature introuvable."},{status:404});
   const {data:recruitment,error:recruitmentError}=await db.from("Recruitment360").select("id").eq("recruiterJobId",application.recruiterJobId).maybeSingle();
   if(recruitmentError)throw new Error(recruitmentError.message);
   if(!recruitment)return NextResponse.json({message:"Recrutement introuvable."},{status:404});
   const {data:roles,error:roleError}=await db.from("RecruitmentRole").select("role").eq("recruitmentId",recruitment.id).eq("userId",user.id);
   if(roleError)throw new Error(roleError.message);
   const recruiterAllowed=(roles??[]).some((row:any)=>hasRecruitmentRole(row.role,INTERVIEW_ROLES));
   const candidateAllowed=String(application.userId)===String(user.id);
   if(!candidateAllowed&&!recruiterAllowed)return NextResponse.json({message:"FORBIDDEN"},{status:403});
   recruitmentIds=[recruitment.id];
   if(candidateAllowed)candidateApplicationId=applicationId;
  }else{
   const {data:roles,error}=await db.from("RecruitmentRole").select("recruitmentId,role").eq("userId",user.id).in("role",[...RECRUITMENT_READ_ROLES]);
   if(error)throw new Error(error.message);
   recruitmentIds=[...new Set((roles??[]).filter((row:any)=>hasRecruitmentRole(row.role,RECRUITMENT_READ_ROLES)).map((row:any)=>String(row.recruitmentId)))];
   if(recruitmentId){
    if(!recruitmentIds.includes(recruitmentId))return NextResponse.json({message:"FORBIDDEN"},{status:403});
    recruitmentIds=[recruitmentId];
   }
  }
  if(!recruitmentIds.length)return NextResponse.json({interviews:[]});
  let query=db.from("RecruitmentInterview").select("*").in("recruitmentId",recruitmentIds).order("startsAt",{ascending:true});
  if(candidateApplicationId)query=query.eq("applicationId",candidateApplicationId);
  const {data:interviews,error}=await query;
  if(error)throw new Error(error.message);
  const appIds=[...new Set((interviews??[]).map((row:any)=>String(row.applicationId)))];
  const {data:apps,error:appsError}=appIds.length?await db.from("Application").select("id,userId").in("id",appIds):{data:[],error:null};
  if(appsError)throw new Error(appsError.message);
  const userIds=[...new Set((apps??[]).map((row:any)=>String(row.userId)))];
  const {data:users,error:usersError}=userIds.length?await db.from("User").select("id,firstName,lastName,displayName").in("id",userIds):{data:[],error:null};
  if(usersError)throw new Error(usersError.message);
  const userMap=new Map((users??[]).map((row:any)=>[String(row.id),row]));
  const appMap=new Map((apps??[]).map((row:any)=>[String(row.id),row]));
  return NextResponse.json({interviews:(interviews??[]).map((row:any)=>{
   const candidate=userMap.get(String(appMap.get(String(row.applicationId))?.userId));
   return {...row,candidateName:candidate?.displayName||[candidate?.firstName,candidate?.lastName].filter(Boolean).join(" ")||"Candidat"};
  })});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Lecture des entretiens impossible."},{status:500});}
}

export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);
 if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const db=adminClient(),user=await ensureUser(db,auth),body=await req.json().catch(()=>({}));
  const action=String(body.action??"").trim().toLowerCase();
  if(action==="schedule"){
   const applicationId=String(body.applicationId??"").trim();
   const startsAt=String(body.startsAt??"").trim(),endsAt=String(body.endsAt??"").trim();
   const startDate=new Date(startsAt),endDate=new Date(endsAt);
   if(!applicationId||!startsAt||!endsAt||!Number.isFinite(startDate.getTime())||!Number.isFinite(endDate.getTime()))return failure("INTERVIEW_FIELDS_REQUIRED");
   if(endDate<=startDate||startDate<=new Date())return failure("INVALID_INTERVIEW_TIME");
   const {data:application,error}=await db.from("Application").select("recruiterJobId").eq("id",applicationId).maybeSingle();
   if(error)throw new Error(error.message);
   if(!application?.recruiterJobId)return failure("APPLICATION_NOT_FOUND");
   const provider=String(body.meetingProvider??"EXTERNAL").toUpperCase();
   if(!["GOOGLE_MEET","EXTERNAL","JOBLY_NATIVE"].includes(provider))return failure("INVALID_MEETING_PROVIDER");
   const meetingUrl=String(body.meetingUrl??"").trim();
   if(provider!=="JOBLY_NATIVE"){
    let url:URL;
    try{url=new URL(meetingUrl)}catch{return failure("MEETING_URL_REQUIRED");}
    if(url.protocol!=="https:"||url.username||url.password)return failure("INVALID_MEETING_URL");
   }
   const {data,error:rpcError}=await db.rpc("recruitment360_lot5_schedule",{
    p_recruiter_job_id:application.recruiterJobId,p_actor_user_id:String(user.id),p_application_id:applicationId,
    p_starts_at:startDate.toISOString(),p_ends_at:endDate.toISOString(),
    p_timezone:String(body.timezone||"Africa/Douala").slice(0,80),
    p_title:String(body.title||"Entretien Jobly").slice(0,160),
    p_meeting_provider:provider,p_meeting_url:provider==="JOBLY_NATIVE"?null:meetingUrl,
    p_location:body.location?String(body.location).slice(0,240):null,
    p_notes:body.notes?String(body.notes).slice(0,4000):null,
    p_slot_id:body.slotId||null,p_jury:Array.isArray(body.jury)?body.jury.slice(0,20):[]
   });
   if(rpcError)throw rpcError;
   return NextResponse.json({interview:data},{status:201});
  }
  if(action==="status"){
   const interviewId=String(body.interviewId??"").trim(),status=String(body.status??"").toUpperCase();
   if(!interviewId||!status)return failure("INTERVIEW_FIELDS_REQUIRED");
   const {data,error}=await db.rpc("recruitment360_lot5_change_status",{
    p_interview_id:interviewId,p_actor_user_id:String(user.id),p_status:status,p_reason:body.reason?String(body.reason).slice(0,1000):null
   });
   if(error)throw error;
   return NextResponse.json({interview:data});
  }
  return failure("ACTION_INVALID");
 }catch(error){
  const value=error as {message?:string;code?:string};
  return failure(value.message||"INTERVIEW_OPERATION_FAILED");
 }
}
