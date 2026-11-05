import { NextRequest,NextResponse } from "next/server";
import { adminClient,ensureUser,getAuthUser } from "../../../../lib/server-auth";
import { hasRecruitmentRole,RECRUITMENT_READ_ROLES,RECRUITMENT_WRITE_ROLES } from "../../../../lib/recruitment360/access";

async function recruiterHasAccess(db:ReturnType<typeof adminClient>,userId:string,recruitmentId:string,roles:readonly string[]){
 const {data,error}=await db.from("RecruitmentRole").select("role").eq("recruitmentId",recruitmentId).eq("userId",userId).limit(10);
 if(error)throw new Error(error.message);
 return (data??[]).some((row:any)=>hasRecruitmentRole(row.role,roles));
}
async function recruitmentForApplication(db:ReturnType<typeof adminClient>,applicationId:string){
 const {data:application,error}=await db.from("Application").select("id,userId,recruiterJobId").eq("id",applicationId).maybeSingle();
 if(error)throw new Error(error.message);
 if(!application)return null;
 if(!application.recruiterJobId)return {application,recruitment:null};
 const {data:recruitment,error:recruitmentError}=await db.from("Recruitment360").select("id").eq("recruiterJobId",application.recruiterJobId).maybeSingle();
 if(recruitmentError)throw new Error(recruitmentError.message);
 return {application,recruitment};
}
function parseRating(value:unknown){
 const number=Number(value);
 return Number.isInteger(number)&&number>=1&&number<=5?number:null;
}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req);
 if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth);
  const rid=String(req.nextUrl.searchParams.get("recruitmentId")??"").trim();
  const aid=String(req.nextUrl.searchParams.get("applicationId")??"").trim();
  if(!rid)return NextResponse.json({message:"recruitmentId requis."},{status:400});

  if(aid){
   const resolved=await recruitmentForApplication(s,aid);
   if(!resolved)return NextResponse.json({message:"Candidature introuvable."},{status:404});
   if(!resolved.recruitment||String(resolved.recruitment.id)!==rid)return NextResponse.json({message:"Candidature hors recrutement."},{status:404});
   const recruiterAllowed=await recruiterHasAccess(s,String(u.id),rid,RECRUITMENT_READ_ROLES);
   const candidateAllowed=String(resolved.application.userId)===String(auth.id);
   if(!recruiterAllowed&&!candidateAllowed)return NextResponse.json({message:"FORBIDDEN"},{status:403});

   let reviewQuery=s.from("RecruitmentReview").select("*")
    .eq("applicationId",aid).order("createdAt",{ascending:false});
   // A person who is also a recruiter remains a candidate on their own application.
   if(candidateAllowed)reviewQuery=reviewQuery.eq("reviewerUserId",auth.id).eq("reviewerRole","TALENT");
   const {data:reviews,error:reviewError}=await reviewQuery;
   if(reviewError)throw new Error(reviewError.message);

   let reports:any[]=[];
   if(recruiterAllowed&&!candidateAllowed){
    const {data,error}=await s.from("RecruitmentReportShare")
     .select("id,applicationId,scope,expiresAt,revokedAt,lastAccessedAt,accessCount,createdAt")
     .eq("recruitmentId",rid).eq("applicationId",aid).order("createdAt",{ascending:false});
    if(error)throw new Error(error.message);
    reports=data??[];
   }
   return NextResponse.json({reviews:reviews??[],reports});
  }

  if(!(await recruiterHasAccess(s,String(u.id),rid,RECRUITMENT_READ_ROLES)))
   return NextResponse.json({message:"FORBIDDEN"},{status:403});
  const [{data:reports,error:reportsError},{data:reviews,error:reviewsError}]=await Promise.all([
   s.from("RecruitmentReportShare").select("id,applicationId,scope,expiresAt,revokedAt,lastAccessedAt,accessCount,createdAt")
    .eq("recruitmentId",rid).order("createdAt",{ascending:false}),
   s.from("RecruitmentReview").select("*").eq("recruitmentId",rid).order("createdAt",{ascending:false})
  ]);
  if(reportsError)throw new Error(reportsError.message);
  if(reviewsError)throw new Error(reviewsError.message);
  return NextResponse.json({reports:reports??[],reviews:reviews??[]});
 }catch(e){
  const message=e instanceof Error?e.message:"Erreur.";
  return NextResponse.json({message},{status:message==="FORBIDDEN"?403:500});
 }
}

export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);
 if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth),b=await req.json().catch(()=>({}));
  if(b.action==="report"){
   const recruitmentId=String(b.recruitmentId??"").trim();
   if(!recruitmentId)return NextResponse.json({message:"recruitmentId requis."},{status:400});
   if(!(await recruiterHasAccess(s,String(u.id),recruitmentId,RECRUITMENT_WRITE_ROLES)))
    return NextResponse.json({message:"FORBIDDEN"},{status:403});
   if(b.applicationId){
    const resolved=await recruitmentForApplication(s,String(b.applicationId));
    if(!resolved||!resolved.recruitment||String(resolved.recruitment.id)!==recruitmentId)
     return NextResponse.json({message:"Candidature hors recrutement."},{status:404});
    if(String(resolved.application.userId)===String(auth.id))
     return NextResponse.json({message:"Un candidat ne peut pas générer un rapport recruteur pour sa propre candidature."},{status:403});
   }
   const {data,error}=await s.rpc("recruitment360_lot7_get_report",{
    p_recruitment_id:recruitmentId,p_actor_user_id:u.id
   });
   if(error)throw error;
   return NextResponse.json({report:data},{status:201});
  }

  if(b.action==="review"){
   const applicationId=String(b.applicationId??"").trim();
   if(!applicationId)return NextResponse.json({message:"APPLICATION_REQUIRED"},{status:400});
   const resolved=await recruitmentForApplication(s,applicationId);
   if(!resolved||!resolved.recruitment)return NextResponse.json({message:"APPLICATION_360_NOT_FOUND"},{status:404});
   const candidateAllowed=String(resolved.application.userId)===String(auth.id);
   const recruiterAllowed=await recruiterHasAccess(s,String(u.id),String(resolved.recruitment.id),RECRUITMENT_WRITE_ROLES);
   if(!candidateAllowed&&!recruiterAllowed)return NextResponse.json({message:"FORBIDDEN"},{status:403});
   const processRating=parseRating(b.processRating),experienceRating=parseRating(b.experienceRating),joblyRating=parseRating(b.joblyRating);
   if(processRating===null||experienceRating===null||joblyRating===null)
    return NextResponse.json({message:"INVALID_RATING"},{status:400});
   const comment=String(b.reviewText??b.comment??"").trim();
   if(comment.length>2000)return NextResponse.json({message:"COMMENT_TOO_LONG"},{status:400});
   const recommendation=typeof b.recommendation==="boolean"?b.recommendation:null;
   const {data,error}=await s.rpc("recruitment360_lot7_submit_review",{
    p_application_id:applicationId,p_actor_user_id:candidateAllowed?auth.id:u.id,
    p_reviewer_role:candidateAllowed?"TALENT":"RECRUITER",
    p_process_rating:processRating,p_experience_rating:experienceRating,
    p_jobly_rating:joblyRating,p_recommendation:recommendation,p_comment:comment||null
   });
   if(error)throw error;
   return NextResponse.json({review:data},{status:201});
  }
  return NextResponse.json({message:"action invalide."},{status:400});
 }catch(e){
  const error=e as {message?:string;code?:string};
  const message=error.message||"Opération impossible.";
  const status=error.code==="42501"||message.includes("FORBIDDEN")?403:
   message.includes("REQUIRED")||message.includes("INVALID")||message.includes("SHORT")||message.includes("TOO_LONG")?400:409;
  return NextResponse.json({message},{status});
 }
}
