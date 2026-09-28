export type DiscoveryItem = {
  title:string; description:string; company:string; location:string; url:string;
  deadline:string|null; published:string|null;
};

function decodeEntities(value:string):string {
  const named:Record<string,string>={"&nbsp;":" ","&amp;":"&","&quot;":"\"","&#39;":"'","&apos;":"'","&lt;":"<","&gt;":">","&ndash;":"–","&mdash;":"—","&hellip;":"…","&bull;":"•","&oelig;":"œ","&OElig;":"Œ","&eacute;":"é","&Eacute;":"É","&egrave;":"è","&Egrave;":"È","&ecirc;":"ê","&Ecirc;":"Ê","&agrave;":"à","&Agrave;":"À","&ccedil;":"ç","&Ccedil;":"Ç","&ocirc;":"ô","&Ocirc;":"Ô","&ucirc;":"û","&Ucirc;":"Û","&uuml;":"ü","&Uuml;":"Ü","&iuml;":"ï","&Iuml;":"Ï","&icirc;":"î","&Icirc;":"Î","&ouml;":"ö","&Ouml;":"Ö","&szlig;":"ß","&lsquo;":"‘","&rsquo;":"’","&ldquo;":"“","&rdquo;":"”"};
  return value
    .replace(/&([a-z][a-z0-9]+);/gi,(token,name)=>named[token.toLowerCase()]??token)
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}
function repairMojibake(value:string):string {
  if(!/[ÃÂâðÐÑ]/.test(value)) return value;
  try {
    const bytes=new Uint8Array([...value].map(ch=>ch.charCodeAt(0)<=255?ch.charCodeAt(0):63));
    const repaired=new TextDecoder("utf-8",{fatal:false}).decode(bytes);
    return repaired&&!repaired.includes("�")?repaired:value;
  } catch { return value; }
}
const clean=(s:any)=>repairMojibake(decodeEntities(String(s??"").replace(/<[^>]+>/g," "))).replace(/\u00a0/g," ").replace(/\s+/g," ").trim();

function cleanInfosConcoursContent(html:string):string {
  let source=String(html||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"\n")
    .replace(/<(?:nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside|form|dialog)>/gi,"\n")
    .replace(/<([a-z0-9]+)\b[^>]*(?:class|id)=["'][^"']*(?:sharedaddy|jp-relatedposts|related-posts|sidebar|widget|social|share|newsletter|comment|footer|menu|navigation|breadcrumb|ads|advert|cookie)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,"\n");

  const containers:string[]=[];
  const re=/<(article|main|div|section)\b[^>]*(?:class|id)=["'][^"']*(?:entry-content|post-content|article-content|single-post|post-body|article-body|content-area|td-post-content)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  for(const match of source.matchAll(re)){const body=match[2]||"";if(body.length>=120)containers.push(body);}
  if(containers.length)source=containers.sort((a,b)=>b.length-a.length)[0];

  const text=repairMojibake(decodeEntities(
    source
      .replace(/<([a-z0-9]+)\b[^>]*(?:class|id)=["'][^"']*(?:share|related|social|newsletter|comment|widget|sidebar|ads|advert)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,"\n")
      .replace(/<a\b[^>]*>(?:\s*(?:facebook|instagram|twitter|youtube|whatsapp|rejoindre|abonnez|suivez)[\s\S]*?)<\/a>/gi,"\n")
      .replace(/<br\s*\/?>/gi,"\n")
      .replace(/<li\b[^>]*>/gi,"\n• ")
      .replace(/<\/li>/gi,"\n")
      .replace(/<\/(p|div|section|article|blockquote|h[1-6])>/gi,"\n")
      .replace(/<[^>]+>/g," ")
  ));
  const lines=text.split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
  const filtered:string[]=[];
  let footer=false;
  for(const line of lines){
    if(/^(?:tous les concours|résultats des concours|resultats des concours|concours|bourses? du gouvernement|bourses? d['’]amérique|bourses? d['’]afrique|bourses? d['’]europe|bourses? d['’]asie)$/i.test(line)) continue;
    if(/^(?:cliquez ici pour|abonnez[- ]vous|notre page|notre chaine|notre chaîne|suivez nous|articles similaires|populaires en ce moment|infos utiles|categories populaires|mentions légales|mentions legales|©)/i.test(line)){footer=true;continue;}
    if(footer)continue;
    filtered.push(line);
  }
  return filtered.join("\n").trim().slice(0,30000);
}

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

async function fetchInfosConcoursEducation(): Promise<DiscoveryItem[]> {
  const endpoint = "https://infosconcourseducation.com/wp-json/wp/v2/posts?per_page=30&orderby=date&order=desc&_fields=link,title,content,date";
  const response = await fetch(endpoint, {
    headers: { "accept": "application/json", "user-agent": "JOBLY-Discovery/3.1" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error("INFOS_CONCOURS_" + response.status);
  const posts = await response.json();
  if (!Array.isArray(posts)) return [];
  return posts.map((post:any) => {
    const link = typeof post?.link === "string" ? post.link : "";
    const title = clean(post?.title?.rendered);
    const description = cleanInfosConcoursContent(post?.content?.rendered);
    return {
      title,
      description,
      company: "",
      website: null,
      location: inferCity(title + " " + description),
      url: link,
      deadline: null,
      published: typeof post?.date === "string" ? post.date : null,
    };
  }).filter((x:DiscoveryItem) =>
    x.title && x.url &&
    /infosconcourseducation\.com\//i.test(x.url) &&
    !/(?:\/category\/|\/tag\/|\/author\/|\/page\/|\/actualite\/)/i.test(x.url) &&
    /(?:offre|emploi|recrut|stage|commercial|assistant|manager|technicien|agent|chauffeur|vendeur|promotrice|promoteur)/i.test(x.url + " " + x.title)
  );
}

export async function fetchStructuredSource(sourceKey:string):Promise<DiscoveryItem[]|null>{
  if(sourceKey==="infosconcourseducation"){
    return await fetchInfosConcoursEducation();
  }

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
