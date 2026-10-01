import type {SourceEvidence} from "./types";
const previous=new Map<string,string>();
export function detectChanges(sources:SourceEvidence[]){
  const changes:Array<{url:string;type:"NEW"|"MODIFIED"|"DISAPPEARED"|"STALE"}>=[];
  for(const s of sources){const old=previous.get(s.url);if(!old)changes.push({url:s.url,type:"NEW"});else if(old!==s.contentHash)changes.push({url:s.url,type:"MODIFIED"});previous.set(s.url,s.contentHash);}
  return changes;
}