#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ALIASES={education:["education","formation","diplome","diplomes","etudes"],experience:["experience","experiences","parcours"],skills:["skills","competences","competence"],responsibilities:["responsibilities","responsabilites","missions","mission","duties"],requirements:["requirements","profil","qualifications","prerequis","exigences"],benefits:["benefits","avantages","conditions"],application:["application","candidature","postuler","contact"],deadline:["deadline","date_limite","cloture"],description:["description","summary","resume","presentation"]};
const GENERIC=new Set("de du des la le les un une et en au aux a pour dans sur avec par est sont etre the and of to for with or ou poste offre candidat profil emploi travail job".split(" "));
const NON_SUBSTANTIVE=new Set(["application","deadline"]);
const BOILERPLATE_MARKERS=["vous devez etre connecte","connectez-vous pour postuler","tous nos services sont gratuits","offres d emploi cvtheque","inscription candidat inscription employeur","tous les programmes","accueil offres d emploi","liens rapides","function initmobiledropdowns","navbar-nav","un instrument de l emploi"];
const norm=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/https?:\/\/\S+/g," URL ").replace(/[^\p{L}\p{N}+.#%/@_-]+/gu," ").replace(/\s+/g," ").trim();
const sectionOf=k=>{const n=norm(k).replace(/[_-]/g," ");for(const[s,as]of Object.entries(ALIASES))if(as.some(a=>norm(a)===n||n.startsWith(norm(a)+" ")))return s;return n.replace(/\s+/g,"_")||"unknown"};
const tokens=v=>norm(v).split(/\s+/).filter(t=>t.length>1&&!GENERIC.has(t));
const jac=(a,b)=>{const A=new Set(a),B=new Set(b);let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(1,A.size+B.size-n)};
const boilerplateScore=text=>{const n=norm(text);return BOILERPLATE_MARKERS.filter(m=>n.includes(norm(m))).length};
function units(node,section="unknown",p="",out=[]){
  if(node==null)return out;
  if(Array.isArray(node)){node.forEach((v,i)=>units(v,section,p+"["+i+"]",out));return out}
  if(typeof node==="object"){for(const[k,v]of Object.entries(node))units(v,p?section:sectionOf(k),p?p+"."+k:k,out);return out}
  const text=String(node).replace(/\s+/g," ").trim(),ts=tokens(text);
  if(text.length>=8&&ts.length>=2)out.push({section,path:p,text,normalized:norm(text),tokens:ts,boilerplate:boilerplateScore(text)});
  return out
}
const source=j=>String(j.sourceKey??j.source??"UNKNOWN");
const disc=j=>({title:norm(j.title),company:norm(j.company?.name??j.companyName??j.company),location:norm(j.location),url:norm(j.sourceUrl??j.url)});
function relation(a,b){
  if(a===b)return"COMPATIBLE";
  const p=[a,b].sort().join("|");
  if(["application|education","application|benefits","application|responsibilities","deadline|education","deadline|experience","deadline|skills","deadline|benefits"].includes(p))return"INCOMPATIBLE";
  if(["education","experience","skills","requirements"].includes(a)&&["education","experience","skills","requirements"].includes(b))return"COMPATIBLE";
  return"SUSPICIOUS"
}
function analyze(input){
  const jobs=input.filter(j=>j&&j.id!=null).map(j=>({...j,__u:units(j.normalizedContent??j.canonicalContent??j.sections??{})})),findings=[];
  for(const j of jobs){
    const seen=new Set();
    for(let i=0;i<j.__u.length;i++)for(let k=i+1;k<j.__u.length;k++){
      const a=j.__u[i],b=j.__u[k];
      if(a.normalized!==b.normalized||a.normalized.length<24)continue;
      const key=a.normalized+"|"+[a.section,b.section].sort().join("|");
      if(seen.has(key))continue; seen.add(key);
      const rel=relation(a.section,b.section);
      findings.push({offerId:j.id,sourceKey:source(j),class:a.section===b.section?"INTRA_SECTION_REPEAT":"CROSS_SECTION_REUSE",decision:"REVIEW",confidence:"LOW",sections:[a.section,b.section],evidence:[{type:"exact_unit_match",text:a.text,pathA:a.path,pathB:b.path},{type:"section_relation",value:rel}],counterEvidence:[{type:"vocabulary_context",value:true}],reason:"Une répétition intra-offre seule ne prouve pas une fuite sémantique."})
    }
  }
  for(let i=0;i<jobs.length;i++)for(let k=i+1;k<jobs.length;k++){
    const a=jobs[i],b=jobs[k],A=disc(a),B=disc(b),same=source(a)!=="UNKNOWN"&&source(a)===source(b),matches=[];
    for(const x of a.__u)for(const y of b.__u){
      const sim=jac(x.tokens,y.tokens);
      if((x.normalized===y.normalized&&x.normalized.length>=24)||(sim>=.78&&Math.min(x.tokens.length,y.tokens.length)>=5))matches.push({x,y,sim,rel:relation(x.section,y.section)})
    }
    if(!matches.length)continue;
    matches.sort((x,y)=>y.sim-x.sim);
    const exact=matches.filter(m=>m.x.normalized===m.y.normalized);
    const titleSame=!!A.title&&A.title===B.title,companySame=!!A.company&&A.company===B.company,locSame=!!A.location&&A.location===B.location,urlSame=!!A.url&&A.url===B.url;
    const discCount=[titleSame,companySame,locSame,urlSame].filter(Boolean).length;
    const sectionMismatch=matches.some(m=>m.rel==="INCOMPATIBLE");
    const substantive=matches.filter(m=>!NON_SUBSTANTIVE.has(m.x.section)&&!NON_SUBSTANTIVE.has(m.y.section));
    const substantiveExact=exact.filter(m=>!NON_SUBSTANTIVE.has(m.x.section)&&!NON_SUBSTANTIVE.has(m.y.section));
    const boilerplateMatches=matches.filter(m=>m.x.boilerplate>=2||m.y.boilerplate>=2);
    let cls="REVIEW",decision="REVIEW",confidence="LOW",reason="Similarité sans preuve suffisante pour conclure.";
    if(boilerplateMatches.length>=2&&substantive.length===0){
      cls="SOURCE_PAGE_BOILERPLATE";decision="NO_DUPLICATION";confidence="HIGH";reason="La convergence porte principalement sur le gabarit HTML/navigation de la source, pas sur le contenu métier."
    }else if(same&&substantive.length===0){
      cls="TEMPLATE_REUSE";decision="NO_DUPLICATION";confidence="HIGH";reason="Les seules convergences concernent des blocs non substantifs (candidature/date) d'une même source."
    }else if(same&&discCount<2&&matches.length>=1){
      cls="TEMPLATE_REUSE";decision="NO_DUPLICATION";confidence="MEDIUM";reason="Blocs répétés d'une même source avec discriminants non convergents : réutilisation de template présumée."
    }else if(substantive.length===0){
      cls="SHARED_BLOCK_OR_VOCABULARY";reason="Les unités partagées sont limitées aux sections non substantives : elles ne suffisent pas à établir une duplication d'offre."
    }else if((substantiveExact.length>=2&&discCount>=2)||(substantiveExact.length>=3&&discCount>=1)||(substantive.length>=3&&substantive.reduce((n,m)=>n+m.sim,0)/substantive.length>=.92&&discCount>=3)){
      if(!sectionMismatch){cls="DUPLICATE_OFFER";decision="DUPLICATION";confidence="HIGH";reason="Plusieurs unités métier convergentes et discriminants concordants."}
      else{cls="CROSS_SECTION_LEAK";reason="Convergence détectée mais section incompatible : arbitrage humain requis."}
    }else if(sectionMismatch){
      cls="CROSS_SECTION_LEAK";confidence="MEDIUM";reason="Contenu commun entre sections incompatibles, à confirmer par preuve de propriété."
    }else if(substantiveExact.length===1){
      cls="SHARED_BLOCK_OR_VOCABULARY";reason="Une seule unité métier partagée peut être générique ou issue d'un modèle."
    }
    findings.push({pair:[a.id,b.id],sourceKeys:[source(a),source(b)],class:cls,decision,confidence,sections:[...new Set(matches.flatMap(m=>[m.x.section,m.y.section]))],evidence:matches.slice(0,10).map(m=>({type:m.x.normalized===m.y.normalized?"exact_unit_match":"semantic_overlap",similarity:+m.sim.toFixed(4),sectionA:m.x.section,sectionB:m.y.section,textA:m.x.text,textB:m.y.text})),counterEvidence:[{type:"discriminants",titleSame,companySame,locationSame:locSame,urlSame,sameSource:same},{type:"matchedUnits",value:matches.length},{type:"exactUnits",value:exact.length},{type:"substantiveUnits",value:substantive.length},{type:"substantiveExactUnits",value:substantiveExact.length},{type:"boilerplateMatches",value:boilerplateMatches.length}],reason})
  }
  const srcs=[...new Set(jobs.map(source))];
  const bySource=Object.fromEntries(srcs.map(s=>{const ids=new Set(jobs.filter(j=>source(j)===s).map(j=>String(j.id))),f=findings.filter(x=>x.sourceKey===s||(x.sourceKeys||[]).includes(s));return[s,{offers:ids.size,findings:f.length,duplication:f.filter(x=>x.decision==="DUPLICATION").length,templates:f.filter(x=>x.class==="TEMPLATE_REUSE").length,review:f.filter(x=>x.decision==="REVIEW").length}]}));
  const decisions=["DUPLICATION","NO_DUPLICATION","REVIEW"];
  return{version:"duplication-v3-contradiction-v2",generatedAt:new Date().toISOString(),summary:{offersAnalyzed:jobs.length,unitsAnalyzed:jobs.reduce((n,j)=>n+j.__u.length,0),findings:findings.length,byDecision:Object.fromEntries(decisions.map(d=>[d,findings.filter(f=>f.decision===d).length])),byClass:Object.fromEntries([...new Set(findings.map(f=>f.class))].map(c=>[c,findings.filter(f=>f.class===c).length])),bySource},findings}
}
function selfTest(){
  const mk=(id,title,company,normalizedContent)=>({id,title,company,location:"Douala",normalizedContent});
  const cases=[
    ["single shared unit remains review",[mk("a","Comptable","A",{skills:["Maîtrise Excel et communication professionnelle"]}),mk("b","Assistant","B",{skills:["Maîtrise Excel et communication professionnelle"]})],"REVIEW"],
    ["repeated same-source blocks classified template",[{...mk("a","Poste A","A",{description:["Responsabilités principales et environnement professionnel de qualité"],application:["Email : info@example.com"]}),sourceKey:"src"},{...mk("b","Poste B","B",{description:["Responsabilités principales et environnement professionnel de qualité"],application:["Email : info@example.com"]}),sourceKey:"src"}],"NO_DUPLICATION"],
    ["application-only shared block is not duplication",[mk("a","Poste A","A",{application:["Email : info@example.com","Téléphone : 699000000"]}),mk("b","Poste B","A",{application:["Email : info@example.com","Téléphone : 699000000"]})],"NO_DUPLICATION"],
    ["matching multiple substantive units and discriminants confirm pair",[mk("a","Comptable senior","Acme",{responsibilities:["Produire les rapports financiers mensuels et superviser la clôture comptable"],requirements:["Licence en comptabilité et cinq années d'expérience professionnelle"]}),mk("b","Comptable senior","Acme",{responsibilities:["Produire les rapports financiers mensuels et superviser la clôture comptable"],requirements:["Licence en comptabilité et cinq années d'expérience professionnelle"]})],"DUPLICATION"],
    ["same source boilerplate is not duplication",[mk("a","Agent","A",{description:["Accueil Offres d'emploi Vous devez être connecté pour postuler Tous nos services sont gratuits"]}),mk("b","Manoeuvre","A",{description:["Accueil Offres d'emploi Vous devez être connecté pour postuler Tous nos services sont gratuits"]})],"NO_DUPLICATION"]
  ];
  const out=cases.map(([name,jobs,want])=>{const r=analyze(jobs),pair=r.findings.find(f=>f.pair),got=pair?.decision??"REVIEW";return{name,got,pass:got===want}});
  console.log(JSON.stringify({passed:out.filter(x=>x.pass).length,total:out.length,cases:out},null,2));
  if(out.some(x=>!x.pass))process.exitCode=1
}
const [input,output="audit-output/duplication-v3-report.json"]=process.argv.slice(2);
if(input==="--self-test")selfTest();
else{if(!input){console.error("Usage: node scripts/duplication-v3-contradiction.mjs <snapshot.json> [report.json] | --self-test");process.exit(2)}const raw=JSON.parse(fs.readFileSync(input,"utf8")),jobs=Array.isArray(raw)?raw:(raw.jobs??raw.results);if(!Array.isArray(jobs))throw Error("Input must be [] or {jobs:[]}");const r=analyze(jobs);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(r,null,2));console.log(JSON.stringify(r.summary,null,2))}
