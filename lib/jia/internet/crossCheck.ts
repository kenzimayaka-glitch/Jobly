import type {SourceEvidence} from "./types";
import {overlap} from "./normalize";
import {evidenceConfidence,evidenceStatus} from "./confidence";
function contradictionCue(t:string){return /\b(denied|deny|false|not true|incorrect|fake|debunked|dementi|faux|fausse|n'est pas|ne confirme pas|contrairement)\b/i.test(t);}
export function crossCheck(query:string,sources:SourceEvidence[]){
  const usable=sources.filter(s=>s.content.length>80);const support:SourceEvidence[]=[];const contradict:SourceEvidence[]=[];
  for(const s of usable){const evidence=s.title+" "+s.content.slice(0,5000);s.relevance=overlap(query,evidence);if(s.relevance>=.08){if(contradictionCue(evidence))contradict.push(s);else support.push(s);}}
  const confidence=evidenceConfidence(usable,support.length,contradict.length);const status=evidenceStatus(confidence,support.length,contradict.length);
  const facts=support.slice(0,6).map(s=>s.title+" — "+s.content.slice(0,260));
  return{facts,supportingSources:support.map(s=>s.url),contradictingSources:contradict.map(s=>s.url),confidence,status};
}