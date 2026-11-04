import { assertEquals } from "jsr:@std/assert@1";
import { extractSourceDeadline, extractSourcePublishedAt, resolveEffectivePublicationDate } from "./date-extraction.ts";
import { resolveSourceUrl } from "./country-url-resolver.ts";
import { buildSourceRunPlan } from "./source-engine.ts";
import { getActiveSources } from "./source-registry.ts";
import type { SourceDefinition } from "./source-registry.ts";
const NOW="2026-10-03T07:00:00.000Z";
const cases:Array<[string,string,string,string]>=[
 ["Infos Concours","<p>Publication : 1 octobre 2026</p>","infosconcourseducation","2026-10-01T00:00:00.000Z"],
 ["JobInfoCamer","<main>24 Septembre 2026 | Consultant Nouveau | CDD</main>","jobinfocamer","2026-09-24T00:00:00.000Z"],
 ["Emplois Cameroun","<main>01/10/2026 Cameroun | Assistant Comptable</main>","emplois_cameroun","2026-10-01T00:00:00.000Z"],
 ["Job in Cameroun","<article>Date de publication : 02/10/2026</article>","jobincamer","2026-10-02T00:00:00.000Z"],
 ["Job Ivoire","<article>Date de publication : 30/09/2026</article>","jobivoire_ci","2026-09-30T00:00:00.000Z"],
 ["Ajirika East","<article>Date Posted: March 25, 2026</article>","ajirika_east","2026-03-25T00:00:00.000Z"],
 ["BrighterMonday Kenya","<article>Posted on 03/30/2026</article>","brightermonday_ke","2026-03-30T00:00:00.000Z"],
 ["UNjobnet","<article>Date posted: 30/09/2026</article>","unjobnet","2026-09-30T00:00:00.000Z"],
 ["Go Africa Jobs","<article>Date Posted:19/09/2026</article>","goafricajobs","2026-09-19T00:00:00.000Z"],
 ["AJAR RDC","<article>Date publication : 28/09/2026</article>","ajar_cd","2026-09-28T00:00:00.000Z"]
];
for(const [name,html,key,expected] of cases)Deno.test(name+" publication date adapter",()=>assertEquals(extractSourcePublishedAt(html,"https://example.test/job",key),expected));
Deno.test("JSON-LD has priority over text/meta",()=>assertEquals(extractSourcePublishedAt('<meta property="datePublished" content="2026-09-01T00:00:00Z"><script type="application/ld+json">{"@type":"JobPosting","datePosted":"2026-10-02T09:00:00Z"}</script><p>Publication : 1 octobre 2026</p>',"https://x.test/job","jobincamer"),"2026-10-02T09:00:00.000Z"));
Deno.test("fallback is estimated",()=>{const r=resolveEffectivePublicationDate({sourcePublishedAt:null,firstHarvestAt:"2026-09-20T10:00:00Z",createdAt:"2026-09-21T10:00:00Z",deadline:null,now:NOW});assertEquals(r.visible,true);assertEquals(r.publicationDateEstimated,true);});
Deno.test("real date suppresses fallback",()=>{const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-09-10T10:00:00Z",firstHarvestAt:"2026-10-01T10:00:00Z",createdAt:"2026-10-01T10:00:00Z",deadline:null,now:NOW});assertEquals(r.effectivePublishedAt,"2026-09-10T10:00:00.000Z");assertEquals(r.publicationDateEstimated,false);});
Deno.test("deadline expired excluded",()=>assertEquals(resolveEffectivePublicationDate({sourcePublishedAt:null,firstHarvestAt:"2026-09-28T10:00:00Z",createdAt:"2026-09-28T10:00:00Z",deadline:"2026-10-02T00:00:00Z",now:NOW}).visible,false));
Deno.test("fallback older than 30 days excluded",()=>assertEquals(resolveEffectivePublicationDate({sourcePublishedAt:null,firstHarvestAt:"2026-08-20T10:00:00Z",createdAt:"2026-08-20T10:00:00Z",deadline:null,now:NOW}).visible,false));
Deno.test("real source date between 30 and 62 days remains visible",()=>assertEquals(resolveEffectivePublicationDate({sourcePublishedAt:"2026-08-20T10:00:00Z",firstHarvestAt:"2026-10-01T10:00:00Z",createdAt:"2026-10-01T10:00:00Z",deadline:null,now:NOW}).visible,true));
Deno.test("real source date older than 62 days is excluded",()=>assertEquals(resolveEffectivePublicationDate({sourcePublishedAt:"2026-08-01T10:00:00Z",firstHarvestAt:"2026-10-01T10:00:00Z",createdAt:"2026-10-01T10:00:00Z",deadline:null,now:NOW}).visible,false));
Deno.test("JSON-LD dateModified alone is not a publication date",()=>assertEquals(
  extractSourcePublishedAt('<script type="application/ld+json">{"@type":"JobPosting","dateModified":"2026-10-02T09:00:00Z"}</script>',"https://x.test/job","unknown"),
  null
));
Deno.test("future source publication date is rejected",()=>{
  const r=resolveEffectivePublicationDate({sourcePublishedAt:"2026-10-04T07:00:00Z",firstHarvestAt:null,createdAt:"2026-10-01T07:00:00Z",deadline:null,now:NOW});
  assertEquals(r.visible,false);
  assertEquals(r.publishedInFuture,true);
  assertEquals(r.rejectionCode,"PUBLICATION_DATE_IN_FUTURE");
});
function sourceForTest(key:string,url:string,countries:string[]):SourceDefinition {
  return {key,name:key,type:"aggregator",status:"active",enabled:true,url,countries,languages:["en"],captureMode:"http",renderRequired:false,priority:1};
}
Deno.test("generic multi-country source URLs are not assigned to every country",()=>{
  const r=resolveSourceUrl(sourceForTest("unjobnet","https://www.unjobnet.org/",["CM","CI","NG"]),"NG");
  assertEquals(r.strategy,"unresolved");
  assertEquals(r.url,"");
});
Deno.test("country-code substrings inside generic words are not treated as country filters",()=>{
  const r=resolveSourceUrl(sourceForTest("devnetjobs","https://devnetjobs.org/engineering",["NG","KE"]),"NG");
  assertEquals(r.strategy,"unresolved");
});
Deno.test("Africa-wide source aliases resolve a country-specific search URL",()=>{
  const relief=resolveSourceUrl(sourceForTest("reliefweb_africa","https://reliefweb.int/jobs",["CM","CI"]),"CI");
  assertEquals(relief.strategy,"query-country");
  assertEquals(relief.url.includes("Cote%20d'Ivoire"),true);
  const unjobs=resolveSourceUrl(sourceForTest("unjobs_africa","https://unjobs.org/",["CM","CI"]),"CI");
  assertEquals(unjobs.strategy,"country-path");
  assertEquals(unjobs.url,"https://unjobs.org/duty_stations/cote-divoire");
});
Deno.test("country-specific ccTLD is recognized as an exact country token",()=>{
  const r=resolveSourceUrl(sourceForTest("emploi_cm","https://www.emploi.cm/",["CM"]),"CM");
  assertEquals(r.strategy,"static");
  assertEquals(r.confidence,"high");
});

Deno.test("international sources are not crawled twice across Africa",()=>{
  const cm = new Set(getActiveSources("CM").map(source=>source.key));
  const ci = new Set(getActiveSources("CI").map(source=>source.key));
  for (const key of ["reliefweb","unjobs","impactpool"]) {
    assertEquals(cm.has(key),true);
    assertEquals(ci.has(key),false);
    assertEquals(ci.has(key+"_africa"),true);
    assertEquals(cm.has(key+"_africa"),false);
  }
});

Deno.test("sixth-pass national sources are enabled in the country registry",()=>{
  const za=new Set(getActiveSources("ZA").map(source=>source.key));
  const et=new Set(getActiveSources("ET").map(source=>source.key));
  const ma=new Set(getActiveSources("MA").map(source=>source.key));
  const tz=new Set(getActiveSources("TZ").map(source=>source.key));
  const ke=new Set(getActiveSources("KE").map(source=>source.key));
  const ng=new Set(getActiveSources("NG").map(source=>source.key));
  const ug=new Set(getActiveSources("UG").map(source=>source.key));
  for(const key of ["pnet","careerjunction"]) assertEquals(za.has(key),true);
  assertEquals(et.has("ethiojobs"),true);
  assertEquals(ma.has("emploi_ma"),true);
  assertEquals(tz.has("ajira_portal"),true);
  for(const keys of [ke,ng,ug]) assertEquals(keys.has("fuzu"),true);
});
Deno.test("Fuzu resolves to a distinct country landing page",()=>{
  const fuzu:SourceDefinition={key:"fuzu",name:"Fuzu",type:"pan_africa",status:"active",enabled:true,url:"https://www.fuzu.com/job",countries:["KE","NG","UG"],languages:["en"],captureMode:"http",renderRequired:false,priority:1};
  assertEquals(resolveSourceUrl(fuzu,"KE").url,"https://www.fuzu.com/kenya");
  assertEquals(resolveSourceUrl(fuzu,"NG").url,"https://www.fuzu.com/nigeria");
  assertEquals(resolveSourceUrl(fuzu,"UG").url,"https://www.fuzu.com/uganda");
});

Deno.test("seventh-pass verified and discovery-only sources have correct activation state",()=>{
  const ci=new Set(getActiveSources("CI").map(source=>source.key));
  assertEquals(ci.has("educarriere_ci"),true);
  for(const [code,key] of [["MA","dreamjob_ma"],["SO","jobs_gov_so"],["TN","tanitjobs"],["ET","ethiopian_reporter_jobs"],["MZ","mmo_emprego"],["ZA","african_union_jobs"]] as const) {
    assertEquals(getActiveSources(code).some(source=>source.key===key),false);
  }
});
Deno.test("Educarriere extracts explicit French publication dates",()=>{
  assertEquals(extractSourcePublishedAt("<article>Publié le 02/11/2026</article>","https://emploi.educarriere.ci/emploi/","educarriere_ci"),"2026-11-02T00:00:00.000Z");
});

Deno.test("eighth-pass West African candidates are recorded but not yet active",()=>{
  for(const [code,key] of [["BJ","emploi_benin"],["BJ","synergieplus_bj"],["BF","emploi_burkina"],["ML","emploi_mali"],["NE","opportafrik_ne"]] as const) {
    assertEquals(getActiveSources(code).some(source=>source.key===key),false);
  }
});


Deno.test("NELEX publication date adapter",()=>assertEquals(
  extractSourcePublishedAt("<p>Date Posted: Oct 15, 2026</p>","https://nelex.gov.ng/job/example","nelex_ng"),
  "2026-10-15T00:00:00.000Z"
));
Deno.test("NELEX ordinal closing date adapter",()=>assertEquals(
  extractSourceDeadline("<p>Application Closing Date: 25th October, 2026.</p>","https://nelex.gov.ng/job/example","nelex_ng"),
  "2026-10-25T23:59:59.999Z"
));
Deno.test("NELEX historical posts fail 62-day source-date freshness gate",()=>{
  const published=extractSourcePublishedAt("<p>Date Posted: Jun 19, 2023</p>","https://nelex.gov.ng/job/example","nelex_ng");
  const result=resolveEffectivePublicationDate({sourcePublishedAt:published,firstHarvestAt:"2026-11-04T10:00:00Z",createdAt:"2026-11-04T10:00:00Z",deadline:null,now:"2026-11-04T10:00:00Z"});
  assertEquals(result.visible,false);
  assertEquals(result.rejectionCode,"SOURCE_PUBLICATION_OVER_62_DAYS");
});
Deno.test("NELEX expired deadline is rejected even for recent publication",()=>{
  const result=resolveEffectivePublicationDate({sourcePublishedAt:"2026-10-15T00:00:00Z",firstHarvestAt:"2026-11-04T10:00:00Z",createdAt:"2026-11-04T10:00:00Z",deadline:"2026-10-25T00:00:00Z",now:"2026-11-04T10:00:00Z"});
  assertEquals(result.visible,false);
  assertEquals(result.rejectionCode,"DEADLINE_PASSED");
});
Deno.test("Ninth-pass source activation states are intentional",()=>{
  const ng=new Set(getActiveSources("NG").map(source=>source.key));
  assertEquals(ng.has("nelex_ng"),true);
  for(const [country,key] of [["NG","leep_jobs_ng"],["BJ","uemoa_careers"],["KE","eafrica_connect"],["GA","pnpe_ga_offers"],["GN","cawa_group_west"]] as const) {
    assertEquals(getActiveSources(country).some(source=>source.key===key),false);
  }
});

Deno.test("NELEX is selected by the Nigeria-specific source run plan",()=>{
  const source=buildSourceRunPlan("NG").find(item=>item.key==="nelex_ng");
  assertEquals(Boolean(source),true);
  assertEquals(source?.enabled,true);
  assertEquals(resolveSourceUrl(source!,"NG").url,"https://nelex.gov.ng/jobs");
});

Deno.test("ANPE Togo abbreviated French publication date", () => {
  assertEquals(
    extractSourcePublishedAt("<p>Publiée le 29 oct. 2026</p>", "https://anpetogo.net/poste/1", "anpetogo"),
    "2026-10-29T00:00:00.000Z",
  );
});
Deno.test("ANPE Togo abbreviated French closing date", () => {
  assertEquals(
    extractSourceDeadline("<p>Date limite de dépôt de dossiers de candidature : 6 nov. 2026</p>", "https://anpetogo.net/poste/1", "anpetogo"),
    "2026-11-06T23:59:59.999Z",
  );
});
Deno.test("ANPE Niger closing date adapter", () => {
  assertEquals(
    extractSourceDeadline("<p>Date de clôture : 11/11/2026</p>", "https://anpe-niger.ne/poste/1", "anpe_ne"),
    "2026-11-11T23:59:59.999Z",
  );
});
Deno.test("South Africa closing date adapter", () => {
  assertEquals(
    extractSourceDeadline("<p>CLOSING DATE: 13 November 2026</p>", "https://www.labour.gov.za/vacancy/1", "south_africa_gov_jobs"),
    "2026-11-13T23:59:59.999Z",
  );
});
Deno.test("HireLiberia apply-by date adapter", () => {
  assertEquals(
    extractSourceDeadline("<p>Apply by: November 6, 2026</p>", "https://hireliberia.com/job/1", "hrjobs_liberia"),
    "2026-11-06T23:59:59.999Z",
  );
});

Deno.test("BETA Mauritania closing date is extracted in French", () => {
  assertEquals(extractSourceDeadline("<p>Date limite de réception : 12 novembre 2026</p>", "https://beta.mr/beta/offre/un-responsable-achat/12019", "beta_mauritania"), "2026-11-12T23:59:59.999Z");
  assertEquals(extractSourceDeadline("<p>Date limite : 15 novembre 2026</p>", "https://beta.mr/beta/offre/recrutement-profils/11930", "beta_mauritania"), "2026-11-15T23:59:59.999Z");
});

Deno.test("date-only application deadline remains valid through the end of the deadline day", () => {
  const deadline = extractSourceDeadline("<p>Date limite : 4 novembre 2026</p>", "https://beta.mr/offre/1", "beta_mauritania");
  assertEquals(deadline, "2026-11-04T23:59:59.999Z");
  const result = resolveEffectivePublicationDate({
    sourcePublishedAt: "2026-10-22T00:00:00.000Z",
    firstHarvestAt: null,
    createdAt: "2026-10-22T00:00:00.000Z",
    deadline,
    now: "2026-11-04T16:30:00.000Z",
  });
  assertEquals(result.visible, true);
});
