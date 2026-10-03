import { assertEquals } from "jsr:@std/assert@1";
import { extractSourcePublishedAt, resolveEffectivePublicationDate } from "./date-extraction.ts";
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
Deno.test("real source date older than 30 days excluded by freshness",()=>assertEquals(resolveEffectivePublicationDate({sourcePublishedAt:"2026-08-20T10:00:00Z",firstHarvestAt:"2026-10-01T10:00:00Z",createdAt:"2026-10-01T10:00:00Z",deadline:null,now:NOW}).visible,false));
