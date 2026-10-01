function entities(v:string){return v.replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
export function extractDocument(html:string){
  const title=entities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/\s+/g," ").trim().slice(0,240);
  const publisher=entities(html.match(/<meta[^>]+(?:name|property)=["'](?:author|og:site_name|article:publisher)["'][^>]+content=["']([^"']+)["']/i)?.[1]||"").trim()||undefined;
  const publishedAt=html.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|pubdate)["'][^>]+content=["']([^"']+)["']/i)?.[1]||html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];
  const body=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ").replace(/<svg[\s\S]*?<\/svg>/gi," ").replace(/<[^>]+>/g," ");
  return {title,publisher,publishedAt,text:entities(body).replace(/\s+/g," ").trim().slice(0,12000)};
}