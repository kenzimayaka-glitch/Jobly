import dns from "node:dns/promises";
import type {SourceEvidence} from "./types";
import {classifySource,sourceAuthority} from "./sourceRegistry";
import {sha256} from "./normalize";
import {extractDocument} from "./extract";
const MAX_BYTES=1500000;
function privateIpv4(h:string){const p=h.split(".").map(Number);if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255))return false;return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168);}
async function safeUrl(raw:string){const u=new URL(raw);if(u.protocol!=="https:")throw new Error("only_https_allowed");const h=u.hostname.toLowerCase();if(h==="localhost"||h.endsWith(".local")||privateIpv4(h)||h==="::1"||h.startsWith("fc")||h.startsWith("fd"))throw new Error("private_host_blocked");const addresses=await dns.lookup(h,{all:true});if(addresses.some(a=>privateIpv4(a.address)||a.address==="::1"||/^f[cd]/i.test(a.address)))throw new Error("private_resolution_blocked");return u;}
export async function fetchSource(rawUrl:string,timeoutMs:number):Promise<SourceEvidence>{
  let current=await safeUrl(rawUrl);let response:Response|null=null;
  for(let hop=0;hop<4;hop++){const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeoutMs);try{response=await fetch(current,{signal:c.signal,redirect:"manual",headers:{"user-agent":"Jobly-JIA-InternetBrain/1.0",accept:"text/html,application/xhtml+xml,text/plain;q=0.8"},cache:"no-store"});}finally{clearTimeout(timer);}
    if(response.status>=300&&response.status<400){const loc=response.headers.get("location");if(!loc)break;current=await safeUrl(new URL(loc,current).href);continue;}break;}
  if(!response)throw new Error("no_response");if(!response.ok)throw new Error(`fetch_http_${response.status}`);
  const type=response.headers.get("content-type")||"";if(!/text\/(html|plain)|application\/xhtml\+xml/i.test(type))throw new Error("unsupported_content_type");
  const len=Number(response.headers.get("content-length")||0);if(len>MAX_BYTES)throw new Error("document_too_large");
  const raw=await response.text();if(raw.length>MAX_BYTES)throw new Error("document_too_large");
  const doc=extractDocument(raw);const domain=current.hostname;const sourceType=classifySource(domain);const authority=sourceAuthority(sourceType,domain);
  return{url:current.href,domain,title:doc.title||domain,publisher:doc.publisher,retrievedAt:new Date().toISOString(),publishedAt:doc.publishedAt,sourceType,authority,freshness:"unknown",relevance:0,reliability:authority,confidence:0,content:doc.text,contentHash:sha256(doc.text)};
}