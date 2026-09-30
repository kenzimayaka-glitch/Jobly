import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const target=process.env.OFFER_TARGET_VERSION||"jobly-offer-v5", apply=process.env.OFFER_MIGRATION_APPLY==="true";
const limit=Number(process.env.OFFER_MIGRATION_LIMIT||1000), concurrency=Number(process.env.OFFER_MIGRATION_CONCURRENCY||5);
if(!url||!key) throw new Error("Missing Supabase credentials");
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

const aliases={
  description:["description","contexte","a propos","about the role","about the job"],
  missions:["missions","responsabilites","responsibilities","duties","taches"],
  profile:["profil","profil recherche","requirements","qualifications","candidate profile","conditions"],
  education:["formation","education","diplome","academic background"],
  experience:["experience","professional experience","work experience"],
  skills:["competences","skills","technical skills"],
  qualities:["qualites","savoir etre","soft skills","aptitudes"],
  benefits:["avantages","benefits","what we offer"],
  application:["comment postuler","pour postuler","modalites de candidature","candidature","application","how to apply","documents a fournir","pieces a fournir"]
};
const sectionOrder=["description","missions","profile","education","experience","skills","qualities","benefits","application"];
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9@._%+/-]+/g," ").replace(/\s+/g," ").trim();

function visible(h){
  return String(h||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"\n")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,"\n")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,"\n")
    .replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi,"\n")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<li\b[^>]*>/gi,"\n• ")
    .replace(/<\/(p|div|section|article|main|h[1-6])>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&").replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">");
}
function heading(x){
  const n=norm(x.replace(/[:：-]+$/,""));
  for(const k of sectionOrder) if(aliases[k].some(a=>n===norm(a)||n.startsWith(norm(a)+" "))) return k;
  return null;
}
const applicationSignal=/(?:postuler|candidature|envoyer(?:\s+|\s+votre\s+)?.{0,40}cv|envoyez(?:\s+|\s+votre\s+)?.{0,40}cv|modalites?\s+de\s+candidature|documents?\s+a\s+(?:fournir|joindre)|pieces?\s+a\s+(?:fournir|joindre)|objet\s+du\s+mail|pour\s+postuler|how\s+to\s+apply|apply\s+now)/i;
const navigationSignal=/(aller au contenu principal|toggle navigation|main navigation|articles similaires|leave a reply|cookie settings|powered by|souscrire à notre newsletter|copyright\s+\d{4}|conditions d.utilisation)/i;
function cleanLines(x){
  return [...new Set(String(x).split(/\n+/)
    .map(s=>s.replace(/^\s*[•●▪◦-]\s*/,"").trim())
    .filter(s=>s.length>1)
    .filter(s=>!navigationSignal.test(s)))];
}
function sections(html){
  const out=Object.fromEntries(sectionOrder.map(k=>[k,[]]));
  let cur="description";
  for(const raw of visible(html).split(/\n+/)){
    const x=raw.trim();
    if(!x) continue;
    const h=heading(x);
    if(h){cur=h;continue;}
    out[cur].push(x);
  }
  for(const k of sectionOrder) out[k]=cleanLines(out[k]).slice(0,120);
  return out;
}
function emails(x){return [...new Set(String(x).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])];}
function phone(x){return (String(x).match(/(?:\+?237[\s.-]?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|6[5-9]\d{7})/g)||[])[0]||null;}
function jsonld(html){
  for(const m of String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{const x=JSON.parse(m[1]);for(const j of(Array.isArray(x)?x:[x]))if(norm(j?.["@type"])==="jobposting")return j;}catch{}
  }
  return null;
}
function deadline(text,j){
  if(j?.validThrough) return String(j.validThrough);
  const m=String(text).match(/(?:date limite|deadline|postuler avant|expire le|cloture|clôture|jusqu.au)\s*[:：-]?\s*([^\n]{2,100})/i);
  return m?.[1]&&!/postulez maintenant|apply now/i.test(m[1])?m[1].trim():null;
}
function labeled(text,labels){
  const safe=labels.join("|");
  for(const l of String(text).split(/\n+/)){
    const m=l.trim().match(new RegExp("^(?:"+safe+")\\s*[:：-]\\s*(.{2,180})$","i"));
    if(m)return m[1].trim();
  }
  return null;
}
function contractType(text,j){
  const e=String(j?.employmentType||"").toUpperCase();
  if(/CDI|FULL.?TIME/.test(e))return "CDI";
  if(/CDD|CONTRACT/.test(e))return "CDD";
  if(/STAGE|INTERN/.test(e))return "STAGE";
  const m=String(text).match(/(?:type de contrat|contrat|employment type)\s*[:：-]\s*(CDI|CDD|Stage|Temps[- ]plein|Temps[- ]partiel)/i);
  return m?.[1]||null;
}
const applicationContactSignal=/(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|(?:\\+?237[\\s.-]?[6-9]\\d{2}[\\s.-]?\\d{3}[\\s.-]?\\d{3}|6[5-9]\\d{7})|https?:\\/\\/)/i;
function tokenSet(value){return new Set(norm(value).split(/\\s+/).filter(Boolean));}
function semanticSimilarity(a,b){
  const x=norm(a),y=norm(b);
  if(!x||!y)return 0;
  if(x===y)return 1;
  if(x.includes(y)||y.includes(x))return Math.min(x.length,y.length)/Math.max(x.length,y.length);
  const A=tokenSet(x),B=tokenSet(y),inter=[...A].filter(t=>B.has(t)).length;
  return inter/Math.max(1,new Set([...A,...B]).size);
}
function canonicalOwnership(raw){
  const out=Object.fromEntries(sectionOrder.map(k=>[k,[]]));
  const owners=[];
  const priority=["application","missions","profile","education","experience","skills","qualities","benefits","description"];
  const add=(section,value)=>{
    const v=String(value||"").trim();
    if(v.length<2)return;
    const target=section==="application"||applicationSignal.test(v)||applicationContactSignal.test(v)?"application":section;
    if(owners.some(item=>semanticSimilarity(item.value,v)>=0.92))return;
    owners.push({value:v,section:target});
    out[target].push(v);
  };
  for(const v of raw.application)add("application",v);
  for(const section of priority){
    if(section==="application")continue;
    for(const v of raw[section])add(section,v);
  }
  for(const k of sectionOrder)out[k]=out[k].slice(0,100);
  return out;
}
function fetchPage(u){
  return fetch(u,{redirect:"follow",headers:{"user-agent":"Jobly-Offer-Migration/1.0",accept:"text/html,application/xhtml+xml"}})
    .then(async r=>({ok:r.ok,status:r.status,html:await r.text(),finalUrl:r.url}))
    .catch(e=>({ok:false,error:String(e)}));
}
function build(job,html,finalUrl){
  const raw=visible(html), sec=canonicalOwnership(sections(html)), j=jsonld(html);
  const title=j?.title||labeled(raw,["Intitulé du poste","Poste proposé","Titre","Job Title"])||job.title;
  const company=j?.hiringOrganization?.name||labeled(raw,["Entreprise","Employeur","Nom de l'employeur","Company"])||job.company?.name||null;
  const loc=j?.jobLocation?.address?.addressLocality||j?.jobLocation?.name||labeled(raw,["Localisation","Lieu","Location","Ville"]);
  const app=sec.application.join("\n"), ae=emails(app)[0]||null, ap=phone(app);
  const au=(app.match(/https?:\/\/[^\s<>"')]+/i)||[])[0]||null;
  const sm=app.match(/(?:objet|subject)[^:：-]{0,30}[:：-]\s*[«"]?([^\n»"]{3,180})/i), subject=sm?.[1]?.trim()||null;
  const c={version:target,title,company,location:loc?[loc]:[],region:null,description:sec.description,missions:sec.missions,profile:sec.profile,education:sec.education,experience:sec.experience,skills:sec.skills,qualities:sec.qualities,benefits:sec.benefits,salary:{min:job.salaryMin??null,max:job.salaryMax??null,currency:job.salaryCurrency||"XAF"},deadline:deadline(raw,j),contractType:contractType(raw,j),remoteMode:j?.jobLocationType==="TELECOMMUTE"?"YES":job.remoteMode||"NO",application:sec.application,applicationEmail:ae,applicationPhone:ap,applicationUrl:au,emailSubject:subject,source:{url:finalUrl||job.sourceUrl,name:job.source||job.sourceKey||null},flags:[]};
  const issues=[];
  if(!c.title)issues.push("MISSING_TITLE");
  if(!c.company||/employeur non précisé|non précisé/i.test(c.company))issues.push("MISSING_COMPANY");
  if(!c.location.length)issues.push("MISSING_LOCATION");
  if(!c.missions.length)issues.push("MISSING_MISSIONS");
  if(!c.profile.length)issues.push("MISSING_PROFILE");
  if(!ae&&!ap&&!au&&!c.application.length)issues.push("MISSING_APPLICATION_PATH");
  if(c.profile.some(v=>applicationSignal.test(v))||c.missions.some(v=>applicationSignal.test(v))||c.description.some(v=>applicationSignal.test(v)))issues.push("APPLICATION_LEAK");
  return{canonical:c,issues,rawLength:raw.length};
}
async function main(){
  const q=await db.from("Job").select("id,title,location,contractType,remoteMode,salaryMin,salaryMax,salaryCurrency,deadline,sourceUrl,source,sourceKey,normalizedVersion,companyId").eq("isActive",true).order("createdAt",{ascending:true}).limit(limit);
  if(q.error)throw q.error;
  const jobs=q.data||[], companyIds=[...new Set(jobs.map(j=>j.companyId).filter(Boolean))];
  let companyMap=new Map();
  if(companyIds.length){
    const{data:companies,error:companyError}=await db.from("Company").select("id,name,website").in("id",companyIds);
    if(companyError)throw companyError;
    companyMap=new Map((companies||[]).map(c=>[c.id,c]));
  }
  for(const j of jobs)j.company=companyMap.get(j.companyId)||null;
  const res=[];let i=0;
  async function worker(){
    while(true){
      const n=i++;if(n>=jobs.length)return;
      const job=jobs[n],p=await fetchPage(job.sourceUrl);
      if(!p.ok){res.push({id:job.id,title:job.title,status:"BLOCKED",issues:["SOURCE_UNAVAILABLE"],applied:false});continue;}
      const b=build(job,p.html,p.finalUrl),critical=b.issues.some(x=>["MISSING_TITLE","MISSING_COMPANY","MISSING_LOCATION","APPLICATION_LEAK"].includes(x)),status=critical?"BLOCKED":b.issues.length?"WARNING":"PASS";
      let applied=false;
      if(apply&&status!=="BLOCKED"){
        const u=await db.from("Job").update({title:b.canonical.title,location:b.canonical.location[0]||null,deadline:b.canonical.deadline||null,contractType:b.canonical.contractType||null,normalizedVersion:target,normalizedContent:b.canonical,applicationProfile:{channel:b.canonical.applicationEmail?"EMAIL":b.canonical.applicationUrl?"URL":b.canonical.applicationPhone?"PHONE":"EMAIL",applicationEmail:b.canonical.applicationEmail,applicationPhone:b.canonical.applicationPhone,applicationUrl:b.canonical.applicationUrl,emailSubject:b.canonical.emailSubject,comingSoon:false}}).eq("id",job.id);
        applied=!u.error;if(u.error)b.issues.push("UPDATE_FAILED");
      }
      res.push({id:job.id,title:job.title,status,issues:b.issues,oldVersion:job.normalizedVersion,newVersion:status==="BLOCKED"?job.normalizedVersion:target,applied,canonical:b.canonical});
    }
  }
  await Promise.all(Array.from({length:Math.min(concurrency,jobs.length)},worker));
  res.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const s={generatedAt:new Date().toISOString(),mode:apply?"APPLY":"DRY_RUN",targetVersion:target,total:res.length,pass:res.filter(x=>x.status==="PASS").length,warning:res.filter(x=>x.status==="WARNING").length,blocked:res.filter(x=>x.status==="BLOCKED").length,applied:res.filter(x=>x.applied).length};
  await fs.mkdir("migration-output",{recursive:true});
  await fs.writeFile("migration-output/offers-migration.json",JSON.stringify({summary:s,results:res},null,2));
  console.log(JSON.stringify(s,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});