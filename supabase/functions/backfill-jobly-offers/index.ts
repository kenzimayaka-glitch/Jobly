import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "jobly-offer-v2";

const aliases: Record<string,string> = {
  mission:"missions", missions:"missions", "missions et responsabilites":"missions", responsabilite:"missions", responsabilites:"missions",
  tache:"missions", taches:"missions", "responsabilites principales":"missions",
  "missions principales":"missions", profil:"profile", "profil recherche":"profile",
  "profil et parcours academique":"profile", exigences:"profile", qualifications:"profile",
  formation:"education", formations:"education", diplome:"education", diplomes:"education",
  etudes:"education", "parcours academique":"education", experience:"experience",
  "experience professionnelle":"experience", "experiences professionnelles":"experience",
  competence:"skills", competences:"skills", "competences techniques":"skills",
  "aptitudes techniques":"skills", "savoir faire":"skills", "savoir-faire":"skills",
  qualite:"qualities", qualites:"qualities", "qualites recherchees":"qualities", "savoir etre":"qualities",
  "savoir-etre":"qualities", "aptitudes comportementales":"qualities",
  avantage:"benefits", avantages:"benefits", "ce que nous offrons":"benefits",
  "conditions de travail":"benefits", "aptitudes techniques et comportementales":"mixedAptitudes", candidature:"application", "pour postuler":"application",
  "modalites de candidature":"application", "comment postuler":"application",
  "documents a fournir":"application", "documents a joindre":"application"
};

const headers = [
  "Missions et responsabilités","Missions et responsabilites","Responsabilités principales",
  "Responsabilités","Missions","Tâches","Profil et parcours académique","Profil et parcours academique",
  "Profil recherché","Profil recherche","Exigences","Qualifications","Formation","Formations",
  "Parcours académique","Parcours academique","Expérience professionnelle","Experience professionnelle",
  "Expérience","Experience","Compétences techniques","Competences techniques","Compétences","Competences",
  "Aptitudes techniques et comportementales","Aptitudes techniques","Aptitudes comportementales",
  "Savoir-faire","Qualités","Qualités recherchées","Avantages","Ce que nous offrons",
  "Conditions de travail","Comment postuler","Candidature","Modalités de candidature",
  "Documents à fournir","Documents à joindre"
];

function decode(s:string){
  return s.replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;|&#34;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
    .replace(/&bull;|&#8226;/gi,"•").replace(/&ndash;|&#8211;/gi,"–").replace(/&mdash;|&#8212;/gi,"—");
}
function repair(s:string){
  if(!/(?:Ã.|Â.|â.)/.test(s)) return s;
  try{
    const bytes=new Uint8Array([...s].map(c=>c.charCodeAt(0)<=255?c.charCodeAt(0):63));
    const x=new TextDecoder().decode(bytes); return x&&!x.includes("�")?x:s;
  }catch{return s}
}
function clean(s:string){
  let x=decode(String(s||""))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"\n")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,"\n")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,"\n")
    .replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi,"\n")
    .replace(/(?:window\.)?(?:dataLayer|gtag|fbq)\s*(?:=|\()[\s\S]{0,1200}?(?:\);|;|\n)/gi,"\n")
    .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr)>/gi,"\n")
    .replace(/<(?:br|hr)\s*\/?>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/[\u0000-\u001F\u007F]/g," ")
    .replace(/\uFFFD+/g," ");
  return repair(x).replace(/\b(?:window|document)\.(?:dataLayer|gtag|fbq)\b[\s\S]{0,500}/gi," ").replace(/\bwindow\.\s*/gi," ").replace(/\bAller au contenu principal\s+Toggle navigation\s+Main navigation\b/gi," ").replace(/\bAccueil\s+Poster une offre\s+Services\s+Employeurs\s+Actualités\s+Temoignages\s+Aide\s+A propos\s+Contactez-nous\b/gi," ")
    .replace(/[ \t]+/g," ").replace(/[ \t]*\n[ \t]*/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
function key(s:string){
  return repair(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9@.+#/_ -]+/g," ").replace(/\s+/g," ").trim();
}
function bullet(s:string){
  return s.replace(/^[\s•●▪◦\-*–—·]+/,"").replace(/^\d+[.)]\s*/,"")
    .replace(/\s+/g," ").trim().replace(/^[,:;|]+|[,:;|]+$/g,"").trim();
}
function unique(xs:string[],max=40){return [...new Set(xs.map(bullet).filter(x=>x.length>=2))].slice(0,max);}
function splitHeaders(s:string){
  let out=s;
  for(const h of [...headers].sort((a,b)=>b.length-a.length)){
    const e=h.replace(/[.*+?^\$()|[\]\\]/g,"\\$&");
    out=out.replace(new RegExp("\\s+(?="+e+"\\s*[:：]?\\s*)","gi"),"\n");
  }
  return out;
}
function parse(raw:string){
  const sec:Record<string,string[]>={description:[],missions:[],profile:[],education:[],experience:[],skills:[],qualities:[],benefits:[],application:[]};
  let current="description", mixed=false;
  const prepared=splitHeaders(clean(raw)).replace(/\b(?:accueil|connexion|inscription|menu|recherche)\b/gi," ");
  for(const rawLine of prepared.split(/\n+/)){
    const line=bullet(rawLine); if(!line) continue;
    const colon=line.match(/^(.{2,90}?)\s*[:：]\s*(.*)$/);
    const candidate=key(colon?.[1]||line), alias=aliases[candidate];
    if(alias){
      current=alias; mixed=candidate==="aptitudes techniques et comportementales";
      if(colon?.[2]){
        const c=bullet(colon[2]);
        if(c){
          const target=mixed && /(?:droit|code du travail|sage|excel|word|powerpoint|paie|logiciel|informatique|outil|technique|rh|comptabilite|fiscal)/i.test(c)?"skills":mixed?"qualities":current;
          sec[target].push(c);
        }
      }
      continue;
    }
    if(/^aptitudes techniques et comportementales\b/i.test(line)){current="skills";mixed=true;continue;}
    if(mixed){
      const target=/(?:droit|code du travail|sage|excel|word|powerpoint|paie|logiciel|informatique|outil|technique|rh|comptabilite|fiscal)/i.test(line)?"skills":"qualities";
      sec[target].push(line);
    }else sec[current].push(line);
  }
  return sec;
}
function years(xs:string[]){
  const t=xs.join(" ");
  const n=t.match(/(?:minimum|minimale?|au moins|justifier\s+d['’]?une?\s+)?\s*(\d+)\s*(?:\(\s*\d+\s*\))?\s*(?:ans?|annee(?:s)?)/i);
  if(n?.[1]) return Number(n[1]);
  const words:Record<string,number>={un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10};
  const w=t.match(/(?:minimum|minimale?|au moins|justifier\s+d['’]?une?\s+)\s*(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*(?:ans?|annee(?:s)?)/i);
  return w?.[1]?words[w[1].toLowerCase()]??null:null;
}
function qualityStatus(title:string,description:string):"ok"|"needs_review"{
  const text=`${title}\\n${description}`;
  if(/window\\.dataLayer|\\bgtag\\s*\\(|toggle navigation|aller au contenu principal|poster une offre|<script\\b|<div\\b/i.test(text)) return "needs_review";
  if(description.trim().length<120) return "needs_review";
  return "ok";
}
function normalize(row:any){
  const sec=parse(row.description||"");
  const cleanArr=(x:string[])=>unique(x.filter(v=>!/(?:window\.|gtag\(|fbq\(|dataLayer)/i.test(v)));
  const experience=cleanArr(sec.experience), education=cleanArr(sec.education), skills=cleanArr(sec.skills),
    qualities=cleanArr(sec.qualities), missions=cleanArr(sec.missions), benefits=cleanArr(sec.benefits),
    application=cleanArr(sec.application), description=cleanArr(sec.description), profile=cleanArr(sec.profile);
  return {
    version:VERSION,title:clean(row.title)||null,company:null,
    location:String(row.location||"").split(/[,;|]/).map(bullet).filter(Boolean),region:null,sector:null,
    contractType:clean(row.contractType)||null,remoteMode:clean(row.remoteMode)||null,
    salary:{min:row.salaryMin??null,max:row.salaryMax??null,currency:row.salaryCurrency||"XAF"},
    experience,education,skills,qualities,missions,benefits,
    description:description.length?description:[clean(row.description||"")],
    application,deadline:row.deadline||null,
    source:{name:row.source||"",url:row.sourceUrl||""},qualityScore:null,flags:[]
  };
}

Deno.serve(async(req)=>{
  if(req.method!=="POST") return new Response(JSON.stringify({error:"POST required"}),{status:405,headers:{"content-type":"application/json"}});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body=await req.json().catch(()=>({}));
  const batch=Math.max(1,Math.min(Number(body.batchSize)||20,50));
  const {data:rows,error}=await supabase.from("Job")
    .select("id,title,description,location,contractType,remoteMode,salaryMin,salaryMax,salaryCurrency,deadline,source,sourceUrl")
    .eq("opportunityType","EMPLOI").or("normalizedVersion.is.null,normalizedVersion.neq."+VERSION)
    .order("createdAt",{ascending:true}).limit(batch);
  if(error)return new Response(JSON.stringify({error:error.message}),{status:500,headers:{"content-type":"application/json"}});
  let updated=0;
  for(const row of rows||[]){
    const c=normalize(row), exp=years(c.experience), now=new Date().toISOString();\n    const quality=qualityStatus(c.title||row.title||"", c.description.join("\n\n")||clean(row.description||""));
    const patch:any={normalizedContent:c,normalizedVersion:VERSION,normalizedAt:now,title:c.title||row.title,qualityStatus:quality,
      description:c.description.join("\n\n")||clean(row.description)||"",location:c.location.join(", ")||row.location,
      contractType:c.contractType||row.contractType,remoteMode:c.remoteMode||row.remoteMode,
      salaryMin:c.salary.min,salaryMax:c.salary.max,salaryCurrency:c.salary.currency,
      aiSkills:c.skills,minExperienceYears:exp,updatedAt:now};
    const u=await supabase.from("Job").update(patch).eq("id",row.id); if(!u.error)updated++;
  }
  return new Response(JSON.stringify({ok:true,version:VERSION,batchRequested:batch,selected:rows?.length||0,updated,remainingHint:(rows?.length||0)===batch}),{headers:{"content-type":"application/json"}});
});
