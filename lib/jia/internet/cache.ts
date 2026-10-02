import type {ExternalObservation,SearchResult,SourceEvidence} from "./types";
type Entry<T>={value:T;expiresAt:number};const searchCache=new Map<string,Entry<SearchResult[]>>();const observationCache=new Map<string,Entry<ExternalObservation>>();const sourceCache=new Map<string,Entry<SourceEvidence>>();
const key=(q:string)=>q.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
export function getSearchCache(q:string){const x=searchCache.get(key(q));return x&&x.expiresAt>Date.now()?x.value:undefined;}
export function setSearchCache(q:string,v:SearchResult[],ttl:number){searchCache.set(key(q),{value:v,expiresAt:Date.now()+ttl});}
export function getObservationCache(q:string){const x=observationCache.get(key(q));return x&&x.expiresAt>Date.now()?x.value:undefined;}
export function setObservationCache(q:string,v:ExternalObservation,ttl:number){observationCache.set(key(q),{value:v,expiresAt:Date.now()+ttl});}
export function getSourceCache(url:string){const x=sourceCache.get(url);return x&&x.expiresAt>Date.now()?x.value:undefined;}
export function setSourceCache(url:string,v:SourceEvidence,ttl:number){sourceCache.set(url,{value:v,expiresAt:Date.now()+ttl});}