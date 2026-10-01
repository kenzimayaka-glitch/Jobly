export type JiaPermissionLevel="OBSERVE"|"READ"|"ANALYZE"|"PROPOSE"|"PREPARE"|"EXECUTE"|"SENSITIVE_EXECUTE";
export type JiaPolicyInput={level:JiaPermissionLevel; ecosystem:"TALENT"|"RECRUITER"|"PARTNER"|"MOBILITY"|"COMMUNITY"|"BUSINESS"|"ADMIN"; action:string; sensitive?:boolean; consent?:boolean; risk?:number};
const rank:Record<JiaPermissionLevel,number>={OBSERVE:0,READ:1,ANALYZE:2,PROPOSE:3,PREPARE:4,EXECUTE:5,SENSITIVE_EXECUTE:6};
export function evaluateJiaPolicy(input:JiaPolicyInput){
  const risk=Math.max(0,Math.min(1,input.risk??0));
  const sensitive=Boolean(input.sensitive)||risk>=.8;
  if(sensitive && input.level!=="SENSITIVE_EXECUTE") return {allowed:false,reason:"SENSITIVE_ACTION_REQUIRES_SENSITIVE_EXECUTE"};
  if(sensitive && input.consent!==true) return {allowed:false,reason:"EXPLICIT_CONSENT_REQUIRED"};
  if(input.action.toLowerCase().includes("payment")||input.action.toLowerCase().includes("pay")) return {allowed:false,reason:"JIA_NEVER_EXECUTES_PAYMENTS"};
  return {allowed:rank[input.level]>=rank[input.level]&&(!sensitive||input.consent===true),reason:"POLICY_OK"};
}
export function canAutoExecute(input:JiaPolicyInput){return evaluateJiaPolicy(input).allowed&&input.level==="EXECUTE"&&!input.sensitive&&(input.risk??0)<.8;}
