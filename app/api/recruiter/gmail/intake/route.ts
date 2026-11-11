import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "@/lib/server-auth";

async function gate(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return {response:NextResponse.json({message:"Session requise."},{status:401})};
 const db=adminClient();const user=await ensureUser(db,auth);
 if(user.role!=="RECRUITER"&&user.role!=="ADMIN")return {response:NextResponse.json({message:"Espace recruteur requis."},{status:403})};
 return {db,user};
}
export async function GET(req:NextRequest){
 try{
  const g=await gate(req);if("response"in g)return g.response;
  const {data,error}=await g.db.from("RecruiterGmailIntake").select("id,candidateUserId,candidateEmail,candidateName,sourceMessageId,sourceFilename,sourceJobTitle,atsScore,status,createdAt").eq("recruiterUserId",g.user.id).eq("status","PENDING").order("createdAt",{ascending:false}).limit(100);
  if(error)throw new Error(error.message);
  const {data:jobs,error:jobsError}=await g.db.from("RecruiterJob").select("id,title").eq("recruiterUserId",g.user.id);
  if(jobsError)throw new Error(jobsError.message);
  return NextResponse.json({items:data||[],jobs:jobs||[]},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"File Gmail indisponible."},{status:500});}
}
export async function POST(req:NextRequest){
 try{
  const g=await gate(req);if("response"in g)return g.response;
  const body=await req.json().catch(()=>({}));const intakeId=String(body.intakeId||"");const jobId=String(body.recruiterJobId||"");
  if(!intakeId||!jobId)return NextResponse.json({message:"Candidature et offre obligatoires."},{status:400});
  const [{data:intake,error:intakeError},{data:job,error:jobError}]=await Promise.all([
   g.db.from("RecruiterGmailIntake").select("*").eq("id",intakeId).eq("recruiterUserId",g.user.id).eq("status","PENDING").maybeSingle(),
   g.db.from("RecruiterJob").select("id,title").eq("id",jobId).eq("recruiterUserId",g.user.id).maybeSingle()
  ]);
  if(intakeError)throw new Error(intakeError.message);if(jobError)throw new Error(jobError.message);
  if(!intake)return NextResponse.json({message:"Candidature Gmail introuvable ou déjà traitée."},{status:404});
  if(!job)return NextResponse.json({message:"Cette offre ne vous appartient pas."},{status:403});
  const now=new Date().toISOString();const applicationId=newId();
  const {error:insertError}=await g.db.from("Application").insert({
   id:applicationId,userId:intake.candidateUserId,recruiterJobId:job.id,status:"SUBMITTED",language:"fr",letterText:null,
   atsScore:intake.atsScore,submittedAt:now,statusSource:"GMAIL",sourceType:"GMAIL",sourceMessageId:intake.sourceMessageId,
   sourceThreadId:intake.sourceThreadId,sourceEmail:intake.candidateEmail,sourceCandidateName:intake.candidateName,
   sourceAttachmentId:intake.sourceAttachmentId==="inline"?null:intake.sourceAttachmentId,sourceFilename:intake.sourceFilename,
   cvUrl:`/api/recruiter/gmail/attachment?intakeId=${encodeURIComponent(intake.id)}`,createdAt:now,updatedAt:now
  });
  if(insertError){
   const {data:existing}=await g.db.from("Application").select("id").eq("userId",intake.candidateUserId).eq("recruiterJobId",job.id).maybeSingle();
   if(!existing)throw new Error(insertError.message);
   const {error:updateError}=await g.db.from("RecruiterGmailIntake").update({status:"ASSIGNED",applicationId:existing.id,updatedAt:now}).eq("id",intake.id).eq("recruiterUserId",g.user.id);
   if(updateError)throw new Error(updateError.message);
   return NextResponse.json({applicationId:existing.id,idempotent:true});
  }
  const {error:updateError}=await g.db.from("RecruiterGmailIntake").update({status:"ASSIGNED",applicationId,updatedAt:now}).eq("id",intake.id).eq("recruiterUserId",g.user.id).eq("status","PENDING");
  if(updateError)throw new Error(updateError.message);
  return NextResponse.json({applicationId,assigned:true});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Affectation Gmail impossible."},{status:500});}
}
