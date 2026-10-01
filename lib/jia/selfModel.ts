import type {SupabaseClient} from "@supabase/supabase-js";
import {getCognitiveSnapshot,upsertSelfState} from "./cognitive";

export type JiaSelfModel={mode:"OFFLINE"|"CONNECTED"|"DEGRADED";internetAvailable:boolean;memoryHealth:"EMPTY"|"PARTIAL"|"HEALTHY";predictionHealth:"NONE"|"TRACKING";currentGoal:string|null;activeEcosystem:string;permissions:string[];limitations:string[];confidence:number;lastCycleAt:string};

export async function buildJiaSelfModel(sb:SupabaseClient,userId:string,args?:{ecosystem?:string;internetAvailable?:boolean;currentGoal?:string|null;extraLimitations?:string[]}){
 const snapshot=await getCognitiveSnapshot(userId), memoryCount=snapshot.memory.length, predictionCount=snapshot.predictions.length;
 const internetAvailable=args?.internetAvailable??Boolean((snapshot.self?.state as Record<string,unknown>|undefined)?.internetAvailable);
 const limitations:string[]=[];
 if(!internetAvailable)limitations.push("Internet externe indisponible ou non vérifié.");
 if(!memoryCount)limitations.push("Mémoire cognitive utilisateur vide.");
 if(!predictionCount)limitations.push("Aucun historique de prédiction calibré.");
 const confidence=Math.max(0,Math.min(1,(memoryCount?0.55:0.25)+(predictionCount?0.2:0)+(internetAvailable?0.2:0)));
 const model:JiaSelfModel={
  mode:internetAvailable?(limitations.length?"DEGRADED":"CONNECTED"):"OFFLINE",
  internetAvailable,memoryHealth:memoryCount>=10?"HEALTHY":memoryCount?"PARTIAL":"EMPTY",
  predictionHealth:predictionCount?"TRACKING":"NONE",currentGoal:args?.currentGoal??null,
  activeEcosystem:args?.ecosystem??"TALENT",
  permissions:["OBSERVE","READ","ANALYZE","PROPOSE","PREPARE"],limitations,confidence,lastCycleAt:new Date().toISOString()
 };
 await upsertSelfState(userId,model as unknown as Record<string,unknown>); return model;
}
