import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "jobly-offer-v1";

function decodeEntities(s:string){return s.replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&bull;|&#8226;/gi,"•").replace(/&ndash;|&#8211;/gi,"–").replace(/&mdash;|&#8212;/gi,"—");}
function repair(s:string){if(!/(?:Ã.|Â.|â.)/.test(s))return s;try{const bytes=new Uint8Array([...s].map(c=>c.charCodeAt(0)<=255?c.charCodeAt(0):63));const x=new TextDecoder().decode(bytes);return x&&!x.includes("�")?x:s}catch{return s}}
function clean(s:string){return repair(decodeEntities(String(s||"")).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi," ").replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ").replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/window\.(?:dataLayer|gtag|fbq)\s*\([^\n]*\)?[;]?/gi," ").replace(/<[^>]+>/g," ").replace(/[\u0000-\u001F\u007F]/g," ").replace(/\uFFFD+/g," ").replace(/[ \t]+\n/g,"\n").replace(/\n[ \t]+/g,"\n").replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim())}
function norm(s:string){return clean(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9@.+#/_ -]+/g," ").replace(/\s+/g," ").trim()}
function arr(xs:string[]){return [...new Set(xs.map(clean).filter(x=>x.length>=2))].slice(0,40)}
const aliases:Record<string,string>={mission:"missions",missions:"missions",responsabilites:"missions",taches:"missions",profil:"profile","profil recherche":"profile",exigences:"profile",qualifications:"profile",formation:"education",formations:"education",diplome:"education",diplomes:"education",etudes:"education",experience:"experience","experience professionnelle":"experience",competence:"skills",competences:"skills","competences techniques":"skills","savoir faire":"skills",qualite:"qualities",qualites:"qualities","savoir etre":"qualities",avantage:"benefits",avantages:"benefits","ce que nous offrons":"benefits","conditions de travail":"benefits",candidature:"application","pour postuler":"application","modalites de candidature":"application","comment postuler":"application","documents a fournir":"application","documents a joindre":"application"};
function normalizeRow(row:any){
 const raw=clean(row.description||""); const sec:Record<string,string[]>={description:[],missions:[],profile:[],education:[],experience:[],skills:[],qualities:[],benefits:[],application:[]}; let current="description";
 for(const line of raw.split(/\n+/).map(x=>x.trim()).filter(Boolean)){
   const m=line.match(/^(.{2,80}?)\s*[:：]\s*(.+)$/); const k=norm(m?.[1]||"");
   if(m&&aliases[k]){current=aliases[k]; if(m[2])sec[current].push(m[2]); continue;}
   if(aliases[norm(line)]){current=aliases[norm(line)];continue;}
   sec[current].push(line);
 }
 const content={version:VERSION,title:clean(row.title)||null,company:null,location:String(row.location||"").split(/[,;|]/).map(clean).filter(Boolean),region:null,sector:null,contractType:clean(row.contractType)||null,remoteMode:clean(row.remoteMode)||null,salary:{min:row.salaryMin??null,max:row.salaryMax??null,currency:row.salaryCurrency||"XAF"},experience:arr(sec.experience),education:arr(sec.education),skills:arr(sec.skills),qualities:arr(sec.qualities),missions:arr(sec.missions),benefits:arr(sec.benefits),description:arr(sec.description),application:arr(sec.application),deadline:row.deadline||null,source:{name:row.source||"",url:row.sourceUrl||""},qualityScore:null,flags:[]};
 return content;
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response(JSON.stringify({error:"POST required"}),{status:405,headers:{"content-type":"application/json"}});
 const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const body=await req.json().catch(()=>({})); const batch=Math.max(1,Math.min(Number(body.batchSize)||10,20));
 const {data:rows,error}=await supabase.from("Job").select("id,title,description,location,contractType,remoteMode,salaryMin,salaryMax,salaryCurrency,deadline,source,sourceUrl").eq("opportunityType","EMPLOI").is("normalizedVersion",null).order("createdAt",{ascending:true}).limit(batch);
 if(error) return new Response(JSON.stringify({error:error.message}),{status:500,headers:{"content-type":"application/json"}});
 let updated=0;
 for(const row of rows||[]){const c=normalizeRow(row); const patch:any={normalizedContent:c,normalizedVersion:VERSION,normalizedAt:new Date().toISOString(),title:c.title||row.title,description:c.description.join("\n\n")||clean(row.description)||"",location:c.location.join(", ")||row.location,contractType:c.contractType||row.contractType,remoteMode:c.remoteMode||row.remoteMode,salaryMin:c.salary.min,salaryMax:c.salary.max,salaryCurrency:c.salary.currency,aiSkills:c.skills,updatedAt:new Date().toISOString()}; const u=await supabase.from("Job").update(patch).eq("id",row.id); if(!u.error)updated++;}
 return new Response(JSON.stringify({ok:true,batchRequested:batch,selected:rows?.length||0,updated,remainingHint:(rows?.length||0)===batch}),{headers:{"content-type":"application/json"}});
});