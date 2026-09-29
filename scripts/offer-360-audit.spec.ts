import { test, expect } from "@playwright/test";
import { buildCanonicalOffer } from "../lib/jobCanonicalOffer";
import { extractVisibleOfferBlocks, blocksToStructuredText } from "../lib/jobOfferBlocks";

const manifest = require("./offer-360-manifest.json");
const norm = (s:string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();
const sectionKeys = ["description","missions","profile","skills","experience","education","qualities","benefits","application"] as const;

function dateKey(value:string): string|null {
  const m = value.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
}
function sourceMetadata(text:string) {
  const location = text.match(/(?:Lieu d[’']affectation|Lieu|Localisation|Location|Ville|Poste basé)\s*[:：-]\s*([^\n]{2,100})/i)?.[1]?.trim() || null;
  const deadlineRaw = text.match(/(?:Date limite(?: de candidature)?|Date expiration|deadline|Postuler avant)\s*[:：-]?\s*(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche),?\s*)?([^\n]{6,80})/i)?.[1]?.trim() || null;
  const contract = text.match(/(?:Type de contrat|Contrat)\s*[:：-]\s*([^\n]{2,80})/i)?.[1]?.trim() || null;
  return {location, deadlineRaw, deadline: deadlineRaw ? dateKey(deadlineRaw) : null, contract};
}
function applicationRegion(blocks:any[]) {
  const labels = /comment postuler|modalit(?:é|e)s? de candidature|pour postuler|dossier de candidature|proc(?:é|e)dure de candidature|processus de candidature|pi(?:è|e)ces? (?:à|a) (?:fournir|joindre)|objet(?: du mail| de candidature)?/i;
  const start = blocks.findIndex(b => labels.test(b.text));
  if (start < 0) return "";
  const out:string[] = [];
  const level = blocks[start].level;
  for (let i=start;i<blocks.length;i++) {
    if (i>start && blocks[i].level<=level && /^(h[1-6])$/i.test(blocks[i].tag)) break;
    out.push(blocks[i].text);
  }
  return out.join("\n");
}
function auditRow(row:JobRow, html:string) {
  const blocks = extractVisibleOfferBlocks(html);
  const text = blocksToStructuredText(blocks);
  const meta = sourceMetadata(text);
  const applicationSource = applicationRegion(blocks);
  const emails = [...new Set((applicationSource.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]).map(x=>x.toLowerCase()))];
  const explicitSubject = applicationSource.match(/(?:objet(?: du mail| de candidature)?|mettre en objet)\s*[:：-]\s*([^\n.]{3,180})/i)?.[1]?.trim() || null;
  const prepared = buildCanonicalOffer({
    title: row.title,
    description: text,
    sourceUrl: row.sourceUrl,
    source: row.sourceKey || "generic",
    location: meta.location,
    deadline: meta.deadlineRaw,
  });
  const c:any = prepared.canonical;
  const failures:string[] = [];
  const warnings:string[] = [];
  if (!blocks.length || text.length < 120) failures.push("capture_or_extraction_thin");
  if (/aller au contenu principal|toggle navigation|main navigation|copyright\s*\d{4}/i.test(c.description.join("\n"))) failures.push("menu_footer_leak");
  if (/^(?:cdd|cdi|stage|autre|temps[- ]plein|temps[- ]partiel|freelance|intérim)/i.test(String(c.company||""))) failures.push("company_is_contract");
  if (meta.location && c.location.length && norm(c.location[0]) !== norm(meta.location.replace(/\s*,\s*cameroun.*$/i,""))) failures.push("location_mismatch");
  if (meta.location && !c.location.length) failures.push("location_missing");
  if (meta.deadline && !String(c.deadline||"").startsWith(meta.deadline)) failures.push("deadline_missing_or_wrong");
  if (emails.length && !emails.some(e=>c.application.some((x:string)=>x.toLowerCase().includes(e)))) failures.push("application_email_missing");
  if (explicitSubject && !c.application.some((x:string)=>norm(x).includes(norm(explicitSubject)))) failures.push("explicit_subject_missing");
  if (!explicitSubject && c.application.some((x:string)=>/objet(?: du mail| de candidature)?\s*[:：-]/i.test(x))) failures.push("inferred_subject");
  const sections:any = Object.fromEntries(sectionKeys.map(k=>[k,Array.isArray(c[k])?c[k]:[]]));
  const seen = new Map<string,string>();
  for (const key of sectionKeys) for (const item of sections[key]) {
    const n=norm(String(item)); if(n.length<12) continue;
    const previous=seen.get(n); if(previous && previous!==key) failures.push(`duplicate_cross_section:${previous}->${key}`);
    else seen.set(n,key);
  }
  if (c.application.some((x:string)=>c.qualities.some((q:string)=>norm(q).includes(norm(x)) || norm(x).includes(norm(q)) && norm(q).length>20))) failures.push("application_in_qualities");
  const uniqueFailures=[...new Set(failures)];
  return {
    id:row.id,title:row.title,sourceKey:row.sourceKey,sourceUrl:row.sourceUrl,
    before:{company:row.normalizedContent?.company||null,location:row.location,contractType:row.contractType,deadline:row.deadline,normalizedVersion:row.normalizedVersion},
    after:{company:c.company||null,location:c.location,contractType:c.contractType||null,deadline:c.deadline||null,application:c.application,qualities:c.qualities,warnings:c.quality?.warnings||[]},
    sourceEvidence:{blocks:blocks.length,visibleTextLength:text.length,location:meta.location,deadline:meta.deadline,applicationEmails:emails,explicitSubject},
    failures:uniqueFailures,
    warnings,
    score: uniqueFailures.length ? 0 : 100
  };
}

test.setTimeout(60 * 60 * 1000);

test("360° rendered audit — all 248 active offers", async ({ browser }) => {
  const jobs=await loadJobs();
  if(jobs.length!==248) throw new Error(`Expected 248 active offers, got ${jobs.length}`);
  const results:any[]=[];
  let cursor=0;
  const worker=async()=> {
    while(true) {
      const i=cursor++;
      if(i>=jobs.length) return;
      const row=jobs[i];
      if(!row.sourceUrl){results.push({id:row.id,title:row.title,failures:["missing_source_url"],score:0}); continue;}
      let last="";
      for(let attempt=1;attempt<=3;attempt++){
        const page=await browser.newPage({viewport:{width:1440,height:1200}});
        try {
          await page.goto(row.sourceUrl,{waitUntil:"domcontentloaded",timeout:30000});
          try { await page.waitForLoadState("networkidle",{timeout:8000}); } catch {}
          const html=await page.content();
          const audit=auditRow(row,html);
          if(!audit.failures.length){results.push(audit); last=""; break;}
          last=JSON.stringify(audit);
          if(attempt===3) results.push(audit);
        } catch(e) {
          last=String(e);
          if(attempt===3) results.push({id:row.id,title:row.title,sourceKey:row.sourceKey,sourceUrl:row.sourceUrl,failures:["capture_failed"],error:last,score:0});
        } finally { await page.close(); }
      }
      if((i+1)%10===0) console.log(`AUDIT ${i+1}/${jobs.length}`);
    }
  };
  await Promise.all(Array.from({length:4},worker));
  results.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const passed=results.filter(r=>r.score===100).length;
  const failed=results.length-passed;
  const summary={
    total:results.length,passed,failed,passRate:passed/results.length,
    bySource:Object.fromEntries([...new Set(results.map(r=>r.sourceKey||"generic"))].map(s=>{
      const xs=results.filter(r=>(r.sourceKey||"generic")===s); return [s,{total:xs.length,passed:xs.filter(x=>x.score===100).length,failed:xs.filter(x=>x.score!==100).length}];
    })),
    failureTypes:Object.fromEntries([...new Set(results.flatMap(r=>r.failures||[]))].map(f=>[f,results.filter(r=>(r.failures||[]).includes(f)).length]))
  };
  const report={generatedAt:new Date().toISOString(),summary,results};
  await import("node:fs/promises").then(fs=>fs.writeFile("offer-360-audit.json",JSON.stringify(report,null,2)));
  console.log(JSON.stringify(summary,null,2));
  expect(failed, JSON.stringify(summary, null, 2)).toBe(0);
});
