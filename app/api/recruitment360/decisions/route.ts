import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { runJiaBrain } from "@/lib/jia/brain";

function errStatus(message:string){return message==="FORBIDDEN"?403:message.includes("REQUIRED")||message.includes("INVALID")||message.includes("BOUNDS")?400:409;}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const sb=adminClient(), user=await ensureUser(sb,auth);
  const applicationId=req.nextUrl.searchParams.get("applicationId");
  if(applicationId){
   const {data,error}=await sb.rpc("recruitment360_lot6_get_workspace",{p_application_id:applicationId,p_actor_user_id:user.id});
   if(error)throw new Error(error.message);
   return NextResponse.json({workspace:data});
  }
  const {data:roles,error:re}=await sb.from("RecruitmentRole").select("recruitmentId").eq("userId",user.id).in("role",["OWNER","HR","MANAGER","DELEGATE","JURY"]);
  if(re)throw new Error(re.message);
  const ids=[...new Set((roles??[]).map((r:any)=>r.recruitmentId))];
  if(!ids.length)return NextResponse.json({candidates:[]});
  const {data:recs,error:ae}=await sb.from("Recruitment360").select("id,recruiterJobId,currentState").in("id",ids);
  if(ae)throw new Error(ae.message);
  const jobIds=(recs??[]).map((r:any)=>r.recruiterJobId);
  const [appsRes,statesRes,decisionsRes,jobsRes]=await Promise.all([
   jobIds.length?sb.from("Application").select("id,userId,recruiterJobId,salaryExpectation,salaryCurrency,recruitment360Status").in("recruiterJobId",jobIds):Promise.resolve({data:[],error:null}),
   sb.from("RecruitmentApplicationState").select("applicationId,currentState,stepNumber").in("currentState",["SELECTED","TEST","INTERVIEW","FINALIST","OFFER","POOL"]),
   sb.from("RecruitmentDecision").select("applicationId,outcome,decisionAt,scoreTotal,rationale"),
   jobIds.length?sb.from("RecruiterJob").select("id,title,companyName").in("id",jobIds):Promise.resolve({data:[],error:null})
  ]);
  for(const x of [appsRes,statesRes,decisionsRes,jobsRes])if(x.error)throw new Error(x.error.message);
  const stateMap=new Map((statesRes.data??[]).map((x:any)=>[x.applicationId,x]));
  const decisionMap=new Map((decisionsRes.data??[]).map((x:any)=>[x.applicationId,x]));
  const jobMap=new Map((jobsRes.data??[]).map((x:any)=>[x.id,x]));
  const userIds=[...new Set((appsRes.data??[]).map((a:any)=>a.userId).filter(Boolean))];
  const usersRes=userIds.length?await sb.from("User").select("id,firstName,lastName,displayName").in("id",userIds):{data:[],error:null};
  if(usersRes.error)throw new Error(usersRes.error.message);
  const nameMap=new Map((usersRes.data??[]).map((u:any)=>[u.id,u.displayName||[u.firstName,u.lastName].filter(Boolean).join(" ")||"Candidat"]));
  const candidates=(appsRes.data??[]).map((a:any)=>({applicationId:a.id,candidateName:nameMap.get(a.userId)||"Candidat",jobTitle:jobMap.get(a.recruiterJobId)?.title||"Poste",companyName:jobMap.get(a.recruiterJobId)?.companyName||"",candidateState:stateMap.get(a.id)?.currentState||a.recruitment360Status||"SENT",decision:decisionMap.get(a.id)||null,salaryExpectation:a.salaryExpectation,salaryCurrency:a.salaryCurrency||"XAF"})).filter((x:any)=>["SELECTED","TEST","INTERVIEW","FINALIST","OFFER","POOL"].includes(x.candidateState));
  return NextResponse.json({candidates});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500});}
}

export async function POST(req:NextRequest){
 const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const sb=adminClient(), user=await ensureUser(sb,auth), b=await req.json(), action=String(b.action||"");
  if(action==="policy"){
   const {data,error}=await sb.rpc("recruitment360_lot6_set_policy",{p_recruitment_id:b.recruitmentId,p_actor_user_id:user.id,p_cv_weight:Number(b.cvWeight),p_test_weight:Number(b.testWeight),p_interview_weight:Number(b.interviewWeight),p_two_step:Boolean(b.twoStep),p_require_references:Boolean(b.requireReferences),p_salary_min:b.salaryMin===""||b.salaryMin==null?null:Number(b.salaryMin),p_salary_max:b.salaryMax===""||b.salaryMax==null?null:Number(b.salaryMax),p_currency:String(b.currency||"XAF")});
   if(error)throw new Error(error.message); return NextResponse.json({policy:data},{status:201});
  }
  if(action==="vote"){
   const {data,error}=await sb.rpc("recruitment360_lot6_submit_vote",{p_application_id:b.applicationId,p_actor_user_id:user.id,p_recommendation:b.recommendation,p_score:b.score==null?null:Number(b.score),p_rationale:b.rationale??null,p_interview_id:b.interviewId??null});
   if(error)throw new Error(error.message); return NextResponse.json({decision:data},{status:201});
  }
  if(action==="approval"){
   const {data,error}=await sb.rpc("recruitment360_lot6_submit_approval",{p_application_id:b.applicationId,p_actor_user_id:user.id,p_role:b.role,p_status:b.status,p_rationale:b.rationale??null});
   if(error)throw new Error(error.message); return NextResponse.json({approval:data},{status:201});
  }
  if(action==="reference"){
   const {data:app,error:ae}=await sb.from("Application").select("id,recruiterJobId").eq("id",b.applicationId).single(); if(ae)throw new Error(ae.message);
   const {data:r,error:re}=await sb.from("Recruitment360").select("id").eq("recruiterJobId",app.recruiterJobId).single(); if(re)throw new Error(re.message);
   const {data:role}=await sb.from("RecruitmentRole").select("id").eq("recruitmentId",r.id).eq("userId",user.id).in("role",["OWNER","HR","MANAGER","DELEGATE"]).maybeSingle();
   if(!role)throw new Error("FORBIDDEN");
   const {data,error}=await sb.from("RecruitmentDecisionReference").insert({applicationId:b.applicationId,recruitmentId:r.id,contactName:String(b.contactName||"").trim(),contactEmail:b.contactEmail||null,contactPhone:b.contactPhone||null,status:b.status||"REQUESTED",notes:b.notes||null,checkedByUserId:b.status&&b.status!=="REQUESTED"?user.id:null,checkedAt:b.status&&b.status!=="REQUESTED"?new Date().toISOString():null}).select("*").single();
   if(error)throw new Error(error.message); return NextResponse.json({reference:data},{status:201});
  }
  if(action==="recommendation"){
   const {data:ws,error:we}=await sb.rpc("recruitment360_lot6_get_workspace",{p_application_id:b.applicationId,p_actor_user_id:user.id});
   if(we)throw new Error(we.message);
   const d=ws?.decision;
   if(!d)throw new Error("DECISION_NOT_FOUND");
   const message="Analyse de décision de recrutement. Explique les preuves, scores, votes et écarts ci-dessous. Ne décide jamais à la place du recruteur. Donne une recommandation explicable et contestable. Données:"+JSON.stringify({decision:d,votes:ws.votes,policy:ws.policy,references:ws.references});
   const jia=await runJiaBrain({userId:user.id,ecosystem:"RECRUITER",message,path:"/recruiter/decisions",action:"RECOMMENDATION_RECRUTEMENT_360"});
   const recommendation=/reserve|réserve/i.test(jia.message)?"RESERVE":/insuffisant|insufficient|manque/i.test(jia.message)?"INSUFFICIENT_DATA":/rejet|do not|ne pas/i.test(jia.message)?"DO_NOT_PROCEED":"PROCEED";
   const {data,error}=await sb.from("RecruitmentDecisionRecommendation").upsert({decisionId:d.id,recommendation,rationale:jia.message,evidence:{votes:ws.votes,scoreTotal:d.scoreTotal,scoreBreakdown:d.scoreBreakdown},provider:jia.provider,confidence:jia.confidence},{onConflict:"decisionId"}).select("*").single();
   if(error)throw new Error(error.message); return NextResponse.json({recommendation:data});
  }
  if(action==="finalize"){
   const {data,error}=await sb.rpc("recruitment360_lot6_finalize_decision",{p_application_id:b.applicationId,p_actor_user_id:user.id,p_outcome:b.outcome,p_rationale:b.rationale,p_next_action:b.nextAction??null,p_score_total:b.scoreTotal==null?null:Number(b.scoreTotal),p_score_breakdown:b.scoreBreakdown??{}});
   if(error)throw new Error(error.message);
   const {data:a}=await sb.from("Application").select("userId,recruiterJobId,locale").eq("id",b.applicationId).single();
   if(a?.userId)await sb.from("Notification").insert({userId:a.userId,type:b.outcome==="REJECTED"?"RECRUITMENT_DECISION":"RECRUITMENT_DECISION",title:b.outcome==="REJECTED"?"Mise à jour de votre candidature":b.outcome==="POOL"?"Candidature conservée":"Étape décisionnelle",body:b.outcome==="REJECTED"?"Votre candidature est clôturée.":b.outcome==="POOL"?"Votre candidature est conservée dans le vivier.":"Votre candidature avance vers l'offre.",link:"/career/recruitment360/"+b.applicationId,entityId:data.id,recruitmentId:data.recruitmentId,applicationId:b.applicationId,actionType:"OPEN_DECISION",actionPayload:{decisionId:data.id,outcome:b.outcome},locale:a.locale||"fr",channels:{email:true,push:true,inApp:true}});
   return NextResponse.json({decision:data},{status:201});
  }
  if(action==="sendOffer"){
   const {data,error}=await sb.rpc("recruitment360_lot6_send_offer",{p_offer_id:b.offerId,p_actor_user_id:user.id,p_salary:Number(b.salary),p_deadline:b.deadline,p_channel:b.channel||"JOBLY",p_message:String(b.message||"Offre formelle Jobly.")});
   if(error)throw new Error(error.message); return NextResponse.json({offer:data},{status:201});
  }
  throw new Error("ACTION_INVALID");
 }catch(e){const m=e instanceof Error?e.message:"Erreur.";return NextResponse.json({message:m},{status:errStatus(m)});}
}
