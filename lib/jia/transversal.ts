import type {SupabaseClient} from "@supabase/supabase-js";
import {buildCEOIntelligence,type CEOSnapshot} from "@/lib/ceoIntelligence";
import {buildJiaContext} from "@/lib/jiaContext";
import {buildNextBestActions,type Signal} from "./intelligence";
import {buildMarketWatch,type JiaMarketWatchItem} from "./marketWatch";

export const JIA_INTELLIGENCE_LAYERS=["CEO","BUSINESS","GROWTH","COMMERCIAL","FINANCE","MARKET","OPERATIONS","CUSTOMER","CAREER"] as const;
export type JiaIntelligenceLayer=(typeof JIA_INTELLIGENCE_LAYERS)[number];
export type JiaLayerResult={layer:JiaIntelligenceLayer;status:"BASELINE"|"CONNECTED"|"BLOCKED";confidence:"HIGH"|"MEDIUM"|"LOW";summary:string;metrics:Record<string,number|string|null>;evidence:string[];actions:string[]};
export type JiaTransversalSnapshot={generatedAt:string;cycle:string[];layers:JiaLayerResult[];ceo?:CEOSnapshot;marketWatch?:JiaMarketWatchItem[]};

const CYCLE=["PERCEIVE","UNDERSTAND","MEMORY","BELIEF","WORLD_MODEL","REASON","PREDICT","ANTICIPATE","GOAL","PLAN","POLICY","PROPOSE","VERIFY","EVALUATE","REFLECT","LEARN"];
const layer=(name:JiaIntelligenceLayer,summary:string,metrics:Record<string,number|string|null>,evidence:string[],actions:string[],confidence:"HIGH"|"MEDIUM"|"LOW"="MEDIUM"):JiaLayerResult=>({layer:name,status:confidence==="LOW"?"BASELINE":"CONNECTED",confidence,summary,metrics,evidence,actions});

export async function buildAdminTransversalIntelligence(sb:SupabaseClient,includeMarketWatch=false):Promise<JiaTransversalSnapshot>{
 const [ceo,marketWatch]=await Promise.all([buildCEOIntelligence(sb),includeMarketWatch?buildMarketWatch():Promise.resolve(undefined)]),k=ceo.kpis;
 const layers:JiaLayerResult[]=[
 layer("CEO","Situation CEO calculée sur les données Jobly réelles.",{users:k.users,activeJobs:k.activeJobs,applications7d:k.applications7d,revenue30d:k.revenue30d},["CEO snapshot","alertes","projections"],ceo.actions.map(a=>a.title),"HIGH"),
 layer("BUSINESS","Activité business issue des offres, abonnements, partenaires et candidatures.",{activeJobs:k.activeJobs,recruiterJobs:k.publishedRecruiterJobs,subscriptions:k.activeSubscriptions,partners:k.partners},["Job","RecruiterJob","Subscription","Partner"],["Surveiller l'offre et la création de valeur."],"HIGH"),
 layer("GROWTH","Croissance observée sur acquisition, activité et candidatures.",{newUsers7d:k.newUsers7d,userDeltaPct:ceo.deltas.users7dPct,applicationsDeltaPct:ceo.deltas.applications7dPct,eventDeltaPct:ceo.temporal.eventDeltaPct},["User","Application","JiaEvent"],["Comparer acquisition et activation."],"HIGH"),
 layer("COMMERCIAL","Signaux commerciaux à partir des abonnements, recrutements, candidatures et commissions.",{subscriptions:k.activeSubscriptions,recruiterJobs:k.publishedRecruiterJobs,applications7d:k.applications7d,commissions:k.commissionsOutstanding},["Subscription","RecruiterJob","Application","Commission"],["Analyser les conversions."],"HIGH"),
 layer("FINANCE","Lecture financière réelle mais baseline : les coûts complets ne sont pas disponibles pour calculer une rentabilité fiable.",{revenue30d:k.revenue30d,recurringMonthlyValue:k.recurringMonthlyValue,commissionsOutstanding:k.commissionsOutstanding,costDataAvailable:"NO",profitabilityStatus:"INSUFFICIENT_COST_DATA"},["Payment","Subscription","Commission"],["Compléter les coûts réels avant toute analyse de marge ou rentabilité."],"LOW"),
 layer("MARKET",marketWatch?"Veille marché Web vérifiée par Internet Brain.":"Signal marché interne; le Web doit enrichir ce niveau via Internet Brain.",{activeJobs:k.activeJobs,eventCount7d:ceo.temporal.eventCount7d,watchQueries:marketWatch?.length??0},marketWatch?["Job","JiaEvent","Internet Brain","Market Watch"]:["Job","JiaEvent","Internet Brain"],["Croiser les signaux externes vérifiés."],marketWatch?"HIGH":"MEDIUM"),
 layer("OPERATIONS","Santé opérationnelle basée sur fiabilité IA et approbations.",{aiSuccessRate:k.aiSuccessRate,aiRequests7d:k.aiRequests7d,pendingApprovals:ceo.temporal.pendingApprovals},["AiUsage","JiaIntelligenceTrace"],["Traiter incidents et validations."],"HIGH"),
 layer("CUSTOMER","Signaux client dérivés de l'activité et des candidatures.",{users:k.users,applications7d:k.applications7d,eventCount7d:ceo.temporal.eventCount7d},["User","Application","JiaEvent"],["Chercher les points d'abandon réels."],"MEDIUM"),
 layer("CAREER","Intelligence carrière alimentée par Career Twin, gaps, readiness et opportunités.",{coverage:"user-context",target:"Career Twin + Gap + Readiness + Opportunity"},["Profile","Skill","Experience","CareerAssessment"],["Calculer la prochaine action depuis les preuves."],"MEDIUM")
 ];
 return{generatedAt:new Date().toISOString(),cycle:CYCLE,layers,ceo,...(marketWatch?{marketWatch}: {})};
}

export async function buildUserTransversalIntelligence(sb:SupabaseClient,userId:string):Promise<JiaTransversalSnapshot>{
 const {context}=await buildJiaContext(sb,userId,{operation:"TRANSVERSAL_SNAPSHOT"});
 const signals:Signal[]=[];
 if(context?.gaps?.length)signals.push({id:"career-gap",type:"CAREER_GAP",title:"Gap de carrière",detail:context.gaps.join(", "),confidence:"HIGH"});
 if((context?.readiness??0)>=70)signals.push({id:"career-readiness",type:"PROFILE_TO_OPPORTUNITY",title:"Profil prêt",detail:"Le profil atteint un niveau de préparation élevé.",confidence:"MEDIUM"});
 const actions=buildNextBestActions(signals),common=["Même Policy Engine","Même Event Bus","Même mémoire cognitive","Même cycle cognitif"];
 return{generatedAt:new Date().toISOString(),cycle:CYCLE,layers:[
 layer("CAREER",context?"Readiness "+context.readiness+"/100. Prochaine étape : "+context.nextBestAction:"Contexte carrière indisponible.",{readiness:context?.readiness??null,gaps:context?.gaps?.length??null},["Career Twin","JiaContext","CareerAssessment"],actions.map(a=>a.title),context?"HIGH":"LOW"),
 layer("CEO","Non exposé au Talent.",{},common,["Conserver la séparation CEO."],"HIGH"),
 layer("BUSINESS","Non exposé au Talent.",{},common,["Conserver la séparation business."],"HIGH"),
 layer("GROWTH","Non exposé au Talent.",{},common,["Conserver la séparation growth."],"HIGH"),
 layer("COMMERCIAL","Non exposé au Talent.",{},common,["Conserver la séparation commerciale."],"HIGH"),
 layer("FINANCE","Non exposé au Talent.",{},common,["Aucune donnée financière interne."],"HIGH"),
 layer("MARKET","Accessible uniquement via les signaux externes vérifiés.",{},common,["Utiliser Internet Brain."],"MEDIUM"),
 layer("OPERATIONS","Non exposé au Talent.",{},common,["Ne pas divulguer d'indicateurs internes."],"HIGH"),
 layer("CUSTOMER","Analyse personnelle uniquement.",{},common,["Limiter aux signaux du compte."],"HIGH")
 ]};
}
