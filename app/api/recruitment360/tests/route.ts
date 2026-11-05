import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "../../../../lib/server-auth";
import {hasRecruitmentRole,RECRUITMENT_READ_ROLES} from "../../../../lib/recruitment360/access";

function fail(message:string){
 const status=message==="FORBIDDEN"?403:message.includes("NOT_FOUND")?404:
  message.includes("REQUIRED")||message.includes("INVALID")||message.includes("NOT_RUNNING")||message.includes("EXPIRED")||message.includes("MAX_ATTEMPTS")?400:409;
 return NextResponse.json({message},{status});
}
function publicQuestion(question:any){
 const options=question.options;
 const clean=(value:any)=>{
  if(Array.isArray(value))return value.map(clean);
  if(value&&typeof value==="object"){
   const copy={...value};
   for(const key of ["correct","answer","correctAnswer","acceptedAnswers","explanation","solution","grading"])delete copy[key];
   return copy;
  }
  return value;
 };
 return {...question,options:clean(options)};
}
async function authorizedApplication(db:ReturnType<typeof adminClient>,applicationId:string,userId:string){
 const {data:application,error}=await db.from("Application").select("id,userId,recruiterJobId").eq("id",applicationId).maybeSingle();
 if(error)throw new Error(error.message);
 if(!application?.recruiterJobId)return {application:null,recruitment:null,candidate:false,recruiter:false};
 const {data:recruitment,error:recruitmentError}=await db.from("Recruitment360").select("id").eq("recruiterJobId",application.recruiterJobId).maybeSingle();
 if(recruitmentError)throw new Error(recruitmentError.message);
 if(!recruitment)return {application,recruitment:null,candidate:String(application.userId)===userId,recruiter:false};
 const {data:roles,error:roleError}=await db.from("RecruitmentRole").select("role").eq("recruitmentId",recruitment.id).eq("userId",userId);
 if(roleError)throw new Error(roleError.message);
 return {
  application,recruitment,
  candidate:String(application.userId)===userId,
  recruiter:(roles??[]).some((row:any)=>hasRecruitmentRole(row.role,RECRUITMENT_READ_ROLES))
 };
}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req);
 if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const db=adminClient(),user=await ensureUser(db,auth);
  const applicationId=String(req.nextUrl.searchParams.get("applicationId")||"").trim();
  const testId=String(req.nextUrl.searchParams.get("testId")||"").trim();
  const sessionId=String(req.nextUrl.searchParams.get("sessionId")||"").trim();
  if(!applicationId)return fail("APPLICATION_REQUIRED");
  const scope=await authorizedApplication(db,applicationId,String(user.id));
  if(!scope.application||!scope.recruitment)return fail("APPLICATION_NOT_FOUND");
  if(!scope.candidate&&!scope.recruiter)return fail("FORBIDDEN");
  if(!scope.candidate)return fail("FORBIDDEN");
  if(!testId){
   const [{data:tests,error:testsError},{data:sessions,error:sessionsError}]=await Promise.all([
    db.from("RecruitmentTestDefinition").select("id,title,instructions,durationseconds,maxattempts").eq("recruitmentId",scope.recruitment.id).eq("status","PUBLISHED").order("createdAt",{ascending:false}),
    db.from("RecruitmentTestSession").select("id,testId,attempt,status,startedAt,expiresAt,submittedAt,score").eq("applicationId",applicationId).order("createdAt",{ascending:false})
   ]);
   if(testsError)throw new Error(testsError.message);
   if(sessionsError)throw new Error(sessionsError.message);
   return NextResponse.json({tests:tests??[],sessions:sessions??[]});
  }
  const {data:test,error:testError}=await db.from("RecruitmentTestDefinition").select("id,title,instructions,durationseconds,maxattempts").eq("id",testId).eq("recruitmentId",scope.recruitment.id).eq("status","PUBLISHED").maybeSingle();
  if(testError)throw new Error(testError.message);
  if(!test)return fail("TEST_NOT_FOUND");
  const {data:questions,error:questionsError}=await db.from("RecruitmentTestQuestion").select("id,position,prompt,type,options,points,metadata").eq("testId",testId).order("position",{ascending:true});
  if(questionsError)throw new Error(questionsError.message);
  let session=null,answers:any[]=[];
  if(sessionId){
   const {data:found,error:sessionError}=await db.from("RecruitmentTestSession").select("id,testId,applicationId,attempt,status,startedAt,expiresAt,submittedAt,lastHeartbeatAt,score").eq("id",sessionId).eq("applicationId",applicationId).eq("testId",testId).maybeSingle();
   if(sessionError)throw new Error(sessionError.message);
   if(!found)return fail("SESSION_NOT_FOUND");
   session=found;
   if(["RUNNING","SUBMITTED"].includes(String(found.status))){
    const {data:answerRows,error:answerError}=await db.from("RecruitmentTestAnswer").select("questionId,answer,answeredAt").eq("sessionId",sessionId);
    if(answerError)throw new Error(answerError.message);
    answers=answerRows??[];
   }
  }
  return NextResponse.json({test,questions:(questions??[]).map(publicQuestion),session,answers});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Lecture du test impossible."},{status:500});}
}

export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);
 if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const db=adminClient(),user=await ensureUser(db,auth),body=await req.json().catch(()=>({}));
  const action=String(body.action??"").trim().toLowerCase();
  if(action==="start"){
   const applicationId=String(body.applicationId??"").trim(),testId=String(body.testId??"").trim();
   if(!applicationId||!testId)return fail("TEST_FIELDS_REQUIRED");
   const scope=await authorizedApplication(db,applicationId,String(user.id));
   if(!scope.application||!scope.recruitment)return fail("APPLICATION_NOT_FOUND");
   if(!scope.candidate)return fail("FORBIDDEN");
   const {data,error}=await db.rpc("recruitment360_lot4_start_session",{p_test_id:testId,p_application_id:applicationId,p_actor_user_id:String(user.id)});
   if(error)throw error;
   return NextResponse.json({session:data},{status:201});
  }
  if(action==="answer"){
   const sessionId=String(body.sessionId??"").trim(),questionId=String(body.questionId??"").trim();
   if(!sessionId||!questionId)return fail("ANSWER_FIELDS_REQUIRED");
   const {data,error}=await db.rpc("recruitment360_lot4_save_answer",{
    p_session_id:sessionId,p_question_id:questionId,p_answer:body.answer??null,p_actor_user_id:String(user.id)
   });
   if(error)throw error;
   return NextResponse.json({answer:data});
  }
  if(action==="heartbeat"||action==="submit"){
   const sessionId=String(body.sessionId??"").trim();
   if(!sessionId)return fail("SESSION_REQUIRED");
   const {data,error}=await db.rpc(action==="heartbeat"?"recruitment360_lot4_heartbeat":"recruitment360_lot4_submit_session",{
    p_session_id:sessionId,p_actor_user_id:String(user.id)
   });
   if(error)throw error;
   return NextResponse.json({session:data});
  }
  return fail("ACTION_INVALID");
 }catch(error){
  const value=error as {message?:string};
  return fail(value.message||"TEST_OPERATION_FAILED");
 }
}
