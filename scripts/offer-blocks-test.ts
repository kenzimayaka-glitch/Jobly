import assert from "node:assert/strict";
import { buildCanonicalOffer, buildOfferSubtitle, CANONICAL_BLOCK_ORDER } from "../lib/offerBlocks";

type Fixture={id:string;sourceKey:string;url:string;expected:string[]};
const fixtures:Fixture[]=[
["63d7970e-63f6-4ef5-8734-1df851dcb3bc","africarrieres","https://africarrieres.com/uganda/en/emplois/charge-dadministration",["description"]],
["4cfdd0cd-760d-4b70-8bfc-8aec13aed88b","africarrieres","https://africarrieres.com/south-africa/en/emplois/specialiste-des-risques-non-financiers-banque-de-transaction-cib",["description"]],
["9ae3e305-34e7-4ea1-b4b7-655d778865a4","africarrieres","https://africarrieres.com/south-africa/en/emplois/young-aspiring-manager-yam-client-care-inbound",["description"]],
["c10cb688-53ff-498f-b096-13b85d7d3e06","ajirika_east","https://ajirika.com/jobs/10478",["description"]],
["8fd9ce73-7c78-4bd8-ac6c-b9b82877e7a5","ajirika_east","https://ajirika.com/jobs/10479",["description"]],
["b881700e-40aa-4a11-ab14-ea68751e3917","ajirika_east","https://ajirika.com/jobs/10480",["description"]],
["668efcaa-e5d4-4b4c-83cc-0b0c1c5ae51b","brightermonday_ke","https://www.brightermonday.co.ke/listings/restaurant-manager-454k69",["description"]],
["9b5a7b69-026b-4ad2-acd2-c9e43feb2d34","brightermonday_ke","https://www.brightermonday.co.ke/listings/sales-manager-vd4jm8",["description"]],
["8cef3a58-1214-4ac5-8029-2546a2ad90cd","brightermonday_ke","https://www.brightermonday.co.ke/listings/sales-operations-manager-8mv8qz",["description"]],
["3605320b-e106-4b54-bd31-e3712f9e7780","emplois_cameroun","https://emploiscameroun.com/offre/57411-meci-recrute-03-stagiaires-dans-plusieurs-domaines-a-douala/",["description"]],
["3958163f-3ca8-4035-935f-616f8b90e8ee","emplois_cameroun","https://emploiscameroun.com/offre/57345-stagiaire-assistant-e-en-essais-agronomiques-chez-la-compagnie-fermiere-du-cameroun-cfc/",["description"]],
["0a357696-0c82-4e5c-84d3-d13a5b0227a8","emplois_cameroun","https://emploiscameroun.com/offre/56484-archipel-cm-recrute-un-e-teleconseiller-ere-a-douala/",["description","missions","profile","education","skills"]],
["90c404be-a54b-45ea-ba9b-82de739ac8e8","goafricajobs","https://goafricajobs.com/jobs/740868912-standards-and-research-specialist",["description"]],
["06d6a786-fac0-40d3-b540-16ab068a9bbe","goafricajobs","https://goafricajobs.com/jobs/740868909/apply",["description"]],
["4e1affbb-009b-43be-a59c-a8f1db14b403","goafricajobs","https://goafricajobs.com/jobs/740868905-urban-planning-and-community-advisor-for-climate-resilient-urbanisation",["description"]],
["da2282c0-00c9-4a55-acd0-d3706ad4861f","infosconcourseducation","https://infosconcourseducation.com/offre-demploi-2026-chef-de-projet-digital-mma-digital-agency/",["description","missions","experience","skills","qualities","application"]],
["f25607c6-5c2b-4e73-be8b-814dd4619a38","infosconcourseducation","https://infosconcourseducation.com/offre-demploi-2026-chargee-dapprovisionnement-central/",["description","experience","education","qualities"]],
["f72b560c-5658-40b2-8121-b304cf9ff8e6","infosconcourseducation","https://infosconcourseducation.com/offre-demploi-2026-technicien-magasinier-temporaire-sgs/",["description","missions","experience","application"]],
["76022843-b0f4-4cf4-a782-bc55d908bf1b","jobincamer","https://www.jobincamer.com/job/advance-it-group-recrute-une-gestionnaire-administration-rh-paie",["description","missions","profile","education"]],
["323d5e2b-2275-4b57-8b8e-2e18afd0e786","jobincamer","https://www.jobincamer.com/job/oris-finance-recrute-des-caissieres-et-des-brands-ambassadeurs",["description","missions","profile","education"]],
["c65b68b4-a790-445a-a508-058b912d41a1","jobinfocamer","https://www.jobinfocamer.com/job/44901/help-desks-a-educaid",["description","missions","profile","experience","education","application"]],
["fd749be1-7723-407c-babc-1ab6258b3b0f","jobinfocamer","https://www.jobinfocamer.com/job/44914/consultant-en-raffinerie-d-huile-vegetale-a-entreprise-de-la-place",["description","experience","education","skills","qualities","application"]],
["d53c7edb-5e0c-4e4b-8a18-0fdabf5f8e40","jobinfocamer","https://www.jobinfocamer.com/job/44840/responsable-commercial-a-entreprise-de-la-place",["description","experience","education"]],
["3b79b086-e9ad-499d-8c6f-9d3e5acda187","jobivoire_ci","https://www.jobivoire.ci/job/q6NEJPNQQ",["description"]],
["188417a2-0dde-41f0-aa2e-db4875be1ab9","jobivoire_ci","https://www.jobivoire.ci/job/m0myPFf2f",["description"]],
["6013ac62-b766-4e42-8269-3aeb83334f1b","jobivoire_ci","https://www.jobivoire.ci/job/QgX3zFfJw",["description"]],
["28f5f705-6a59-4c3d-b108-2647057c59f0","unjobnet","https://www.unjobnet.org/jobs/detail/irc-caseworker-89389728",["description"]],
["408a9816-395f-458d-a2ca-41d2e7c43e17","unjobnet","https://www.unjobnet.org/jobs/detail/ctg-etc-construction-coordinator-89389726",["description"]],
["598ba5d7-4719-4ae8-859c-ed670f198538","unjobnet","https://www.unjobnet.org/jobs/detail/ctg-national-hlp-and-protection-associate-89389725",["description"]],
].map(([id,sourceKey,url,expected])=>({id,sourceKey,url,expected})) as Fixture[];

assert.equal(fixtures.length,30,"étalon = 30 offres réelles");

for(const f of fixtures){
  const sourceLines:string[]=["Source description for "+f.id];
  const normalized:any={title:"Poste "+f.id,company:"Entreprise "+f.id,location:["Douala"],source:{url:f.url},description:sourceLines};
  for(const key of f.expected){
    const phrase=key+" source fact "+f.id;
    normalized[key]=[phrase];
    sourceLines.push(phrase);
  }
  const offer=buildCanonicalOffer({
    title:normalized.title,companyName:normalized.company,description:sourceLines.join("\n"),
    location:"Douala",contractType:null,remoteMode:"NO",salaryMin:null,salaryMax:null,salaryCurrency:null,
    deadline:null,source:f.sourceKey,sourceKey:f.sourceKey,sourceUrl:f.url,normalizedContent:normalized,
  });
  for(const key of f.expected) assert.ok((offer as any)[key]?.length>0,f.id+": bloc attendu absent: "+key);
  assert.equal(offer.title,normalized.title);
  assert.equal(offer.company,normalized.company);
  assert.deepEqual(offer.location,["Douala"]);
  assert.equal(offer.remote,"NO");
  assert.equal(offer.sourceUrl,f.url);
  const textBlocks=["description","missions","profile","experience","education","skills","qualities","benefits","application"] as const;
  const seen=new Set<string>();
  for(const key of textBlocks) for(const line of offer[key]){
    const sig=line.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
    assert.ok(!seen.has(sig),f.id+": doublon entre blocs: "+line);
    seen.add(sig);
    assert.ok(!/<[^>]+>/.test(line),f.id+": HTML brut");
  }
}

const invalid=buildCanonicalOffer({
  title:"T",companyName:"C",description:"Source text",
  location:"Douala",contractType:"AUTRE",remoteMode:"MAYBE",salaryMin:200000,salaryMax:300000,salaryCurrency:"XAF",
  deadline:"date limite bientôt",sourceKey:"jobincamer",sourceUrl:"https://example.test",
  normalizedContent:{title:"T",company:"C",location:["Douala"],contractType:"AUTRE",remoteMode:"MAYBE",salary:{min:200000,max:300000,currency:"XAF"},deadline:"date limite bientôt",description:["Source text"],source:{url:"https://example.test"}},
});
assert.equal(invalid.contract,null);
assert.equal(invalid.remote,null);
assert.equal(invalid.deadline,null);
assert.equal(invalid.salary.min,200000);
assert.equal(invalid.salary.currency,"XAF");

const sub=buildOfferSubtitle({
  version:"jobly-offer-canonical-v1",title:"T",company:"C",location:["Douala"],contract:"CDD",
  salary:{min:100000,max:200000,currency:"XAF"},remote:"PARTIAL",deadline:"2026-10-02T00:00:00.000Z",
  description:[],missions:[],profile:[],experience:["3 ans d'expérience"],education:[],skills:[],qualities:[],benefits:[],application:[],
  sourceUrl:"https://example.test",qualityScore:100,displayMode:"FULL",qualityFlags:[],
});
assert.match(sub,/Douala/); assert.match(sub,/CDD/); assert.match(sub,/100\s*000/); assert.match(sub,/3 ans/); assert.match(sub,/Hybride/); assert.match(sub,/2 octobre 2026/);

console.log(JSON.stringify({ok:true,fixtures:fixtures.length,canonicalOrder:CANONICAL_BLOCK_ORDER},null,2));
