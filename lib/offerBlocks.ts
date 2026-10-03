import { cleanDisplayText, cleanJobDescription } from "./jobContent";

export const CANONICAL_BLOCK_ORDER = [
  "title","company","location","contract","salary","remote","deadline",
  "description","missions","profile","experience","education","skills","qualities","benefits","application",
] as const;

export type CanonicalBlockKey = typeof CANONICAL_BLOCK_ORDER[number];

export type CanonicalOffer = {
  version: "jobly-offer-canonical-v1";
  title: string | null;
  company: string | null;
  location: string[];
  contract: string | null;
  salary: { min: number | null; max: number | null; currency: string | null };
  remote: "YES" | "NO" | "PARTIAL" | null;
  deadline: string | null;
  description: string[];
  missions: string[];
  profile: string[];
  experience: string[];
  education: string[];
  skills: string[];
  qualities: string[];
  benefits: string[];
  application: string[];
  sourceUrl: string | null;
  qualityScore: number;
  displayMode: "FULL" | "MINIMAL";
  qualityFlags: string[];
};

const CONTRACT_MAP: Record<string,string> = {
  CDI:"CDI","PERMANENT":"CDI","PERMANENT_CONTRACT":"CDI",
  CDD:"CDD","FIXED_TERM":"CDD","FIXED_TERM_CONTRACT":"CDD",
  STAGE:"Stage","INTERNSHIP":"Stage","INTERNSHIP_CONTRACT":"Stage",
  FREELANCE:"Freelance","FREELANCER":"Freelance",
  INTERIM:"Intérim","TEMPORARY":"Temporaire","TEMP":"Temporaire",
  ALTERNANCE:"Alternance","APPRENTICESHIP":"Apprentissage","APPRENTISSAGE":"Apprentissage",
  FULL_TIME:"Temps plein","FULLTIME":"Temps plein","TEMPS_PLEIN":"Temps plein","TEMPS PLEIN":"Temps plein",
  PART_TIME:"Temps partiel","PARTTIME":"Temps partiel","TEMPS_PARTIEL":"Temps partiel",
  CONSULTANT:"Consultant",
};
const CURRENCY = new Set([
  "XAF","XOF","EUR","USD","GBP","CAD","CHF","ZAR","KES","GHS","NGN","RWF","TZS","UGX","BIF","CDF",
  "DZD","MAD","EGP","ETB","ZMW","MWK","MZN","NAD","BWP","SZL","SCR","MUR","SOS","SLL","LRD","GMD",
  "GNF","CVE","AOA","MGA","SSP",
]);

const COMMON_HEADINGS: Record<string, string[]> = {
  description:["description","description de l'offre","présentation du poste","présentation","contexte","about the role","about the job","job description","overview","le poste"],
  missions:["mission","missions","missions principales","missions principales du poste","responsabilités","responsabilités principales","responsabilites du poste","duties","duties and responsibilities","key responsibilities","main responsibilities","what you will do","activités","tâches"],
  profile:["profil","profil recherché","profil et critères requis","profil du candidat","exigences","requirements","qualifications","candidate profile","what we are looking for","who you are","que recherchons-nous","candidate profile"],
  experience:["expérience","expérience professionnelle","work experience","professional experience","experience required","years of experience"],
  education:["formation","formations","éducation","education","diplôme","diplômes","academic background","niveau d'études","niveau etudes"],
  skills:["compétences","compétences clés","compétences techniques","skills","technical skills","key competencies","hard skills","aptitudes techniques"],
  qualities:["qualités","qualités personnelles","savoir-être","soft skills","personal qualities","behavioral competencies"],
  benefits:["avantages","conditions de travail","ce que nous offrons","benefits","what we offer","compensation and benefits"],
  application:["candidature","dossier de candidature","comment postuler","pour postuler","modalités de candidature","modalités de soumission","application","how to apply","application process","comment postulez"],
};

const SOURCE_HEADINGS: Record<string, Partial<Record<string,string[]>>> = {
  jobincamer:{missions:["responsabilités du poste"],profile:["profil et critères requis"],application:["modalités de candidature"]},
  jobinfocamer:{missions:["missions principales"],profile:["profil et critères requis"],application:["dossier de candidature","modalités de candidature"]},
  infosconcourseducation:{missions:["missions"],profile:["que recherchons-nous","candidate profile"],skills:["compétences clés","key competencies"],application:["comment postulez","comment postuler"]},
  emplois_cameroun:{description:["présentation du poste"],missions:["missions principales"],profile:["profil recherché"],application:["comment postuler","dossier de candidature"]},
  brightermonday_ke:{missions:["key responsibilities","duties and responsibilities"],profile:["qualifications","requirements"],benefits:["benefits"],application:["how to apply"]},
  ajirika_east:{missions:["duties and responsibilities","key responsibilities"],profile:["requirements"],skills:["key competencies","technical competencies"],application:["further information"]},
  jobivoire_ci:{missions:["responsabilités","missions"],profile:["profil recherché","profil et critères requis"],application:["modalités de candidature"]},
  africarrieres:{missions:["responsibilities","key responsibilities"],profile:["requirements","qualifications"],skills:["technical competencies"],benefits:["benefits"],application:["how to apply"]},
  goafricajobs:{missions:["responsibilities","key responsibilities","duties"],profile:["requirements","qualifications"],application:["how to apply"]},
  unjobnet:{missions:["major responsibilities","responsibilities"],profile:["job requirements","requirements"],skills:["demonstrated skills and competencies"],benefits:["benefits"],application:["how to apply"]},
};

function key(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[’']/g,"'").replace(/\s+/g," ").trim();
}
function signature(value: unknown): string {
  return key(value).replace(/[^a-z0-9]+/g," ").trim();
}
function clean(value: unknown): string {
  return cleanDisplayText(String(value ?? ""))
    .replace(/<[^>]+>/g," ")
    .replace(/[\u0000-\u001f\u007f]/g," ")
    .replace(/\s+/g," ").trim();
}
function hasForbiddenMarkup(value: string): boolean {
  return /<\/?[a-z][^>]*>|\b(?:Ã.|Â.|â.)/.test(value);
}
function unique(values: unknown[], sourceText: string, strictSource = true): string[] {
  const seen = new Set<string>(), out: string[] = [];
  const sourceSig = signature(sourceText);
  for (const raw of values) {
    const value = clean(raw);
    const sig = signature(value);
    if (!value || sig.length < 2 || seen.has(sig) || hasForbiddenMarkup(value)) continue;
    if (strictSource && sourceSig && !sourceSig.includes(sig)) continue;
    seen.add(sig); out.push(value);
  }
  return out.slice(0,80);
}
function normalizeContract(value: unknown): string | null {
  const raw = key(value).replace(/[ -]+/g,"_");
  return CONTRACT_MAP[raw.toUpperCase()] ?? null;
}
function normalizeRemote(value: unknown): "YES"|"NO"|"PARTIAL"|null {
  const raw=key(value).replace(/[ -]+/g,"_").toUpperCase();
  return raw==="YES"||raw==="NO"||raw==="PARTIAL" ? raw : null;
}
function normalizeAmount(value: unknown): number|null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const raw=value.replace(/[^0-9,.-]/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".");
  const n=Number(raw); return Number.isFinite(n)&&n>=0?n:null;
}
function normalizeCurrency(value: unknown): string|null {
  const raw=String(value??"").trim().toUpperCase();
  return CURRENCY.has(raw)?raw:null;
}
function normalizeDeadline(value: unknown): string|null {
  const raw=String(value??"").trim();
  if (!raw || /(?:date limite|deadline|jusqu|avant le|postulez maintenant|non précisé|non precise)/i.test(raw)) return null;
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(raw)) {
    if (!/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(raw)) return null;
  }
  const d=new Date(raw.includes("T")||raw.includes(" ")?raw.replace(" ","T"):raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
function parseSalaryText(value: unknown): {min:number|null;max:number|null;currency:string|null} {
  const raw=String(value??"").trim();
  if(!raw)return {min:null,max:null,currency:null};
  const currencyMatch=raw.toUpperCase().match(/\b(XAF|XOF|EUR|USD|GBP|CAD|CHF|ZAR|KES|GHS|NGN|RWF|TZS|UGX|BIF|CDF|DZD|MAD|EGP|ETB|ZMW|MWK|MZN|NAD|BWP|SZL|SCR|MUR|SOS|SLL|LRD|GMD|GNF|CVE|AOA|MGA|SSP)\b/);
  const nums=[...raw.matchAll(/\d[\d .]*(?:,\d+)?/g)].map(m=>normalizeAmount(m[0])).filter((n):n is number=>n!=null);
  return {min:nums[0]??null,max:nums[1]??null,currency:currencyMatch?.[1]??null};
}
function headingMatch(line: string, sourceKey: string): string|null {
  const n=key(line).replace(/[:：-]+$/,"").trim();
  const groups=[...(Object.entries(COMMON_HEADINGS) as [string,string[]][]),...Object.entries(SOURCE_HEADINGS[sourceKey]||{}) as [string,string[]][]];
  for(const [block,heads] of groups) for(const head of heads) {
    const h=key(head);
    if(n===h || n.startsWith(h+" ") || n.endsWith(" "+h)) return block;
  }
  return null;
}
function semanticBlock(line: string): string|null {
  const n=key(line);
  if(/(?:@|\b(?:postuler|candidature|envoyer|envoyez|adressez|transmettez|cv|curriculum|lettre de motivation|how to apply)\b)/i.test(n)) return "application";
  if(/\b(?:\d+(?:[.,]\d+)?\s*(?:ans?|annees?|years?)\s*(?:d'experience|experience)?|experience professionnelle|work experience)\b/i.test(n)) return "experience";
  if(/\b(?:bac\s*\+?\s*\d*|bep|cap|bts|dut|deug|licence|bachelor|master|mba|doctorat|phd|diplome|formation|education)\b/i.test(n)) return "education";
  if(/\b(?:competence|skills?|technical|excel|word|powerpoint|sql|erp|crm|informatique|logiciel)\b/i.test(n)) return "skills";
  if(/\b(?:rigueur|autonomie|autonome|esprit d'equipe|adaptabilite|discretion|organisation|qualites?|soft skills?)\b/i.test(n)) return "qualities";
  if(/\b(?:avantage|assurance|mutuelle|prime|transport|conges|benefits?)\b/i.test(n)) return "benefits";
  return null;
}
function splitTextBlocks(text: string, sourceKey: string): Record<string,string[]> {
  const cleaned=cleanJobDescription(text);
  const out:Record<string,string[]>={description:[],missions:[],profile:[],experience:[],education:[],skills:[],qualities:[],benefits:[],application:[]};
  let current="description";
  for(const raw of cleaned.split(/\n+/)) {
    const line=clean(raw);
    if(!line)continue;
    const h=headingMatch(line,sourceKey);
    if(h){current=h;continue;}
    const semantic=semanticBlock(line);
    if(current==="profile" && semantic) out[semantic].push(line);
    else out[current].push(line);
  }
  return out;
}
function normalizeLocation(value: unknown): string[] {
  if(Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0,10);
  return String(value??"").split(/[,;|]/).map(clean).filter(Boolean).slice(0,10);
}
function canonicalSourceText(input:any): string {
  const n=input.normalizedContent||{};
  return [
    input.description, n.description, n.missions, n.profile, n.experience, n.education,
    n.skills, n.qualities, n.benefits, n.application,
  ].flat().map((v:any)=>String(v??"")).join("\n");
}
function removeTypedEchoes(values:string[], typed: string[]): string[] {
  const typedSigs=typed.filter(Boolean).map(signature);
  return values.filter(v=>{
    const s=signature(v);
    return !typedSigs.some(t=>t && (s===t || (s.length>12 && (s.includes(t)||t.includes(s)))));
  });
}

export function buildCanonicalOffer(input:any): CanonicalOffer {
  const n=input.normalizedContent||{};
  const sourceKey=String(input.sourceKey||input.source||"").toLowerCase();
  const sourceText=canonicalSourceText(input);
  const fallback=splitTextBlocks(input.description||n.description||"",sourceKey);
  const arrays=(k:string)=>Array.isArray(n[k])?n[k]:[];
  const sourceBlocks={
    description: arrays("description").length?arrays("description"):fallback.description,
    missions: arrays("missions").length?arrays("missions"):fallback.missions,
    profile: arrays("profile").length?arrays("profile"):fallback.profile,
    experience: arrays("experience").length?arrays("experience"):fallback.experience,
    education: arrays("education").length?arrays("education"):fallback.education,
    skills: arrays("skills").length?arrays("skills"):fallback.skills,
    qualities: arrays("qualities").length?arrays("qualities"):fallback.qualities,
    benefits: arrays("benefits").length?arrays("benefits"):fallback.benefits,
    application: arrays("application").length?arrays("application"):fallback.application,
  };

  const title=clean(n.title||input.title)||null;
  const company=clean(n.company||input.companyName)||null;
  const location=normalizeLocation(n.location??input.location);
  const contract=normalizeContract(n.contractType??input.contractType);
  const salaryRaw=n.salary||{};
  const parsedSalary=typeof input.salary==="string"?parseSalaryText(input.salary):{min:null,max:null,currency:null};
  const salary={
    min:normalizeAmount(salaryRaw.min??input.salaryMin??parsedSalary.min),
    max:normalizeAmount(salaryRaw.max??input.salaryMax??parsedSalary.max),
    currency:normalizeCurrency(salaryRaw.currency??input.salaryCurrency??parsedSalary.currency),
  };
  if(salary.min==null&&salary.max==null) salary.currency=null;
  const remote=normalizeRemote(n.remoteMode??input.remoteMode);
  const deadline=normalizeDeadline(n.deadline??input.deadline);

  const typed=[title,company,...location,contract,salary.min!=null?String(salary.min):"",salary.max!=null?String(salary.max):"",salary.currency||"",remote||"",deadline||""];
  const blocks:any={};
  for(const k of Object.keys(sourceBlocks)) {
    blocks[k]=unique(sourceBlocks[k],sourceText,true);
  }
  // If a cleaned stored value cannot be matched byte-for-byte after source
  // normalization, do not display it: the contract is source-truth only.
  for(const k of Object.keys(blocks)) blocks[k]=removeTypedEchoes(blocks[k],typed);
  // A fact has exactly one text owner. Prefer the most specific owner.
  const ownerOrder=["application","experience","education","skills","qualities","missions","benefits","profile","description"];
  const seen=new Set<string>();
  for(const k of ownerOrder){
    blocks[k]=blocks[k].filter((v:string)=>{
      const s=signature(v); if(!s||seen.has(s)) return false; seen.add(s); return true;
    });
  }

  const flags:string[]=[];
  if(!title)flags.push("missing_title");
  if(!company)flags.push("missing_company");
  if(!location.length)flags.push("missing_location");
  if(input.contractType && !contract)flags.push("invalid_contract");
  if((input.salaryMin!=null||input.salaryMax!=null||n.salary?.min!=null||n.salary?.max!=null) && (salary.min==null&&salary.max==null || !salary.currency)) flags.push("invalid_salary");
  if((input.deadline||n.deadline) && !deadline)flags.push("invalid_deadline");
  if(remote===null && (input.remoteMode||n.remoteMode))flags.push("invalid_remote");
  if(!input.sourceUrl && !n.source?.url)flags.push("missing_source_url");
  if(Object.values(blocks).flat().some((v:string)=>hasForbiddenMarkup(v)))flags.push("forbidden_markup");
  const totalText=Object.values(blocks).flat().length;
  if(!totalText)flags.push("no_source_text");
  let score=100;
  for(const f of flags) score-=f==="missing_title"?25:f==="missing_company"?20:f==="missing_location"?10:f==="no_source_text"?25:f.startsWith("invalid_")?10:f==="missing_source_url"?10:8;
  if(totalText<2)score-=10;
  score=Math.max(0,score);
  const displayMode=score>=70?"FULL":"MINIMAL";
  return {
    version:"jobly-offer-canonical-v1",title,company,location,contract,salary,remote,deadline,
    description:blocks.description,missions:blocks.missions,profile:blocks.profile,experience:blocks.experience,
    education:blocks.education,skills:blocks.skills,qualities:blocks.qualities,benefits:blocks.benefits,application:blocks.application,
    sourceUrl:clean(input.sourceUrl||n.source?.url)||null,qualityScore:score,displayMode,qualityFlags:flags,
  };
}

export function buildOfferSubtitle(offer: CanonicalOffer): string {
  const parts:string[]=[];
  if(offer.location.length) parts.push(offer.location.join(" · "));
  if(offer.contract) parts.push(offer.contract);
  if(offer.salary.min!=null||offer.salary.max!=null){
    const min=offer.salary.min!=null?new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(offer.salary.min):"";
    const max=offer.salary.max!=null?new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(offer.salary.max):"";
    parts.push((min&&max?min+" – "+max:min||max)+" "+offer.salary.currency);
  }
  const exp=offer.experience.find(v=>/\b(?:\d+(?:[.,]\d+)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*(?:ans?|annees?|years?)\b/i.test(v));
  if(exp) parts.push(exp);
  if(offer.remote==="YES")parts.push("Télétravail");
  else if(offer.remote==="PARTIAL")parts.push("Hybride");
  else if(offer.remote==="NO")parts.push("Présentiel");
  if(offer.deadline)parts.push(new Date(offer.deadline).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}));
  return parts.join(" · ");
}
