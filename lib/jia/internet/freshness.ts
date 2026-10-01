import type {FreshnessStatus} from "./types";
export function freshnessPolicy(i:{informationType?:string;publishedAt?:string;retrievedAt?:string}):FreshnessStatus{
  if(!i.publishedAt)return"unknown";const d=Date.parse(i.publishedAt);if(!Number.isFinite(d))return"unknown";
  const age=Math.max(0,(Date.parse(i.retrievedAt||new Date().toISOString())-d)/86400000);const t=(i.informationType||"general").toLowerCase();
  if(/job|offer|emploi|recruit|recrut/.test(t))return age<=7?"fresh":age<=30?"recent":age<=60?"aging":"expired";
  if(/news|regulation|legal|law|actualité/.test(t))return age<=7?"fresh":age<=30?"recent":age<=180?"aging":"stale";
  return age<=30?"fresh":age<=180?"recent":age<=365?"aging":"stale";
}
export function freshnessScore(s:FreshnessStatus){return({fresh:1,recent:.9,aging:.68,stale:.35,expired:.05,unknown:.55} as Record<FreshnessStatus,number>)[s];}