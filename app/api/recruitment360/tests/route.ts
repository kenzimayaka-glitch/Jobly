import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "../../../../lib/server-auth";
import {hasRecruitmentRole,RECRUITMENT_READ_ROLES,RECRUITMENT_WRITE_ROLES} from "../../../../lib/recruitment360/access";
import {sanitizeTestQuestionOptions} from "../../../../lib/recruitment360/test-runtime";

function fail(message:string){
 const status=message==="FORBIDDEN"?403:message.includes("NOT_FOUND")?404:
  message.includes("REQUIRED")||message.includes("INVALID")||message.includes("NOT_RUNNING")||message.includes("EXPIRED")||message.includes("MAX_ATTEMPTS")?400:409;
 return NextResponse.json({message},{status});
}
function publicQuestion(question:any){
 return {
  id:question.id,
  position:question.position,
  prompt:question.prompt,
  type:question.type,
  points:question.points,
  options:sanitizeTestQuestionOptions(question.options),
 };
}

async function hasWriterAccess(db:ReturnType<typeof adminClient>,recruitmentId:string,userId:string){
 const {data,error}=await db.from("RecruitmentRole").select("role").eq("recruitmentId",recruitmentId).eq("userId",userId);
 if(error)throw new Error(error.message);
 return (data??[]).some((row:any)=>hasRecruitmentRole(row.role,RECRUITMENT_WRITE_ROLES));
}
async function authorizedApplication(db:ReturnType<typeof adminClient>,applicationId:string,authUserId:string,internalUserId:string){
 const {data:application,error}=await db.from("Application").select("id,userId,recruiterJobId").eq("id",applicationId).maybeSingle();
 if(error)throw new Error(error.message);
 if(!application?.recruiterJobId)return {application:null,recruitment:null,candidate:false,recruiter:false};
 const {data:recruitment,error:recruitmentError}=await db.from("Recruitment360").select("id").eq("recruiterJobId",application.recruiterJobId).maybeSingle();
 if(recruitmentError)throw new Error(recruitmentError.message);
 if(!recruitment)return {application,recruitment:null,candidate:String(application.userId)===authUserId,recruiter:false};
 const {data:roles,error:roleError}=await db.from("RecruitmentRole").select("role").eq("recruitmentId",recruitment.id).eq("userId",internalUserId);
 if(roleError)throw new Error(roleError.message);
 return {
  application,recruitment,
  candidate:String(application.userId)===authUserId,
  recruiter:(roles??[]).some((row:any)=>hasRecruitmentRole(row.role,RECRUITMENT_READ_ROLES))
 };
}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req);
 if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const db=adminClient(),user=await ensureUser(db,auth);
  const applicationId=String(req.nextUrl.searchParams.get("applicationId")||"").trim();
  const recruitmentId=String(req.nextUrl.searchParams.get("recruitmentId")||"").trim();
  const testId=String(req.nextUrl.searchParams.get("testId")||"").trim();
  const sessionId=String(req.nextUrl.searchParams.get("sessionId")||"").trim();
  if(!applicationId&&recruitmentId){
   if(!(await hasWriterAccess(db,recruitmentId,String(user.id))))return fail("FORBIDDEN");
   const {data:tests,error:testsError}=await db.from("RecruitmentTestDefinition").select("id,title,instructions,durationseconds,maxattempts,status,createdAt").eq("recruitmentId",recruitmentId).order("createdAt",{ascending:false});
   if(testsError)throw new Error(testsError.message);
   const ids=(tests??[]).map((item:any)=>item.id);
   const {data:questions,error:questionsError}=ids.length?await db.from("RecruitmentTestQuestion").select("testId,id,position,type").in("testId",ids):{data:[],error:null};
   if(questionsError)throw new Error(questionsError.message);
   const countMap=new Map<string,number>();
   for(const question of questions??[])countMap.set(String(question.testId),(countMap.get(String(question.testId))??0)+1);
   return NextResponse.json({tests:(tests??[]).map((item:any)=>({...item,questionCount:countMap.get(String(item.id))??0}))});
  }
  if(!applicationId)return fail("APPLICATION_REQUIRED");
  const scope=await authorizedApplication(db,applicationId,String(auth.id),String(user.id));
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
  const {data:questions,error:questionsError}=await db.from("RecruitmentTestQuestion").select("id,position,prompt,type,options,points").eq("testId",testId).order("position",{ascending:true});
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
  if(action==="create-test"){
   const recruitmentId=String(body.recruitmentId??"").trim();
   const title=String(body.title??"").trim();
   const instructions=String(body.instructions??"").trim();
   const durationSeconds=Number(body.durationSeconds);
   const maxAttempts=Number(body.maxAttempts??1);
   if(!recruitmentId||title.length<3)return fail("TEST_FIELDS_REQUIRED");
   if(!Number.isInteger(durationSeconds)||durationSeconds<60||durationSeconds>86400||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>5)return fail("TEST_CONFIGURATION_INVALID");
   if(!(await hasWriterAccess(db,recruitmentId,String(user.id))))return fail("FORBIDDEN");
   const {data,error}=await db.from("RecruitmentTestDefinition").insert({
    recruitmentId,title:title.slice(0,180),instructions:instructions.slice(0,4000),
    durationseconds:durationSeconds,maxattempts:maxAttempts,status:"DRAFT",createdByUserId:String(user.id)
   }).select("id,title,instructions,durationseconds,maxattempts,status").single();
   if(error)throw error;
   return NextResponse.json({test:data},{status:201});
  }
  if(action==="add-question"){
   const testId=String(body.testId??"").trim(),prompt=String(body.prompt??"").trim();
   const type=String(body.type??"").trim().toUpperCase(),points=Number(body.points??1);
   if(!testId||prompt.length<5)return fail("QUESTION_FIELDS_REQUIRED");
   if(!["SINGLE_CHOICE","NUMBER"].includes(type))return fail("QUESTION_TYPE_NOT_SUPPORTED");
   if(!Number.isFinite(points)||points<=0||points>1000)return fail("QUESTION_POINTS_INVALID");
   const {data:test,error:testError}=await db.from("RecruitmentTestDefinition").select("id,recruitmentId,status").eq("id",testId).maybeSingle();
   if(testError)throw testError;
   if(!test)return fail("TEST_NOT_FOUND");
   if(test.status!=="DRAFT")return fail("TEST_NOT_EDITABLE");
   if(!(await hasWriterAccess(db,String(test.recruitmentId),String(user.id))))return fail("FORBIDDEN");
   let options:any={};
   if(type==="SINGLE_CHOICE"){
    const choices=Array.isArray(body.choices)?body.choices.map((value:any)=>String(value??"").trim()).filter(Boolean):[];
    const correct=String(body.correct??"").trim();
    if(choices.length<2||choices.length>10||!correct||!choices.includes(correct)||new Set(choices).size!==choices.length)return fail("QUESTION_CHOICES_INVALID");
    options={choices:choices.map((value:string)=>({value,label:value})),correct};
   }else{
    const correct=Number(body.correct);
    if(!Number.isFinite(correct))return fail("QUESTION_CORRECT_VALUE_INVALID");
    options={correct:String(correct)};
   }
   const {data:previous,error:previousError}=await db.from("RecruitmentTestQuestion").select("position").eq("testId",testId).order("position",{ascending:false}).limit(1).maybeSingle();
   if(previousError)throw previousError;
   const position=Number(previous?.position??0)+1;
   const {data:question,error}=await db.from("RecruitmentTestQuestion").insert({testId,position,prompt:prompt.slice(0,2000),type,options,points,metadata:{}}).select("id,testId,position,prompt,type,points").single();
   if(error)throw error;
   return NextResponse.json({question},{status:201});
  }
  if(action==="publish"||action==="close"){
   const testId=String(body.testId??"").trim();
   if(!testId)return fail("TEST_REQUIRED");
   const {data:test,error:testError}=await db.from("RecruitmentTestDefinition").select("id,recruitmentId,status").eq("id",testId).maybeSingle();
   if(testError)throw testError;
   if(!test)return fail("TEST_NOT_FOUND");
   if(!(await hasWriterAccess(db,String(test.recruitmentId),String(user.id))))return fail("FORBIDDEN");
   if(action==="publish"){
    const {data:questions,error:questionsError}=await db.from("RecruitmentTestQuestion").select("id,type,options").eq("testId",testId);
    if(questionsError)throw questionsError;
    if(!questions?.length)return fail("TEST_QUESTIONS_REQUIRED");
    const invalid=questions.some((question:any)=>question.type==="SINGLE_CHOICE"
      ?!Array.isArray(question.options?.choices)||question.options.choices.length<2||!question.options.choices.some((choice:any)=>String(choice.value)===String(question.options.correct))
      :question.type==="NUMBER"?question.options?.correct==null:true);
    if(invalid)return fail("TEST_QUESTION_CONFIGURATION_INVALID");
   }
   const nextStatus=action==="publish"?"PUBLISHED":"CLOSED";
   const {data,error}=await db.from("RecruitmentTestDefinition").update({status:nextStatus,updatedAt:new Date().toISOString()}).eq("id",testId).select("id,status").single();
   if(error)throw error;
   return NextResponse.json({test:data});
  }
  if(action==="start"){
   const applicationId=String(body.applicationId??"").trim(),testId=String(body.testId??"").trim();
   if(!applicationId||!testId)return fail("TEST_FIELDS_REQUIRED");
   const scope=await authorizedApplication(db,applicationId,String(auth.id),String(user.id));
   if(!scope.application||!scope.recruitment)return fail("APPLICATION_NOT_FOUND");
   if(!scope.candidate)return fail("FORBIDDEN");
   const {data,error}=await db.rpc("recruitment360_lot4_start_session",{p_test_id:testId,p_application_id:applicationId,p_actor_user_id:String(auth.id)});
   if(error)throw error;
   return NextResponse.json({session:data},{status:201});
  }
  if(action==="answer"){
   const sessionId=String(body.sessionId??"").trim(),questionId=String(body.questionId??"").trim();
   if(!sessionId||!questionId)return fail("ANSWER_FIELDS_REQUIRED");
   const {data,error}=await db.rpc("recruitment360_lot4_save_answer",{
    p_session_id:sessionId,p_question_id:questionId,p_answer:body.answer??null,p_actor_user_id:String(auth.id)
   });
   if(error)throw error;
   return NextResponse.json({answer:data});
  }
  if(action==="heartbeat"||action==="submit"){
   const sessionId=String(body.sessionId??"").trim();
   if(!sessionId)return fail("SESSION_REQUIRED");
   const {data,error}=await db.rpc(action==="heartbeat"?"recruitment360_lot4_heartbeat":"recruitment360_lot4_submit_session",{
    p_session_id:sessionId,p_actor_user_id:String(auth.id)
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
