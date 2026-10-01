import {adminClient} from "@/lib/server-auth";
import {evaluateJiaPolicy,canAutoExecute,type JiaPolicyInput} from "@/lib/jia/policy";
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
