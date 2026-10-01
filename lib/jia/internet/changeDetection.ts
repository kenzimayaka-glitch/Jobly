import type {SourceEvidence} from "./types";

const previousByQuery=new Map<string,Set<string>>();

export function detectChanges(query:string,sources:SourceEvidence[]){
  const current=new Set(sources.map(s=>s.url));
  const previous=previousByQuery.get(query);
  const changes:Array<{url:string;type:"NEW"|"MODIFIED"|"DISAPPEARED"|"STALE"}>=[];
  if(previous){
    for(const url of previous) if(!current.has(url)) changes.push({url,type:"DISAPPEARED"});
  }
  for(const source of sources){
    if(!previous||!previous.has(source.url)) changes.push({url:source.url,type:"NEW"});
  }
  previousByQuery.set(query,current);
  return changes;
}