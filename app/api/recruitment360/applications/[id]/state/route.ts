import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../lib/server-auth";
import {
  applicationStepNumber,
  hasRecruitmentRole,
  RECRUITMENT_STATE_ROLES,
  validateApplicationTransition,
} from "../../../../../../lib/recruitment360/access";

const ALLOWED_STATES = new Set([
  "SENT","RECEIVED","REVIEW","SELECTED","TEST","INTERVIEW",
  "FINALIST","OFFER","HIRED","POOL","REJECTED","WITHDRAWN","OFFER_DECLINED"
]);
const TERMINAL_STATES = new Set(["REJECTED","WITHDRAWN","HIRED","OFFER_DECLINED"]);

export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){
 try{
  const auth=await getAuthUser(req);
  if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  const {id}=await context.params;
  const body=await req.json().catch(()=>({}));
  const nextState=String(body.state??"").trim().toUpperCase();
  const exceptionReason=typeof body.exceptionReason==="string"?body.exceptionReason.trim():"";
  if(!ALLOWED_STATES.has(nextState))return NextResponse.json({message:"État de candidature invalide."},{status:400});
  if(exceptionReason.length>1000)return NextResponse.json({message:"Motif de correction trop long."},{status:400});

  const supabase=adminClient(),user=await ensureUser(supabase,auth);
  const {data:application,error:applicationError}=await supabase.from("Application")
   .select("id,userId,recruiterJobId,recruitment360Status,updatedAt").eq("id",id).maybeSingle();
  if(applicationError)throw new Error(applicationError.message);
  if(!application)return NextResponse.json({message:"Candidature introuvable."},{status:404});
  if(!application.recruiterJobId)return NextResponse.json({message:"Cette candidature n'appartient pas à un recrutement 360."},{status:404});

  const {data:recruitment,error:recruitmentError}=await supabase.from("Recruitment360")
   .select("id").eq("recruiterJobId",application.recruiterJobId).maybeSingle();
  if(recruitmentError)throw new Error(recruitmentError.message);
  if(!recruitment)return NextResponse.json({message:"Recrutement introuvable."},{status:404});

  const {data:roles,error:rolesError}=await supabase.from("RecruitmentRole").select("role")
   .eq("recruitmentId",recruitment.id).eq("userId",user.id).limit(10);
  if(rolesError)throw new Error(rolesError.message);
  const recruiterAllowed=(roles??[]).some((row:any)=>hasRecruitmentRole(row.role,RECRUITMENT_STATE_ROLES));
  const candidateAllowed=String(application.userId)===String(user.id);
  if(!recruiterAllowed&&!candidateAllowed)return NextResponse.json({message:"FORBIDDEN"},{status:403});

  // A user who is both the applicant and a recruitment member keeps candidate-only powers on their own application.
  const actor=candidateAllowed?"CANDIDATE":"RECRUITER";
  const {data:state,error:stateError}=await supabase.from("RecruitmentApplicationState")
   .select("applicationId,currentState,stepNumber,lockedAt,lastTransitionAt,updatedAt")
   .eq("applicationId",id).maybeSingle();
  if(stateError)throw new Error(stateError.message);
  if(!state)return NextResponse.json({message:"État de candidature non initialisé."},{status:409});
  const currentState=String(state.currentState??"").toUpperCase();
  const transitionError=validateApplicationTransition(actor,currentState,nextState,exceptionReason);
  if(transitionError)return NextResponse.json({message:transitionError},{status:actor==="CANDIDATE"?403:400});

  const now=new Date().toISOString();
  const {data:updatedState,error:updateStateError}=await supabase.from("RecruitmentApplicationState").update({
    currentState:nextState,stepNumber:applicationStepNumber(nextState),
    lockedAt:TERMINAL_STATES.has(nextState)?now:state.lockedAt,lastTransitionAt:now,updatedAt:now
  }).eq("applicationId",id).eq("currentState",currentState).select("*").maybeSingle();
  if(updateStateError)throw new Error(updateStateError.message);
  if(!updatedState)return NextResponse.json({message:"Conflit : l'état de candidature a changé. Rechargez le dossier."},{status:409});

  const {error:applicationUpdateError}=await supabase.from("Application").update({
    recruitment360Status:nextState,updatedAt:now
  }).eq("id",id);
  if(applicationUpdateError){
    const {error:rollbackError}=await supabase.from("RecruitmentApplicationState").update({
      currentState:state.currentState,stepNumber:state.stepNumber,lockedAt:state.lockedAt,
      lastTransitionAt:state.lastTransitionAt,updatedAt:state.updatedAt
    }).eq("applicationId",id).eq("currentState",nextState);
    if(rollbackError)throw new Error("APPLICATION_UPDATE_AND_STATE_ROLLBACK_FAILED: "+applicationUpdateError.message+"; "+rollbackError.message);
    throw new Error(applicationUpdateError.message);
  }

  const {error:auditError}=await supabase.from("RecruitmentAuditLog").insert({
    recruitmentId:recruitment.id,applicationId:id,actorUserId:user.id,
    action:exceptionReason?"EXCEPTION_STATE_CORRECTION":"STATE_TRANSITION",
    fromState:currentState,toState:nextState,exceptionReason:exceptionReason||null,
  });
  if(auditError){
    const [applicationRollback,stateRollback]=await Promise.all([
      supabase.from("Application").update({
        recruitment360Status:application.recruitment360Status,updatedAt:application.updatedAt
      }).eq("id",id).eq("updatedAt",now),
      supabase.from("RecruitmentApplicationState").update({
        currentState:state.currentState,stepNumber:state.stepNumber,lockedAt:state.lockedAt,
        lastTransitionAt:state.lastTransitionAt,updatedAt:state.updatedAt
      }).eq("applicationId",id).eq("currentState",nextState)
    ]);
    if(applicationRollback.error||stateRollback.error){
      throw new Error("RECRUITMENT_AUDIT_WRITE_AND_ROLLBACK_FAILED: audit="+auditError.message+
       "; application_rollback="+(applicationRollback.error?.message??"ok")+
       "; state_rollback="+(stateRollback.error?.message??"ok"));
    }
    throw new Error("RECRUITMENT_AUDIT_WRITE_FAILED: "+auditError.message);
  }
  return NextResponse.json({state:updatedState});
 }catch(error){
  const value=error as {message?:string;code?:string};
  const message=value.message||"Impossible de changer l'état.";
  const status=message==="FORBIDDEN"||value.code==="42501"?403:
   message.includes("NOT_FOUND")?404:
   message.includes("INVALID")||message.includes("REQUIRED")||message.includes("REQUIRES_REASON")?400:500;
  return NextResponse.json({message},{status});
 }
}
