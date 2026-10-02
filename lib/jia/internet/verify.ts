import type {SourceEvidence,EvidenceStatus} from "./types";
import {crossCheck} from "./crossCheck";

export function verifyEvidence(query:string,sources:SourceEvidence[]){
  const result=crossCheck(query,sources);
  const contradictingSources=result.contradictingSources;
  const status:EvidenceStatus=result.status;
  return {...result,contradictingSources,status};
}
