import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildCanonicalOffer, buildOfferSubtitle, CANONICAL_BLOCK_ORDER } from "../lib/offerBlocks";

type Fixture={id:string;sourceKey:string};
const PRIMARY:Fixture[]=[
["63d7970e-63f6-4ef5-8734-1df851dcb3bc","africarrieres"],
["4cfdd0cd-760d-4b70-8bfc-8aec13aed88b","africarrieres"],
["9ae3e305-34e7-4ea1-b4b7-655d778865a4","africarrieres"],
["c10cb688-53ff-498f-b096-13b85d7d3e06","ajirika_east"],
["8fd9ce73-7c78-4bd8-ac6c-b9b82877e7a5","ajirika_east"],
["b881700e-40aa-4a11-ab14-ea68751e3917","ajirika_east"],
["668efcaa-e5d4-4b4c-83cc-0b0c1c5ae51b","brightermonday_ke"],
["9b5a7b69-026b-4ad2-acd2-c9e43feb2d34","brightermonday_ke"],
["8cef3a58-1214-4ac5-8029-2546a2ad90cd","brightermonday_ke"],
["3605320b-e106-4b54-bd31-e3712f9e7780","emplois_cameroun"],
["3958163f-3ca8-4035-935f-616f8b90e8ee","emplois_cameroun"],
["0a357696-0c82-4e5c-84d3-d13a5b0227a8","emplois_cameroun"],
["90c404be-a54b-45ea-ba9b-82de739ac8e8","goafricajobs"],
["06d6a786-fac0-40d3-b540-16ab068a9bbe","goafricajobs"],
["4e1affbb-009b-43be-a59c-a8f1db14b403","goafricajobs"],
["da2282c0-00c9-4a55-acd0-d3706ad4861f","infosconcourseducation"],
["f25607c6-5c2b-4e73-be8b-814dd4619a38","infosconcourseducation"],
["f72b560c-5658-40b2-8121-b304cf9ff8e6","infosconcourseducation"],
["76022843-b0f4-4cf4-a782-bc55d908bf1b","jobincamer"],
["323d5e2b-2275-4b57-8b8e-2e18afd0e786","jobincamer"],
["c65b68b4-a790-445a-a508-058b912d41a1","jobinfocamer"],
["fd749be1-7723-407c-babc-1ab6258b3b0f","jobinfocamer"],
["d53c7edb-5e0c-4e4b-8a18-0fdabf5f8e40","jobinfocamer"],
["8cbf86bd-31d6-4092-8b62-a2961c1352d7","jobinfocamer"],
["3b79b086-e9ad-499d-8c6f-9d3e5acda187","jobivoire_ci"],
["188417a2-0dde-41f0-aa2e-db4875be1ab9","jobivoire_ci"],
["6013ac62-b766-4e42-8269-3aeb83334f1b","jobivoire_ci"],
["28f5f705-6a59-4c3d-b108-2647057c59f0","unjobnet"],
["408a9816-395f-458d-a2ca-41d2e7c43e17","unjobnet"],
["598ba5d7-4719-4ae8-859c-ed670f198538","unjobnet"],
].map(([id,sourceKey])=>({id,sourceKey}));

const SECONDARY:Fixture[]=[
["1dc7a9a9-4f63-4a9f-861c-652cb61dd675","jobincamer"],
["51df0bb2-1db3-4427-8d7f-346cc4193e9a","emplois_cameroun"],
["5ddd4f48-55ab-4488-8e75-e46e942f1fc8","jobincamer"],
["1392f362-831c-45af-87e7-7d89dd751520","brightermonday_ke"],
["731ba691-f398-430a-ac1d-57d3a0eb7d0f","jobincamer"],
["eefddc13-c5e3-4229-ae45-5dd885235062","ajirika_east"],
["a02396af-7e60-4ca3-b873-7fde3ef7effb","ajirika_east"],
["08819a66-2dd9-4ea9-aece-efe8bc78a732","ajirika_east"],
["c0dcc5c5-eb5a-4c4a-bf48-f81f07309564","ajirika_east"],
["af651218-bcdc-4f40-bf49-5ab872ce4632","jobivoire_ci"],
].map(([id,sourceKey])=>({id,sourceKey}));

type Row=Record<string,any>;

function inputFor(row:Row){
  return {
    id:row.id,title:row.title,companyName:row.companyName??row.company?.name??null,description:row.description??"",
    location:row.location,contractType:row.contractType,remoteMode:row.remoteMode,
    salaryMin:row.minSalary??row.salaryMin??row.normalizedContent?.salary?.min??null,
    salaryMax:row.maxSalary??row.salaryMax??row.normalizedContent?.salary?.max??null,
    salaryCurrency:row.salaryCurrency??row.normalizedContent?.salary?.currency??null,
    deadline:row.deadline,source:row.source,sourceKey:row.sourceKey,sourceUrl:row.sourceUrl,
    normalizedContent:row.normalizedContent,
    sourceType:row.sourceType,
  };
}

function assertOffer(row:Row,fixture:Fixture){
  assert.equal(String(row.sourceKey||"").toLowerCase(),fixture.sourceKey,fixture.id+": sourceKey");
  const offer=buildCanonicalOffer(inputFor(row));
  assert.ok(offer.sourceUrl,fixture.id+": source URL");
  assert.ok(offer.title||offer.displayMode==="MINIMAL",fixture.id+": title/minimal");
  const textBlocks=["description","missions","profile","experience","education","skills","qualities","benefits","application"] as const;
  const seen=new Set<string>();
  for(const key of textBlocks) for(const line of offer[key]){
    const sig=line.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
    assert.ok(!seen.has(sig),fixture.id+": duplicate text across blocks: "+line);
    seen.add(sig);
    assert.ok(!/<[^>]+>/.test(line),fixture.id+": raw HTML");
    assert.ok(!/(?:Ã.|Â.|â.)/.test(line),fixture.id+": mojibake");
  }
  const indexes=CANONICAL_BLOCK_ORDER.map(k=>k).filter(k=>{
    if(k==="title") return !!offer.title;
    if(k==="company") return !!offer.company;
    if(k==="location") return offer.location.length>0;
    if(k==="contract") return !!offer.contract;
    if(k==="salary") return offer.salary.min!=null||offer.salary.max!=null;
    if(k==="remote") return !!offer.remote;
    if(k==="deadline") return !!offer.deadline;
    return offer[k as keyof typeof offer] instanceof Array && (offer[k as keyof typeof offer] as unknown[]).length>0;
  });
  assert.deepEqual(indexes,[...indexes].sort((a,b)=>CANONICAL_BLOCK_ORDER.indexOf(a)-CANONICAL_BLOCK_ORDER.indexOf(b)),fixture.id+": canonical order");
  return offer;
}

async function main(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url&&key,"Supabase CI read-only credentials missing");
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const allFixtures=[...PRIMARY,...SECONDARY];
  const {data,error}=await supabase.from("Job").select("*").in("id",allFixtures.map(f=>f.id));
  if(error) throw new Error(error.message);
  const rows=new Map((data||[]).map((r:any)=>[r.id,r]));
  const runLot=(fixtures:Fixture[])=>{
    let passed=0; const failures:any[]=[];
    for(const fixture of fixtures){
      const row=rows.get(fixture.id);
      if(!row){failures.push({id:fixture.id,sourceKey:fixture.sourceKey,error:"not found"});continue;}
      try{assertOffer(row,fixture);passed++;}catch(e){failures.push({id:fixture.id,sourceKey:fixture.sourceKey,error:String(e)});}
    }
    return {total:fixtures.length,passed,failed:fixtures.length-passed,ratePct:Number((passed/fixtures.length*100).toFixed(2)),failures};
  };

  const primary=runLot(PRIMARY);
  const secondary=runLot(SECONDARY);

  const {data:active,error:activeError}=await supabase.from("Job").select("*").eq("isActive",true);
  if(activeError) throw new Error(activeError.message);
  const bySource:Record<string,{total:number,minimal:number,full:number,errors:number}>={};
  let globalMinimal=0,globalFull=0,globalErrors=0;
  for(const row of active||[]){
    const source=String(row.sourceKey||row.source||"unknown").toLowerCase()||"unknown";
    bySource[source]??={total:0,minimal:0,full:0,errors:0};
    bySource[source].total++;
    try{
      const offer=buildCanonicalOffer(inputFor(row));
      if(offer.displayMode==="MINIMAL"){bySource[source].minimal++;globalMinimal++;}
      else {bySource[source].full++;globalFull++;}
    }catch(e){bySource[source].errors++;globalErrors++;}
  }
  const audit={
    generatedAt:new Date().toISOString(),
    readOnly:true,
    productionWrites:false,
    reindex:false,
    primary,
    secondary,
    activeSimulation:{
      total:(active||[]).length,
      minimal:globalMinimal,
      full:globalFull,
      errors:globalErrors,
      minimalRatePct:(active?.length?Number((globalMinimal/active.length*100).toFixed(2)):0),
      bySource:Object.fromEntries(Object.entries(bySource).sort(([a],[b])=>a.localeCompare(b)))
    }
  };
  writeFileSync("offer-blocks-audit-report.json",JSON.stringify(audit,null,2));
  assert.equal(primary.failed,0,"lot primaire doit être vert");
  assert.equal(secondary.failed,0,"second lot doit être vert");
  assert.equal(globalErrors,0,"simulation active sans erreur");
  console.log(JSON.stringify(audit,null,2));
}
main().catch(e=>{console.error(e);process.exit(1);});
