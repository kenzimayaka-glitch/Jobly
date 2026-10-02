export type JiaPermissionLevel="OBSERVE"|"READ"|"ANALYZE"|"PROPOSE"|"PREPARE"|"EXECUTE"|"SENSITIVE_EXECUTE";
export type JiaEcosystem="TALENT"|"RECRUITER"|"PARTNER"|"MOBILITY"|"COMMUNITY"|"BUSINESS"|"ADMIN";
export type JiaPolicyInput={level:JiaPermissionLevel;minimumLevel?:JiaPermissionLevel;ecosystem:JiaEcosystem;action:string;sensitive?:boolean;consent?:boolean;risk?:number;irreversible?:boolean};
const rank:Record<JiaPermissionLevel,number>={OBSERVE:0,READ:1,ANALYZE:2,PROPOSE:3,PREPARE:4,EXECUTE:5,SENSITIVE_EXECUTE:6};
const isPayment=(action:string)=>/\b(payment|pay|payer|paiement|remboursement|refund|checkout|purchase|achat)\b/i.test(action);
export function evaluateJiaPolicy(input:JiaPolicyInput){
 const risk=Math.max(0,Math.min(1,Number.isFinite(input.risk??0)?Number(input.risk??0):0));
 const sensitive=Boolean(input.sensitive)||risk>=.8||Boolean(input.irreversible);
 const required=input.minimumLevel??(sensitive?"SENSITIVE_EXECUTE":input.level);
 if(rank[input.level]<rank[required])return{allowed:false,reason:"INSUFFICIENT_PERMISSION_LEVEL",requiredLevel:required,effectiveLevel:input.level};
 if(isPayment(input.action))return{allowed:false,reason:"JIA_NEVER_EXECUTES_PAYMENTS",requiredLevel:"SENSITIVE_EXECUTE",effectiveLevel:input.level};
 if(sensitive&&input.level!=="SENSITIVE_EXECUTE")return{allowed:false,reason:"SENSITIVE_ACTION_REQUIRES_SENSITIVE_EXECUTE",requiredLevel:"SENSITIVE_EXECUTE",effectiveLevel:input.level};
 if(sensitive&&input.consent!==true)return{allowed:false,reason:"EXPLICIT_CONSENT_REQUIRED",requiredLevel:"SENSITIVE_EXECUTE",effectiveLevel:input.level};
 if(input.ecosystem==="ADMIN"&&rank[input.level]>=rank.EXECUTE&&input.consent!==true)return{allowed:false,reason:"ADMIN_EXECUTION_REQUIRES_EXPLICIT_CONSENT",requiredLevel:"EXECUTE",effectiveLevel:input.level};
 return{allowed:true,reason:"POLICY_OK",requiredLevel:required,effectiveLevel:input.level};
}
export function canAutoExecute(input:JiaPolicyInput){const d=evaluateJiaPolicy(input);return d.allowed&&input.level==="EXECUTE"&&!input.sensitive&&!input.irreversible&&(input.risk??0)<.8;}
export{rank as JIA_PERMISSION_RANK};