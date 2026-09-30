#!/usr/bin/env node
import fs from "node:fs";

const SECTION_ALIASES = {
  education: ["education","formation","diplomes","diplome","etudes"],
  experience: ["experience","experiences","parcours"],
  skills: ["skills","competences","competence"],
  responsibilities: ["responsibilities","responsabilites","missions","mission"],
  requirements: ["requirements","profil","qualifications","prerequis","exigences"],
  benefits: ["benefits","avantages","conditions"],
  application: ["application","candidature","postuler","contact"],
  deadline: ["deadline","date_limite","datelimite","cloture"],
  description: ["description","summary","resume","presentation"]
};

const VOCAB = {
  education: new Set(["education","formation","diplome","licence","master","doctorat","universite","ecole","specialite","certification"]),
  experience: new Set(["experience","annee","poste","responsabilite","mission","parcours","professionnel"]),
  skills: new Set(["competence","maitrise","logiciel","outil","langue","excel","powerbi","sql","communication"]),
  responsibilities: new Set(["mission","responsabilite","superviser","gerer","coordonner","assurer","piloter","developper","suivre"]),
  requirements: new Set(["profil","recherche","candidat","exigence","prerequis","qualification","minimum","requis"]),
  benefits: new Set(["avantage","salaire","remuneration","assurance","conge","transport","prime"]),
  application: new Set(["candidature","postuler","email","telephone","cv","lettre","dossier","contact"]),
  deadline: new Set(["date","limite","cloture","avant","deadline","soumission"]),
  description: new Set(["entreprise","activite","secteur","contexte","objectif","poste"])
};

const GENERIC = new Set([
  "de","du","des","la","le","les","un","une","et","en","au","aux","a","à","pour","dans","sur",
  "avec","par","est","sont","être","the","and","of","to","for","with","or","ou","d","l",
  "poste","offre","candidat","profil","emploi","travail","job"
]);

const INCOMPATIBLE = new Set([
  "deadline|education",
  "deadline|experience",
  "deadline|skills",
  "deadline|benefits",
  "application|education",
  "application|benefits",
  "application|responsibilities"
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ").trim();
}

function tokens(value) {
  return normalize(value).replace(/[^a-z0-9+.#%/-]+/g, " ")
    .split(/\s+/).filter(Boolean).filter(t => !GENERIC.has(t));
}

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size && !B.size) return 1;
  let intersection = 0;
  for (const x of A) if (B.has(x)) intersection++;
  return intersection / (A.size + B.size - intersection || 1);
}

function canonicalSection(key) {
  const n = normalize(key).replace(/[^a-z0-9_]/g, "_");
  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(n) || aliases.includes(normalize(key))) return section;
  }
  return n || "unknown";
}

function flattenUnits(node, section, path = []) {
  const out = [];
  if (node == null) return out;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    const text = String(node).trim();
    if (text.length >= 8) out.push({section,path:path.join("."),text,normalized:normalize(text),tokens:tokens(text)});
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v,i) => out.push(...flattenUnits(v,section,[...path,String(i)])));
    return out;
  }
  for (const [k,v] of Object.entries(node)) {
    const childSection = path.length === 0 ? canonicalSection(k) : section;
    out.push(...flattenUnits(v,childSection,[...path,k]));
  }
  return out;
}

function sectionPair(a,b) { return [a,b].sort().join("|"); }

function compatibility(a,b) {
  if (a === b) return "COMPATIBLE";
  if (INCOMPATIBLE.has(sectionPair(a,b))) return "INCOMPATIBLE";
  const grouped = ["education","skills","experience","requirements"];
  if (grouped.includes(a) && grouped.includes(b)) return "COMPATIBLE";
  return "SUSPICIOUS";
}

function vocabScore(unit,section) {
  const lex = VOCAB[section] ?? new Set();
  if (!unit.tokens.length || !lex.size) return 0;
  let hits = 0;
  for (const t of unit.tokens) if (lex.has(t)) hits++;
  return hits / Math.min(unit.tokens.length,8);
}

function sourceKey(job) { return job.sourceKey ?? job.source ?? "UNKNOWN"; }
function content(job) { return job.normalizedContent ?? job.canonicalContent ?? {}; }

function offerFingerprint(job) {
  const sections = flattenUnits(content(job));
  return {
    title: normalize(job.title),
    location: normalize(job.location),
    tokens: sections.flatMap(u => u.tokens)
  };
}

function analyzeIntraOffer(job) {
  const units = flattenUnits(content(job));
  const findings = [];
  for (let i=0;i<units.length;i++) {
    for (let j=i+1;j<units.length;j++) {
      const a=units[i], b=units[j];
      if (a.normalized !== b.normalized || a.normalized.length < 24) continue;
      const compat=compatibility(a.section,b.section);
      const v=Math.max(vocabScore(a,a.section),vocabScore(b,b.section));
      if (compat==="INCOMPATIBLE") {
        findings.push({
          class:"CROSS_SECTION_LEAK", decision:"DUPLICATION", confidence:"HIGH",
          sections:[a.section,b.section],
          evidence:[{type:"exact_unit_match",text:a.text},{type:"section_incompatibility",compatibility:compat}],
          counterEvidence:v>0.35?[{type:"section_vocabulary_support",score:v}]:[]
        });
      } else if (compat==="SUSPICIOUS") {
        findings.push({
          class:"CROSS_SECTION_REUSE", decision:"REVIEW", confidence:"MEDIUM",
          sections:[a.section,b.section],
          evidence:[{type:"exact_unit_match",text:a.text},{type:"section_relation",compatibility:compat}]
        });
      }
    }
  }
  return findings;
}

function analyzeCrossOffer(jobs) {
  const findings=[], fps=jobs.map(offerFingerprint);
  for (let i=0;i<jobs.length;i++) for (let j=i+1;j<jobs.length;j++) {
    const A=fps[i],B=fps[j], overlap=jaccard(A.tokens,B.tokens);
    if (overlap<0.72) continue;
    const sameSource=sourceKey(jobs[i])===sourceKey(jobs[j]);
    const titleSame=A.title.length>0 && A.title===B.title;
    const locationSame=A.location.length>0 && A.location===B.location;
    if (sameSource && !titleSame && !locationSame && overlap<0.86) {
      findings.push({
        pair:[jobs[i].id,jobs[j].id], class:"TEMPLATE_REUSE", decision:"NO_DUPLICATION", confidence:"MEDIUM",
        evidence:[{type:"semantic_overlap",score:overlap},{type:"same_source",sourceKey:sourceKey(jobs[i])}],
        counterEvidence:[{type:"discriminant_fields_differ",titleSame,locationSame}]
      });
      continue;
    }
    if (overlap>=0.90 || (titleSame && locationSame && overlap>=0.80)) {
      findings.push({
        pair:[jobs[i].id,jobs[j].id], class:"DUPLICATE_OFFER", decision:"DUPLICATION",
        confidence:overlap>=0.95?"HIGH":"MEDIUM",
        evidence:[{type:"semantic_overlap",score:overlap},{type:"title_same",value:titleSame},{type:"location_same",value:locationSame}],
        counterEvidence:[]
      });
    } else {
      findings.push({
        pair:[jobs[i].id,jobs[j].id], class:"REVIEW", decision:"REVIEW", confidence:"LOW",
        evidence:[{type:"semantic_overlap",score:overlap}], counterEvidence:[]
      });
    }
  }
  return findings;
}

function analyze(jobs) {
  const clean=jobs.filter(Boolean);
  const perOffer=clean.map(job=>({offerId:job.id,sourceKey:sourceKey(job),findings:analyzeIntraOffer(job)}));
  const all=[
    ...perOffer.flatMap(x=>x.findings.map(f=>({...f,offerId:x.offerId,sourceKey:x.sourceKey}))),
    ...analyzeCrossOffer(clean)
  ];
  const classes=[...new Set(all.map(f=>f.class))];
  return {
    version:"duplication-v3",
    summary:{
      offersAnalyzed:clean.length,
      findings:all.length,
      duplication:all.filter(f=>f.decision==="DUPLICATION").length,
      noDuplication:all.filter(f=>f.decision==="NO_DUPLICATION").length,
      review:all.filter(f=>f.decision==="REVIEW").length,
      byClass:Object.fromEntries(classes.map(k=>[k,all.filter(f=>f.class===k).length]))
    },
    findings:all
  };
}

const inputPath=process.argv[2], outputPath=process.argv[3] ?? "duplication-v3-report.json";
if(!inputPath){console.error("Usage: node scripts/duplication-v3.mjs input.json [output.json]");process.exit(2);}
const raw=JSON.parse(fs.readFileSync(inputPath,"utf8"));
const jobs=Array.isArray(raw)?raw:raw.jobs;
if(!Array.isArray(jobs)) throw new Error("Input must be an array or { jobs: [...] }");
const report=analyze(jobs);
fs.writeFileSync(outputPath,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
