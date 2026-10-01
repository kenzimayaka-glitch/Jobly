import {evaluateJiaPolicy,type JiaEcosystem,type JiaPermissionLevel} from "./policy";
export type JiaToolRisk="LOW"|"MEDIUM"|"HIGH"|"SENSITIVE";
export type JiaToolDefinition={id:string;capability:string;description:string;ecosystem:JiaEcosystem;minimumLevel:JiaPermissionLevel;risk:JiaToolRisk;reversible:boolean;requiresConsent:boolean;input:string[];output:string[]};
const TOOLS:JiaToolDefinition[]=[
{id:"observe-context",capability:"OBSERVE_CONTEXT",description:"Observer le contexte Jobly courant.",ecosystem:"TALENT",minimumLevel:"OBSERVE",risk:"LOW",reversible:true,requiresConsent:false,input:["path","action"],output:["observation"]},
{id:"read-career-context",capability:"READ_CAREER",description:"Lire le contexte carrière autorisé.",ecosystem:"TALENT",minimumLevel:"READ",risk:"LOW",reversible:true,requiresConsent:false,input:["userId"],output:["careerContext"]},
{id:"internet-research",capability:"RESEARCH_WEB",description:"Rechercher et vérifier des sources externes.",ecosystem:"BUSINESS",minimumLevel:"READ",risk:"MEDIUM",reversible:true,requiresConsent:false,input:["query"],output:["evidence","confidence"]},
{id:"propose-career-action",capability:"PROPOSE_CAREER_ACTION",description:"Produire une prochaine action de carrière.",ecosystem:"TALENT",minimumLevel:"PROPOSE",risk:"LOW",reversible:true,requiresConsent:false,input:["goal","recommendation"],output:["proposal"]},
{id:"prepare-application",capability:"PREPARE_APPLICATION",description:"Préparer une candidature sans soumission.",ecosystem:"TALENT",minimumLevel:"PREPARE",risk:"MEDIUM",reversible:true,requiresConsent:true,input:["jobId"],output:["preparedApplication"]},
{id:"execute-jobly-action",capability:"EXECUTE_JOBLY_ACTION",description:"Exécuter une action réversible explicitement autorisée.",ecosystem:"TALENT",minimumLevel:"EXECUTE",risk:"MEDIUM",reversible:true,requiresConsent:true,input:["action"],output:["result","verification"]},
{id:"ceo-analysis",capability:"CEO_ANALYSIS",description:"Analyser les KPI internes et produire des recommandations CEO.",ecosystem:"ADMIN",minimumLevel:"ANALYZE",risk:"HIGH",reversible:true,requiresConsent:false,input:["scope"],output:["snapshot","alerts","actions"]},
{id:"payment",capability:"PAYMENT",description:"Paiement interdit pour J’IA.",ecosystem:"ADMIN",minimumLevel:"SENSITIVE_EXECUTE",risk:"SENSITIVE",reversible:false,requiresConsent:true,input:["payment"],output:[]}
];
const INDEX=new Map(TOOLS.map(tool=>[tool.id,tool]));
export const listJiaTools=()=>TOOLS.map(tool=>({...tool}));
export const getJiaTool=(id:string)=>INDEX.get(id)??null;
export function checkJiaToolAccess(args:{toolId:string;level:JiaPermissionLevel;ecosystem:JiaEcosystem;consent?:boolean}){
 const tool=getJiaTool(args.toolId); if(!tool)return{allowed:false,reason:"UNKNOWN_TOOL",tool:null};
 if(tool.requiresConsent&&args.consent!==true)return{allowed:false,reason:"EXPLICIT_CONSENT_REQUIRED",requiredLevel:tool.minimumLevel,tool};
 const decision=evaluateJiaPolicy({level:args.level,minimumLevel:tool.minimumLevel,ecosystem:args.ecosystem,action:tool.capability,sensitive:tool.risk==="SENSITIVE",consent:args.consent,irreversible:!tool.reversible,risk:tool.risk==="SENSITIVE"?1:tool.risk==="HIGH"?.85:tool.risk==="MEDIUM"?.5:.1});
 return{...decision,tool};
}
