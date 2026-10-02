import type {SearchAdapter,SearchResult} from "./types";
import {classifySource} from "./sourceRegistry";
const DDG="https://html.duckduckgo.com/html/";
function decodeHtml(v:string){return v.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
function absoluteUrl(raw:string){try{const decoded=decodeHtml(raw);const u=new URL(decoded.startsWith("//")?"https:"+decoded:decoded);const uddg=u.searchParams.get("uddg");return uddg?decodeURIComponent(uddg):u.href;}catch{return null;}}
export class DuckDuckGoAdapter implements SearchAdapter{
  async search(query:string,limit:number,signal?:AbortSignal):Promise<SearchResult[]>{
    const u=new URL(DDG);u.searchParams.set("q",query.slice(0,300));u.searchParams.set("kl","wt-wt");
    const res=await fetch(u,{headers:{"user-agent":"Jobly-JIA-InternetBrain/1.0","accept":"text/html"},signal,cache:"no-store"});
    if(!res.ok)throw new Error(`search_http_${res.status}`);
    const html=await res.text();const out:SearchResult[]=[];
    const blocks=html.match(/<div[^>]+class=["'][^"']*result[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi)||[];
    for(const block of blocks){
      if(out.length>=limit)break;
      const href=block.match(/class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1];
      const titleRaw=block.match(/class=["'][^"']*result__a[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)?.[1];
      const snippetRaw=block.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1];
      const resultUrl=href?absoluteUrl(href):null;if(!resultUrl||!titleRaw)continue;
      const clean=(v:string)=>decodeHtml(v.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
      try{const p=new URL(resultUrl);out.push({title:clean(titleRaw).slice(0,240),url:p.href,snippet:clean(snippetRaw||"").slice(0,600),domain:p.hostname,sourceType:classifySource(p.hostname)});}catch{}
    }
    return out;
  }
}