import {adminClient} from "@/lib/server-auth";
import {evaluateJiaPolicy,canAutoExecute,type JiaPolicyInput} from "@/lib/jia/policy";
import {checkJiaToolAccess} from "@/lib/jia/toolRegistry";
export async function planJiaAction(args:{userId:string;goal:Record<string,unknown>;plan:Record<string,unknown>;policy:JiaPolicyInput;precondition?:Record<string,unknown>;action:Record<string,unknown>}){
 const decision=evaluateJiaPolicy(args.policy); const sb=adminClient();
 const {data,error}=await sb.from("jia_action_runs").insert({user_id:args.userId,goal:args.goal,plan:args.plan,permission:{...args.policy,decision},precondition:args.precondition??{},action:args.action,status:decision.allowed?"PROPOSED":"PLANNED"}).select("*").single();
 if(error)throw new Error(error.message); return {run:data,decision};
}
export async function verifyJiaAction(args:{userId:string;runId:string;result:Record<string,unknown>;verified:boolean;outcome?:Record<string,unknown>}){
 const sb=adminClient(); const {data,error}=await sb.from("jia_action_runs").update({result:args.result,verification:{verified:args.verified,at:new Date().toISOString()},outcome:args.outcome??null,status:args.verified?"VERIFIED":"FAILED",updated_at:new Date().toISOString()}).eq("id",args.runId).eq("user_id",args.userId).select("*").single();
 if(error)throw new Error(error.message); return data;
}
export {evaluateJiaPolicy,canAutoExecute};


export async function runJiaSafeAction(args:{
 userId:string;actionType:string;ecosystem:"TALENT"|"RECRUITER"|"PARTNER"|"MOBILITY"|"COMMUNITY"|"BUSINESS"|"ADMIN";
 message?:string;confirmed:boolean;
}){
 const next = args.actionType==="SEARCH_JOBS"?"/jobs":
   args.actionType==="START_INTERVIEW_COACHING"?"/ai/interview":
   args.actionType==="BUILD_LEARNING_PLAN"||args.actionType==="LEARN"?"/ai/learning":
   args.actionType==="FOLLOW_UP"||args.actionType==="APPLY"?"/applications":
   args.actionType==="VERIFY"?"/profile":"/career";
 const toolId=args.actionType==="PREPARE_APPLICATION"?"prepare-application":"execute-jobly-action";
 const level=args.actionType==="PREPARE_APPLICATION"?"PREPARE":"EXECUTE";
 const access=checkJiaToolAccess({toolId,level,ecosystem:args.ecosystem,consent:args.confirmed});
 if(!access.allowed)return{ok:false,reason:access.reason,requiredLevel:access.requiredLevel,next:null,run:null};
 const planned=await planJiaAction({
  userId:args.userId,
  goal:{type:"SAFE_JOBLY_ACTION",actionType:args.actionType},
  plan:{actionType:args.actionType,next,mode:"SAFE_INTERNAL_NAVIGATION_OR_PREPARATION"},
  policy:{level,minimumLevel:access.tool?.minimumLevel??level,ecosystem:args.ecosystem,action:args.actionType,consent:args.confirmed,risk:access.tool?.risk==="MEDIUM"?.5:.2},
  precondition:{confirmed:args.confirmed},
  action:{type:args.actionType,next},
 });
 const result={kind:"SAFE_JOBLY_ACTION",actionType:args.actionType,next,prepared:true};
 const verified=await verifyJiaAction({userId:args.userId,runId:String(planned.run.id),result,verified:true,outcome:{navigation:next,externalSideEffect:false}});
 return{ok:true,next,run:verified,decision:planned.decision};
}
