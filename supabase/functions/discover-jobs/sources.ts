export type DiscoveryItem = {
  title:string; description:string; company:string; location:string; url:string;
  deadline:string|null; published:string|null;
};

const clean=(s:any)=>String(s??"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();

function rssItems(xml:string): DiscoveryItem[] {
  const out: DiscoveryItem[] = [];
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  const cleanTag = (value:string) => clean(value.replace(/<!\[CDATA\[/g,"").replace(/\]\]>/g,""));
  for (const block of blocks) {
    const get = (tag:string) => {
      const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
      return m ? cleanTag(m[1]) : "";
    };
    const linkAttr = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    const linkText = get("link");
    const item: DiscoveryItem = {
      title: get("title"),
      description: get("description") || get("summary") || get("content"),
      company: get("company") || get("author"),
      website: cleanTag(get("website") || get("companyWebsite")) || null,
      location: get("location") || get("city"),
      url: cleanTag(linkAttr?.[1] || linkText),
      deadline: get("validThrough") || null,
      published: get("pubDate") || get("published") || get("datePosted") || null
    };
    if (item.title && item.url) out.push(item);
  }
  return out;
}

async function fetchJson(url:string, init:RequestInit={}){
  const r=await fetch(url,{...init,headers:{"accept":"application/json","content-type":"application/json",...(init.headers||{})},redirect:"follow"});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return await r.json();
}

async function fetchRss(url:string){
  const r=await fetch(url,{headers:{"accept":"application/rss+xml, application/xml, text/xml","user-agent":"JOBLY-Discovery/3.0"},redirect:"follow"});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return rssItems(await r.text());
}

export async function fetchStructuredSource(sourceKey:string):Promise<DiscoveryItem[]|null>{
  if(sourceKey==="minajobs_rss"){
    return await fetchRss(Deno.env.get("MINAJOBS_RSS_URL")||"https://cm2024.minajobs.net/rss");
  }

  if(sourceKey==="techmap_cm"){
    const key=Deno.env.get("TECHMAP_RAPIDAPI_KEY");
    if(!key) return [];
    const host=Deno.env.get("TECHMAP_RAPIDAPI_HOST")||"daily-international-job-postings.p.rapidapi.com";
    const base=Deno.env.get("TECHMAP_API_URL")||`https://${host}/api/v2/jobs/search`;
    const u=new URL(base);
    u.searchParams.set("countryCode","cm");
    u.searchParams.set("dateCreatedMin",new Date(Date.now()-7*86400000).toISOString().slice(0,10));
    u.searchParams.set("isDuplicate","false");
    const data=await fetchJson(u.toString(),{headers:{"X-RapidAPI-Key":key,"X-RapidAPI-Host":host}});
    const rows=data?.data ?? data?.results ?? [];
    return rows.map((x:any)=>({title:clean(x.title),description:clean(x.description),company:clean(x.company),website:clean(x.companyUrl||x.company_url||x.companyWebsite||x.website)||null,location:clean(x.location||x.city),url:clean(x.url||x.link),deadline:clean(x.deadline||x.expiresAt)||null,published:clean(x.dateCreated||x.pubDate||x.datePosted)||null})).filter((x:DiscoveryItem)=>x.title&&x.url);
  }

  if(sourceKey==="jobspipe_cm"){
    const key=Deno.env.get("JOBSPIPE_API_KEY");
    if(!key) return null;
    const base=Deno.env.get("JOBSPIPE_API_URL")||"https://api.jobspipe.dev/v1/jobs/search";
    const data=await fetchJson(base,{method:"POST",headers:{"Authorization":`Bearer ${key}`},body:JSON.stringify({job_country_code_or:["CM"],limit:100,include_total_results:true})});
    return (data?.data||[]).map((x:any)=>({title:clean(x.job_title),description:clean(x.description),company:clean(x.company),website:clean(x.company_url||x.companyUrl||x.company_website||x.website)||null,location:clean(x.location||x.long_location),url:clean(x.final_url||x.url||x.source_url),deadline:clean(x.expires_at)||null,published:clean(x.date_posted)||null})).filter((x:DiscoveryItem)=>x.title&&x.url);
  }

  if(sourceKey==="jooble_cm"){
    const key=Deno.env.get("JOOBLE_API_KEY"), endpoint=Deno.env.get("JOOBLE_API_URL");
    if(!key||!endpoint) return [];
    const data=await fetchJson(endpoint,{method:"POST",body:JSON.stringify({keywords:Deno.env.get("JOOBLE_KEYWORDS")||"emploi",location:"Cameroon",page:1,ResultOnPage:100})});
    return (data?.jobs||data?.data||[]).map((x:any)=>({title:clean(x.title),description:clean(x.snippet||x.description),company:clean(x.company),website:clean(x.company_url||x.companyUrl||x.website)||null,location:clean(x.location),url:clean(x.link||x.url),deadline:null,published:clean(x.updated)||null})).filter((x:DiscoveryItem)=>x.title&&x.url);
  }

  return null;
}
