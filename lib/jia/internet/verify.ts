import type {SourceEvidence} from "./types";
import {crossCheck} from "./crossCheck";

export function verifyEvidence(query:string,sources:SourceEvidence[]){
  const result=crossCheck(query,sources);
  const contradictingSources=result.contradictingSources;
  const status=result.status;
  return {...result,contradictingSources,status};
}
