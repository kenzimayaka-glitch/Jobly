import { resolveApplicationContact } from "../../../lib/applicationEngine";
import { cleanCompanyName, cleanJobDescription, cleanJobTitle, extractCompanyNameFromDescription } from "../../../lib/jobContent";
import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_FEED_SIZE = 200;
const MAX_FEED_SIZE = 200;

type Profile = { targetRoles: string[] | null; targetCities: string[] | null; contractPreferences: string[] | null; remotePreference: string | null; preferredSectors?: string[] | null; location?: string | null; headline?: string | null; summary?: string | null };
type Skill = { name: string; level?: string | null };
type Education = { degree?: string | null; field?: string | null };
type Experience = { startDate: string; title?: string | null; description?: string | null };
type NormalizedContent = { version?:string; title?:string|null; company?:string|null; location?:string[]; contractType?:string|null; remoteMode?:string|null; salary?:{min:number|null;max:number|null;currency:string|null}; deadline?:string|null; description?:string[]; missions?:string[]; profile?:string[]; education?:string[]; experience?:string[]; skills?:string[]; qualities?:string[]; benefits?:string[]; application?:string[]; sector?:string|null; source?:{name?:string;url?:string}; qualityScore?:number|null };
type Job = { id:string; opportunityType?:string|null; title:string; description:string; location:string|null; contractType:string|null; remoteMode:string|null; minExperienceYears:number|null; isActive:boolean; createdAt:string; companyId:string|null; source:string|null; sourceUrl:string|null; deadline:string|null; lastSeenAt:string|null; sourcePublishedAt:string|null; applicationReady:boolean; applicationProfile:Record<string,unknown>; visualUrl:string|null; visualSource:string|null; applicationCheckedAt:string|null; language?:string|null; aiSector?:string|null; normalizedContent?:NormalizedContent|null; aiSkills?:unknown; tags?:string[] };
type Company = { id:string; name:string; logoUrl:string|null; description:string|null; website:string|null; verified:boolean };
function isGenericCompanyName(name:string|null|undefined){const n=normalize(name);return !n||n==="entreprise"||n==="employeur non precise"||n==="entreprise de la place";}
function companyDomain(website:string|null|undefined):string|null { if(!website) return null; try { const raw=website.startsWith("http")?website:`https://${website}`; return new URL(raw).hostname.toLowerCase().replace(/^www\\./,"") || null; } catch { return null; } }
type RecruiterJobRow = { id:string; title:string; companyName:string; description:string; location:string|null; contract:string|null; remoteMode:string|null; minExperienceYears:number|null; status:string; createdAt:string; sourceType:string; sourceUrl:string|null; sourcePlatform:string|null; applicationReady:boolean; applicationProfile:Record<string,unknown>; visualUrl:string|null; visualSource:string|null; applicationCheckedAt:string|null; sector?:string|null; tags?:string[] };
type MatchableJob = { title:string; description?:string|null; location:string|null; contractType:string|null; remoteMode:string|null; minExperienceYears:number|null; sector?:string|null; tags?:string[]; language?:string|null };

function computeYearsExperience(experiences:Experience[]):number|null { if(!experiences.length)return null; const earliest=experiences.map(e=>new Date(e.startDate).getTime()).filter(t=>!Number.isNaN(t)).sort((a,b)=>a-b)[0]; if(earliest===undefined)return null; return Math.max(0,Math.floor((Date.now()-earliest)/(1000*60*60*24*365))); }
function normalize(value:string|null|undefined):string { return (value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function addMonths(date: Date, months: number): Date { const next = new Date(date); next.setMonth(next.getMonth() + months); return next; }
function platformExpiration(createdAt:string):Date|null { const d=new Date(createdAt); return Number.isFinite(d.getTime()) ? addMonths(d,2) : null; }
function deadlineExpired(deadline:string|null|undefined):boolean { if(!deadline)return false; const d=new Date(deadline); return Number.isFinite(d.getTime()) && d.getTime() < Date.now(); }
type MatchCriterion = { id:string; label:string; score:number|null; weight:number; required:boolean; status:"MATCH"|"PARTIAL"|"MISMATCH"|"UNKNOWN"; candidateValue?:string|null; expectedValue?:string|null };
const WEIGHTS:Record<string,number>={role:20,skills:30,experience:20,education:12,language:10,location:5,sector:2,contract:1};
function detectExp(text:string,min:number|null){if(min!=null&&min>0)return min;const m=normalize(text).match(/(?:minimum|min|au moins|plus de)\s*(\d+)\s*(?:ans?|annees?|years?)/);return m?Number(m[1]):null;}
function detectEdu(text:string){const n=normalize(text);if(/bac\s*\+\s*5|bac5|master|mba|ingenieur|doctorat|phd/.test(n))return 5;if(/bac\s*\+\s*4|bac4|maitrise/.test(n))return 4;if(/bac\s*\+\s*3|bac3|licence|bachelor/.test(n))return 3;if(/bac\s*\+\s*2|bac2|bts|dut|deug/.test(n))return 2;if(/baccalaureat|high school/.test(n))return 0;return null;}
function eduLevel(value:string|null|undefined){const n=normalize(value);if(!n)return null;if(/doctorat|phd/.test(n))return 6;if(/master|mba|ingenieur|engineering/.test(n))return 5;if(/maitrise/.test(n))return 4;if(/licence|bachelor/.test(n))return 3;if(/bts|dut|deug|bac\s*\+\s*2/.test(n))return 2;if(/bac|baccalaureat|high school/.test(n))return 0;return null;}
function languageReq(text:string){
  const n=normalize(text);
  const out:string[]=[];
  const explicitEnglish=/(anglais|english).{0,45}(requis|requis[e]?|exige|exigee|obligatoire|required|must|mandatory|courant|fluent|bilingue|professionnel|professional|maitrise|proficiency|niveau)/.test(n)
    || /(requis|exige|obligatoire|required|must|mandatory|courant|fluent|bilingue|professionnel|professional|maitrise|proficiency|niveau).{0,45}(anglais|english)/.test(n);
  const explicitFrench=/(francais|french).{0,45}(requis|requis[e]?|exige|exigee|obligatoire|required|must|mandatory|courant|fluent|bilingue|professionnel|professional|maitrise|proficiency|niveau)/.test(n)
    || /(requis|exige|obligatoire|required|must|mandatory|courant|fluent|bilingue|professionnel|professional|maitrise|proficiency|niveau).{0,45}(francais|french)/.test(n);
  const bilingual=/(bilingue|bilingual).{0,60}(francais|french).{0,60}(anglais|english)/.test(n)
    || /(bilingue|bilingual).{0,60}(anglais|english).{0,60}(francais|french)/.test(n);
  if(explicitEnglish || bilingual) out.push("anglais");
  if(explicitFrench || bilingual) out.push("francais");
  return Array.from(new Set(out));
}
const COMMON_SKILLS=["excel","power bi","tableau","sql","python","java","javascript","typescript","react","next.js","node.js","php","laravel","sap","salesforce","hubspot","crm","erp","kobo collect","powerpoint","word","google analytics","marketing digital","communication","negociation","gestion de projet","project management","analyse de donnees","data analysis","business development","vente","sales","prospection","relation client","customer service","recrutement","rh","ressources humaines","comptabilite","finance","audit","gestion de portefeuille","lead generation","social media","seo","sem","canva"];
function extractRequiredSkills(text:string,tags:string[],candidateSkills:string[]){
  const n=normalize(text);
  const tagged=tags.map(normalize).filter(x=>x.length>2);
  const explicit=/(competences? requises?|competences? cles|profil recherche|requis|exige|obligatoire|required|must|mandatory|maitrise|proficiency)/.test(n);
  const lexicon=explicit?COMMON_SKILLS.filter(skill=>n.includes(normalize(skill))):[];
  const mentionedCandidate=explicit?candidateSkills.map(normalize).filter(skill=>skill.length>2&&n.includes(skill)):[];
  return Array.from(new Set([...tagged,...lexicon,...mentionedCandidate])).filter(Boolean);
}
function languageScore(text:string,lang:string){const n=normalize(text);if(lang==="anglais"&&!/anglais|english/.test(n))return null;if(lang==="francais"&&!/francais|french/.test(n))return null;return /bilingue|fluent|courant|advanced|professionnel|professional|maitrise/.test(n)?1:.7;}
function adaptiveMatch(profile:Profile,years:number|null,experiences:Experience[],skills:Skill[],education:Education[],job:MatchableJob){
  const offer=[job.title,job.description,job.location,job.contractType,job.remoteMode,job.sector,job.language,...(job.tags||[])].filter(Boolean).join(" ");
  const offerN=normalize(offer);
  const candidate=[profile.headline,profile.summary,profile.location,...(profile.targetRoles||[]),...(profile.preferredSectors||[]),...experiences.map(x=>(x.title||"")+" "+(x.description||"")),...skills.map(x=>(x.name||"")+" "+(x.level||"")),...education.map(x=>(x.degree||"")+" "+(x.field||""))].filter(Boolean).join(" ");
  const candidateN=normalize(candidate);

  const stop=new Set(["assistant","assistante","responsable","manager","senior","junior","de","du","des","la","le","les","un","une","et","en","au","aux","pour","avec","dans","sur","of","the","and","with","for"]);
  const tokens=(value:string)=>normalize(value).split(/[^a-z0-9+#.]+/).filter(x=>x.length>2&&!stop.has(x));
  const similarity=(a:string,b:string)=>{
    const A=new Set(tokens(a)),B=new Set(tokens(b));
    if(!A.size||!B.size)return 0;
    let hit=0; for(const x of A) if(Array.from(B).some(y=>x===y||x.includes(y)||y.includes(x))) hit++;
    return hit/Math.max(A.size,B.size);
  };

  const roles=[...(profile.targetRoles||[]),profile.headline||"",...experiences.map(x=>x.title||"")].filter(Boolean);
  const roleScore=roles.length?Math.max(...roles.map(r=>similarity(r,job.title))):null;
  const criteria:MatchCriterion[]=[{
    id:"role",label:"Métier / fonction",score:roleScore==null?null:Math.min(1,roleScore*1.35),weight:20,required:true,
    status:roleScore==null?"UNKNOWN":roleScore>=.72?"MATCH":roleScore>=.35?"PARTIAL":"MISMATCH",
    candidateValue:roles.slice(0,3).join(", ")||null,expectedValue:job.title
  }];

  const candidateSkillNames=skills.map(x=>normalize(x.name)).filter(Boolean);
  const requiredSkills=extractRequiredSkills(offer,job.tags||[],candidateSkillNames);
  if(requiredSkills.length){
    const hit=requiredSkills.filter(req=>candidateSkillNames.some(skill=>skill===req||skill.includes(req)||req.includes(skill))).length;
    const score=hit/requiredSkills.length;
    const required=requiredSkills.length>0;
    criteria.push({
      id:"skills",label:"Compétences",score,weight:30,required,
      status:score>=.85?"MATCH":score>0?"PARTIAL":"MISMATCH",
      candidateValue:skills.map(x=>x.name).filter(Boolean).slice(0,8).join(", ")||null,
      expectedValue:requiredSkills.slice(0,10).join(", ")
    });
  }

  const exp=detectExp(offer,job.minExperienceYears);
  if(exp!=null) {
    const score=years==null?null:years>=exp?1:Math.max(0,years/Math.max(exp,1));
    criteria.push({
      id:"experience",label:"Expérience",score,weight:20,required:true,
      status:score==null?"UNKNOWN":years==null?"UNKNOWN":years>=exp?"MATCH":years>0?"PARTIAL":"MISMATCH",
      candidateValue:years==null?"Non renseigné":String(years)+" ans",
      expectedValue:String(exp)+" ans min."
    });
  }

  const ed=detectEdu(offer);
  if(ed!=null){
    const levels=education.map(x=>eduLevel(x.degree)).filter((x):x is Exclude<ReturnType<typeof eduLevel>,null>=>x!=null);
    const best=levels.length?Math.max(...levels):null;
    const score=best==null?null:best>=ed?1:best/Math.max(ed,1);
    criteria.push({
      id:"education",label:"Niveau d'études",score,weight:12,required:true,
      status:score==null?"UNKNOWN":score>=1?"MATCH":score>0?"PARTIAL":"MISMATCH",
      candidateValue:education.map(x=>x.degree||"").filter(Boolean).slice(0,3).join(", ")||null,
      expectedValue:ed>=5?"Bac+5 / Master":ed===4?"Bac+4":ed===3?"Bac+3 / Licence":ed===2?"Bac+2":"Baccalauréat"
    });
  }

  const languageRequirements=languageReq(offer);
  for(const lang of languageRequirements){
    const levelRequired=/(bilingue|fluent|courant|advanced|professionnel|professional|maitrise|proficiency|niveau [a-z0-9+ -]+)/.test(offerN);
    const candidateHasLanguage=new RegExp(lang==="anglais"?"anglais|english":"francais|french").test(candidateN);
    const candidateAdvanced=/(bilingue|fluent|courant|advanced|professionnel|professional|maitrise|proficiency)/.test(candidateN);
    const score=candidateHasLanguage?(levelRequired?(candidateAdvanced?1:.7):1):null;
    criteria.push({
      id:"language-"+lang,label:"Langue — "+lang,score,weight:10/Math.max(languageRequirements.length,1),
      required:levelRequired,status:score==null?"UNKNOWN":score>=.95?"MATCH":"PARTIAL",
      candidateValue:score==null?"Non renseigné":candidateAdvanced?"Niveau avancé/courant détecté":"Langue détectée, niveau à confirmer",
      expectedValue:levelRequired?"Exigence linguistique explicite de l'offre":"Langue mentionnée dans l'offre"
    });
  }

  const loc=normalize(job.location);
  const locs=[...(profile.targetCities||[]),profile.location||""].map(normalize).filter(Boolean);
  if(loc) criteria.push({
    id:"location",label:"Localisation",score:locs.length?(locs.some(x=>loc.includes(x)||x.includes(loc))?1:0):null,weight:5,required:false,
    status:locs.length?(locs.some(x=>loc.includes(x)||x.includes(loc))?"MATCH":"MISMATCH"):"UNKNOWN",
    candidateValue:locs[0]||null,expectedValue:job.location
  });

  const sec=normalize(job.sector);
  const secs=(profile.preferredSectors||[]).map(normalize).filter(Boolean);
  if(sec) criteria.push({
    id:"sector",label:"Secteur",score:secs.length?(secs.some(x=>sec.includes(x)||x.includes(sec))?1:0):null,weight:2,required:false,
    status:secs.length?(secs.some(x=>sec.includes(x)||x.includes(sec))?"MATCH":"MISMATCH"):"UNKNOWN",
    candidateValue:secs.join(", ")||null,expectedValue:job.sector
  });

  const contract=normalize(job.contractType);
  const contracts=(profile.contractPreferences||[]).map(normalize).filter(Boolean);
  if(contract) criteria.push({
    id:"contract",label:"Type de contrat",score:contracts.length?(contracts.includes(contract)?1:0):null,weight:1,required:false,
    status:contracts.length?(contracts.includes(contract)?"MATCH":"MISMATCH"):"UNKNOWN",
    candidateValue:contracts.join(", ")||null,expectedValue:job.contractType
  });

  const remote=normalize(job.remoteMode),remotePref=normalize(profile.remotePreference);
  if(remote&&remote!=="no") criteria.push({
    id:"remote",label:"Télétravail",score:remotePref?(remotePref==="indifferent"||remotePref===remote?1:(remotePref==="yes"&&remote==="partial"?.5:0)):null,weight:1,required:false,
    status:remotePref?(remotePref==="indifferent"||remotePref===remote||(remotePref==="yes"&&remote==="partial")?"MATCH":"MISMATCH"):"UNKNOWN",
    candidateValue:profile.remotePreference||null,expectedValue:job.remoteMode
  });

  const known=criteria.filter(x=>x.score!=null);
  const totalWeight=known.reduce((sum,x)=>sum+x.weight,0);
  const matchPercent=totalWeight?Math.round(known.reduce((sum,x)=>sum+(x.score||0)*x.weight,0)/totalWeight*100):0;
  const required=criteria.filter(x=>x.required);
  const knownRequired=required.filter(x=>x.score!=null);
  const confidence=Math.round((knownRequired.length/Math.max(required.length,1))*100);
  return {matchPercent,confidence,breakdown:criteria};
}

export async function GET(request:NextRequest){
 try{
  const authUser=await getAuthUser(request);if(!authUser)return NextResponse.json({message:"Session requise."},{status:401});
  const supabase=adminClient();const user=await ensureUser(supabase,authUser);const {searchParams}=new URL(request.url);
  const filterContract=searchParams.get("contractType"),filterCity=searchParams.get("city"),filterRemote=searchParams.get("remote"),search=searchParams.get("q");
  const scope=searchParams.get("scope")==="africa" ? "africa" : "local";
  const requestedSize=Number(searchParams.get("limit")||DEFAULT_FEED_SIZE);const limit=Math.min(Math.max(Number.isFinite(requestedSize)?requestedSize:DEFAULT_FEED_SIZE,1),MAX_FEED_SIZE);
  const page=Math.max(Number(searchParams.get("page")||1)||1,1);
  const [profileRes,experiencesRes,skillsRes,educationRes,jobsRes,recruiterJobsRes,userRes]=await Promise.all([
   supabase.from("Profile").select("targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors,location,headline,summary").eq("userId",user.id).maybeSingle(),
   supabase.from("Experience").select("startDate,title,description").eq("userId",user.id),
   supabase.from("Skill").select("name,level").eq("userId",user.id),
   supabase.from("Education").select("degree,field").eq("userId",user.id),
   supabase.from("Job").select("*").eq("isActive",true).order("createdAt",{ascending:false}).limit(600),
   supabase.from("RecruiterJob").select("*").eq("status","published").eq("applicationReady",true).gte("createdAt", new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString()).order("createdAt",{ascending:false}),
   supabase.from("User").select("country").eq("id",user.id).maybeSingle()
  ]);
  if(profileRes.error)throw new Error(profileRes.error.message);if(userRes.error)throw new Error(userRes.error.message);if(experiencesRes.error)throw new Error(experiencesRes.error.message);if(skillsRes.error)throw new Error(skillsRes.error.message);if(educationRes.error)throw new Error(educationRes.error.message);if(jobsRes.error)throw new Error(jobsRes.error.message);if(recruiterJobsRes.error)throw new Error(recruiterJobsRes.error.message);
  const profile:Profile=profileRes.data||{targetRoles:[],targetCities:[],contractPreferences:[],remotePreference:"INDIFFERENT",preferredSectors:[]};
  const countryAliases:Record<string,string>={CAMEROUN:"CM",CAMEROON:"CM",SENEGAL:"SN",SENEGAL:"SN",GABON:"GA",CONGO:"CG", "REPUBLIQUE DU CONGO":"CG","CENTRAFRIQUE":"CF","REPUBLIQUE CENTRAFRICAINE":"CF","TCHAD":"TD","GUINEE EQUATORIALE":"GQ","COTE D IVOIRE":"CI","COTE D'IVOIRE":"CI","BENIN":"BJ","BURKINA FASO":"BF","GUINEE":"GN","MALI":"ML","NIGER":"NE","TOGO":"TG","NIGERIA":"NG","GHANA":"GH","RWANDA":"RW","AFRIQUE DU SUD":"ZA","SOUTH AFRICA":"ZA","ZAMBIE":"ZM","ZAMBIA":"ZM","OUGANDA":"UG","UGANDA":"UG","LIBERIA":"LR","SOUDAN DU SUD":"SS","SOUTH SUDAN":"SS","ESWATINI":"SZ"};
  const normalizeCountryCode=(value:unknown)=>{const raw=String(value||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");if(/^[A-Z]{2}$/.test(raw))return raw;return countryAliases[raw]||"CM";};
  const userCountryCode=normalizeCountryCode((userRes.data as any)?.country);
  const countryNames:Record<string,string>={CM:"Cameroun",SN:"Sénégal",GA:"Gabon",CG:"Congo",CF:"République centrafricaine",TD:"Tchad",GQ:"Guinée équatoriale",BJ:"Bénin",BF:"Burkina Faso",CI:"Côte d’Ivoire",GN:"Guinée",GW:"Guinée-Bissau",ML:"Mali",NE:"Niger",TG:"Togo",NG:"Nigeria",GH:"Ghana",RW:"Rwanda",ZA:"Afrique du Sud",ZM:"Zambie",UG:"Ouganda",LR:"Liberia",SS:"Soudan du Sud",SZ:"Eswatini"};
  const activeCountryCode=scope==="africa"?null:userCountryCode;const experiences=(experiencesRes.data as Experience[])||[];const skills=(skillsRes.data as Skill[])||[];const education=(educationRes.data as Education[])||[];const yearsExperience=computeYearsExperience(experiences);
  type Unified={normalizedContent?:NormalizedContent|null;source:"discovery"|"recruiter";sourceId:string;countryCode:string|null;title:string;description:string;location:string|null;contractType:string|null;remoteMode:string|null;minExperienceYears:number|null;companyName:string|null;companyId:string|null;createdAt:string;publishedAt:string|null;deadline:string|null;sourceUrl:string|null;sourcePlatform:string|null;applicationReady:boolean;applicationProfile:Record<string,unknown>;visualUrl:string|null;visualSource:string|null;applicationCheckedAt:string|null;sector:string|null;tags:string[];language?:string|null};
  const discovery=((jobsRes.data as Job[])||[]);
  const recruiter=((recruiterJobsRes.data as RecruiterJobRow[])||[]);
  let unified:Unified[]=[...discovery.filter(j=>j.opportunityType==="EMPLOI" || !j.opportunityType).map(j=>({source:"discovery" as const,sourceId:j.id,countryCode:(j as any).countryCode||null,normalizedContent:j.normalizedContent||null,title:j.title,description:j.description,location:j.location,contractType:j.contractType,remoteMode:j.remoteMode,minExperienceYears:j.minExperienceYears,companyName:null,companyId:j.companyId,createdAt:j.createdAt,publishedAt:j.sourcePublishedAt,deadline:j.deadline,sourceUrl:j.sourceUrl,sourcePlatform:j.source||null,applicationReady:j.applicationReady,applicationProfile:j.applicationProfile,visualUrl:j.visualUrl,visualSource:j.visualSource,applicationCheckedAt:j.applicationCheckedAt,sector:j.aiSector||null,tags:[...(Array.isArray(j.aiSkills)?(j.aiSkills as unknown[]).filter((x):x is string=>typeof x==="string"):[]),...(Array.isArray((j as any).tags)?((j as any).tags as unknown[]).filter((x):x is string=>typeof x==="string"):[])],language:j.language||null})),...recruiter.map(j=>({source:"recruiter" as const,sourceId:j.id,countryCode:(j as any).countryCode||null,normalizedContent:null,title:j.title,description:j.description,location:j.location,contractType:j.contract,remoteMode:j.remoteMode,minExperienceYears:j.minExperienceYears,companyName:j.companyName,companyId:null,createdAt:j.createdAt,publishedAt:j.createdAt,deadline:null,sourceUrl:j.sourceUrl,sourcePlatform:j.sourcePlatform||"JOBLY",applicationReady:j.applicationReady,applicationProfile:j.applicationProfile,visualUrl:j.visualUrl,visualSource:j.visualSource,applicationCheckedAt:j.applicationCheckedAt,sector:j.sector||null,tags:j.tags||[],language:null}))];
   unified=unified.filter(j=>!activeCountryCode || j.countryCode===activeCountryCode);
  unified=unified.map(job=>{const description=cleanJobDescription(job.description,job.title);const title=cleanJobTitle(job.title);const companyName=cleanCompanyName(job.companyName)||extractCompanyNameFromDescription(description);return {...job,title,description,companyName};});
  if(filterContract)unified=unified.filter(j=>normalize(j.contractType)===normalize(filterContract));if(filterCity)unified=unified.filter(j=>normalize(j.location).includes(normalize(filterCity)));if(filterRemote)unified=unified.filter(j=>normalize(j.remoteMode)===normalize(filterRemote));if(search){const n=normalize(search);unified=unified.filter(j=>normalize(j.title).includes(n)||normalize(j.companyName).includes(n));}
  // Discovery visibility is limited to offers with a verifiable direct application contact.
  // A generic website/contact email is not enough: the extractor requires application context.
  unified=unified.map(job=>{
    const contact=resolveApplicationContact(job.applicationProfile,job.description);
    return {
      ...job,
      applicationReady:Boolean(contact.email||contact.phone||job.applicationProfile?.applicationUrl||job.applicationProfile?.applyUrl||job.applicationProfile?.url),
      applicationProfile:{
        ...job.applicationProfile,
        ...(contact.email?{applicationEmail:contact.email}:{}),
        ...(contact.phone?{applicationPhone:contact.phone}:{}),
        ...(job.sourceUrl ? { sourceUrl: job.sourceUrl } : {}),
      },
    };
  });
  const companyIds=Array.from(new Set(unified.map(j=>j.companyId).filter(Boolean))) as string[];const companiesRes=companyIds.length?await supabase.from("Company").select("id,name,logoUrl,description,website,verified").in("id",companyIds):{data:[] as Company[],error:null};if(companiesRes.error)throw new Error(companiesRes.error.message);const companiesById=new Map((companiesRes.data as Company[]).map(c=>[c.id,c]));
  const ranked=unified.map(job=>{const {matchPercent,confidence,breakdown}=adaptiveMatch(profile,yearsExperience,experiences,skills,education,job);const company=job.companyId?companiesById.get(job.companyId):undefined;const publishedAt=job.publishedAt||job.createdAt;const expirationAt=platformExpiration(job.createdAt);return{source:job.source,id:job.sourceId,countryCode:job.countryCode,normalizedContent:job.normalizedContent||null,title:job.title,description:job.description,location:job.location,contractType:job.contractType,remoteMode:job.remoteMode,minExperienceYears:job.minExperienceYears,createdAt:job.createdAt,publishedAt,expirationAt:expirationAt?expirationAt.toISOString():null,deadline:job.deadline,sourceUrl:job.sourceUrl,sourcePlatform:job.sourcePlatform,applicationReady:Boolean(job.applicationReady),applicationProfile:job.applicationProfile,applicationCheckedAt:job.applicationCheckedAt,visualUrl:company?.logoUrl||null,visualSource:company?.logoUrl?"COMPANY_LOGO":null,company:(company&&!isGenericCompanyName(company.name))?{id:company.id,name:company.name,logoUrl:company.logoUrl,description:company.description,website:company.website,domain:companyDomain(company.website),verified:company.verified}:(!company&&job.companyName&&!isGenericCompanyName(job.companyName))?{id:null,name:job.companyName,logoUrl:null,description:null,website:null,domain:null,verified:false}:null,matchPercent,matchConfidence:confidence,matchBreakdown:breakdown,feedScore:matchPercent};}).sort((a,b)=>b.feedScore-a.feedScore||new Date(b.publishedAt).getTime()-new Date(a.publishedAt).getTime());
  // Enforce lifecycle at read time as a safety net: no discovery offer remains
  // visible beyond two months from its Jobly publication date (createdAt).
  const staleIds = ranked.filter(job => {
    const expiresAt = platformExpiration(job.createdAt);
    return expiresAt ? expiresAt.getTime() <= Date.now() : false;
  }).map(job => job.id).filter(Boolean);
  if (staleIds.length) {
    await supabase.from("Job").update({ isActive:false, updatedAt:new Date().toISOString() }).in("id", staleIds);
  }
  const visibleRanked = ranked.filter(job => !staleIds.includes(job.id));
  const totalAvailable=visibleRanked.length;const start=(page-1)*limit;const results=visibleRanked.slice(start,start+limit).map(job=>({...job,deadlineExpired:deadlineExpired(job.deadline),offerStatus:deadlineExpired(job.deadline)?"EXPIRED":"ACTIVE"}));const matchingCount=visibleRanked.reduce((count,job)=>count+(job.matchPercent>=50?1:0),0);
  return NextResponse.json({totalAvailable,matchingCount,count:results.length,page,limit,hasMore:start+limit<totalAvailable,yearsExperience,jobs:results,market:{scope,countryCode:activeCountryCode,countryName:activeCountryCode?(countryNames[activeCountryCode]||"Pays sélectionné"):null,userCountryCode},matchingPolicy:{matchingThreshold:50,ordering:"match_then_publication",externalRequiresApplicationReady:true}});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Impossible de charger les offres."},{status:500});}
}
