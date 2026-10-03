import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const BASE = "http://127.0.0.1:3000";
const IDS = [
  ["323d5e2b-2275-4b57-8b8e-2e18afd0e786","ORIS"],
  ["c65b68b4-a790-445a-a508-058b912d41a1","EducAid"],
  ["0a357696-0c82-4e5c-84d3-d13a5b0227a8","ARCHIPEL CM"],
  ["f72b560c-5658-40b2-8121-b304cf9ff8e6","SGS"],
  ["63d7970e-63f6-4ef5-8734-1df851dcb3bc","Africa carrieres"],
  ["4cfdd0cd-760d-4b70-8bfc-8aec13aed88b","Africa carrieres"],
  ["9ae3e305-34e7-4ea1-b4b7-655d778865a4","Africa carrieres"],
  ["c10cb688-53ff-498f-b096-13b85d7d3e06","Ajirika"],
  ["b71fa012-cd86-457e-b21e-102b97f9bf00","UNJobNet"],
  ["b881700e-40aa-4a11-ab14-ea68751e3917","Ajirika"],
  ["668efcaa-e5d4-4b4c-83cc-0b0c1c5ae51b","BrighterMonday"],
  ["a0b6b079-40fd-4863-9150-673ff27865f8","ONAPE"],
  ["8cef3a58-1214-4ac5-8029-2546a2ad90cd","BrighterMonday"],
  ["3605320b-e106-4b54-bd31-e3712f9e7780","Emplois Cameroun"],
  ["3958163f-3ca8-4035-935f-616f8b90e8ee","Emplois Cameroun"],
  ["90c404be-a54b-45ea-ba9b-82de739ac8e8","GoAfricaJobs"],
  ["06d6a786-fac0-40d3-b540-16ab068a9bbe","GoAfricaJobs"],
  ["4e1affbb-009b-43be-a59c-a8f1db14b403","GoAfricaJobs"],
  ["da2282c0-00c9-4a55-acd0-d3706ad4861f","Infos Concours Education"],
  ["f25607c6-5c2b-4e73-be8b-814dd4619a38","Infos Concours Education"],
  ["76022843-b0f4-4cf4-a782-bc55d908bf1b","Job in Cameroun"],
  ["fd749be1-7723-407c-babc-1ab6258b3b0f","JobInfoCamer"],
  ["d53c7edb-5e0c-4e4b-8a18-0fdabf5f8e40","JobInfoCamer"],
  ["8cbf86bd-31d6-4092-8b62-a2961c1352d7","JobInfoCamer"],
  ["3b79b086-e9ad-499d-8c6f-9d3e5acda187","JobIvoire"],
  ["188417a2-0dde-41f0-aa2e-db4875be1ab9","JobIvoire"],
  ["6013ac62-b766-4e42-8269-3aeb83334f1b","JobIvoire"],
  ["28f5f705-6a59-4c3d-b108-2647057c59f0","UNJobNet"],
  ["408a9816-395f-458d-a2ca-41d2e7c43e17","UNJobNet"],
  ["598ba5d7-4719-4ae8-859c-ed670f198538","UNJobNet"]
];

const NEW_IDS = [
  ["8c17a9b3-ee1a-4fe3-960c-b5bddd0ce4bd","Recruteo MG"],
  ["8fd9ce73-7c78-4bd0-ac6c-b9b82877e7a5","Ajirika"],
  ["3bbf940a-6c6e-4d47-8870-0641127098e9","Ajirika"],
  ["b73aace3-3f26-4149-8a14-0f41f2da7cd9","Ajirika"],
  ["8a36e052-9bfd-4207-8b31-5f132493319c","Ajirika"],
  ["46fb5f62-df47-4e75-996e-d8ca54f5c5d2","Ajirika"],
  ["601ddfa2-6370-47a7-bc0d-75a9e6fd0a0a","Ajirika"],
  ["526d9a7e-a06e-4c4b-9f41-be7983723102","Ajirika"],
  ["4dcc2325-77b8-45bd-b969-80479dd5215c","Ajirika"],
  ["27561078-f808-4acf-900c-ef669bc6fc78","Ajirika"],
  ["785d66a8-87ec-4d64-959a-62c1118ef2f9","Ajirika"],
  ["292fb72b-bf9d-4b22-b2e6-e0a35cd534d9","Ajirika"],
  ["598c122a-ec83-45d2-b632-982dae61ea8d","Ajirika"],
  ["e64bdc95-8c64-437b-a845-612f6fec43cf","ONAPE"],
  ["de40f9f7-c81b-4053-a3a9-914e08555830","ONAPE"],
  ["6281be00-6e57-4f99-9c80-840e40c9f809","ONAPE"],
  ["306ac0e9-67b8-4adb-aa39-8b43012efaae","JobIvoire"],
  ["57362ecb-8164-493c-8964-314c60af96c2","JobIvoire"],
  ["1c90a3dd-72f6-44ee-913c-ecca7e0cf1f6","JobIvoire"],
  ["4f6b6b65-0269-48e8-861d-25cb876e846d","JobIvoire"]
];

await fs.mkdir("artifacts", {recursive:true});

const browser = await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const report = {total:IDS.length, apiFailures:[], uiFailures:[], captures:[]};

for (const [id,label] of IDS) {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  try {
    const response = await page.goto(BASE+"/jobs/"+id+"?source=discovery",{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForLoadState("networkidle",{timeout:5000}).catch(()=>{});
    if (!response || !response.ok()) throw new Error("HTTP "+(response?.status()??"unknown"));
    const state = await page.locator("main").innerText();
    if (state.includes("Offre indisponible")) throw new Error("fiche indisponible");
    const title = await page.locator("h1").first().innerText();
    if (!title.trim()) throw new Error("titre vide");
    const sections = await page.locator("section h2").allInnerTexts();
    if (new Set(sections).size !== sections.length) throw new Error("doublon de section: "+sections.join(" | "));
    const expectedOrder=["Description","Missions","Profil recherché","Expérience","Formation","Compétences","Qualités / Soft skills","Avantages","Candidature"];
    const indexes=expectedOrder.map(name=>sections.indexOf(name)).filter(index=>index>=0);
    if(indexes.some((v,i)=>i>0 && v<=indexes[i-1])) throw new Error("ordre canonique invalide: "+sections.join(" | "));
    const empty = await page.locator("section").evaluateAll(nodes => nodes.filter(n => {
      const h=n.querySelector("h2"); if(!h) return false;
      const body=(n.textContent||"").replace(h.textContent||"","").trim();
      return !body;
    }).length);
    if (empty) throw new Error("bloc vide");
    const html = await page.locator("main").innerHTML();
    if (/<(?:script|style)[^>]*>/i.test(html)) throw new Error("HTML parasite dans le main");
    if (/(?:&#x?[0-9a-f]+;?|&(amp|apos|quot|lt|gt|nbsp|ndash|mdash|hellip|bull|middot|lsquo|rsquo|ldquo|rdquo|laquo|raquo|copy|reg|trade|oelig|szlig|agrave|acirc|auml|ccedil|egrave|eacute|ecirc|euml|icirc|iuml|ocirc|ouml|ugrave|ucirc|uuml|ntilde|yacute|euro|pound|yen|cent|times|divide|minus|plusmn|deg|micro|para);?)/i.test(state)) throw new Error("entité HTML visible");
    if (/(?:Ã(?:©|¨|ª|®|´|¶|¼|§|‰|€)|Â(?:°|·| )|â(?:€™|€œ|€�|€“|€“|€”|€¦|‚¬)|ðŸ)/.test(state)) throw new Error("mojibake visible");
    await fs.writeFile("artifacts/"+id+"-desktop.json",JSON.stringify({id,label,title,sections},null,2));
  } catch (e) {
    report.uiFailures.push({id,label,error:String(e)});
  } finally {
    await context.close();
  }
}

const captures = [
  ["323d5e2b-2275-4b57-8b8e-2e18afd0e786","ORIS"],
  ["c65b68b4-a790-445a-a508-058b912d41a1","EducAid"],
  ["0a357696-0c82-4e5c-84d3-d13a5b0227a8","ARCHIPEL"],
  ["f72b560c-5658-40b2-8121-b304cf9ff8e6","SGS"]
];
for (const [id,label] of captures) {
  for (const [kind,options] of [
    ["desktop",{viewport:{width:1440,height:1000}}],
    ["mobile",{...{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]
  ]) {
    const context=await browser.newContext(options);
    const page=await context.newPage();
    try {
      await page.goto(BASE+"/jobs/"+id+"?source=discovery",{waitUntil:"networkidle",timeout:30000});
      await page.screenshot({path:"artifacts/"+label.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+kind+".png",fullPage:true});
      report.captures.push({id,label,kind});
    } catch(e) {
      report.uiFailures.push({id,label,kind,error:String(e)});
    } finally {
      await context.close();
    }
  }
}

for (const [id,label] of NEW_IDS) {
  for (const [kind,options] of [
    ["desktop",{viewport:{width:1440,height:1000}}],
    ["mobile",{viewport:{width:390,height:844,isMobile:true,hasTouch:true}}]
  ]) {
    const context=await browser.newContext(options);
    const page=await context.newPage();
    try {
      const response=await page.goto(BASE+"/jobs/"+id+"?source=discovery",{waitUntil:"networkidle",timeout:30000});
      if(!response || !response.ok()) throw new Error("HTTP "+(response?.status()??"unknown"));
      const state=await page.locator("main").innerText();
      if(state.includes("Offre indisponible")) throw new Error("fiche indisponible");
      if(/(?:&#x?[0-9a-f]+;?|&(amp|apos|quot|lt|gt|nbsp|ndash|mdash|hellip|bull|middot|lsquo|rsquo|ldquo|rdquo|laquo|raquo|copy|reg|trade|oelig|szlig|agrave|acirc|auml|ccedil|egrave|eacute|ecirc|euml|icirc|iuml|ocirc|ouml|ugrave|ucirc|uuml|ntilde|yacute|euro|pound|yen|cent|times|divide|minus|plusmn|deg|micro|para);?)/i.test(state)) throw new Error("entité HTML visible");
      const title=await page.locator("h1").first().innerText();
      if(!title.trim()) throw new Error("titre vide");
      await page.screenshot({path:"artifacts/new20-"+id+"-"+kind+".png",fullPage:true});
      report.captures.push({id,label,kind,lot:"new20"});
    } catch(e) {
      report.uiFailures.push({id,label,kind,lot:"new20",error:String(e)});
    } finally {
      await context.close();
    }
  }
}

await fs.writeFile("artifacts/offer-blocks-playwright.json",JSON.stringify(report,null,2));
await browser.close();
if (report.apiFailures.length || report.uiFailures.length || report.captures.length !== 8) process.exit(1);
