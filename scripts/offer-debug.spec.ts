import { test } from "@playwright/test";
import { extractVisibleOfferBlocks } from "../lib/jobOfferBlocks";
import { writeFile } from "node:fs/promises";

test.setTimeout(120000);
test("debug rendered sources", async ({ page }) => {
  const urls = ["https://infosconcourseducation.com/concours-recrutement-camrail-2026-conducteurs-de-draisine/","https://www.jobincamer.com/job/oris-finance-recrute-des-caissieres-et-des-brands-ambassadeurs"];
  let n=0;
  for (const url of urls) {
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    try { await page.waitForLoadState("networkidle",{timeout:8000}); } catch {}
    const html=await page.content();
    const bodyText=await page.locator("body").innerText().catch(()=> "");
    const info=await page.locator("body *").evaluateAll(els=>els.slice(0,300).map((e:any)=>({tag:e.tagName,cls:e.className,id:e.id,text:(e.innerText||"").slice(0,80)})));
    await writeFile("debug-"+n+".html",html);
    await writeFile("debug-"+n+".json",JSON.stringify({url,title:await page.title(),htmlLength:html.length,bodyTextLength:bodyText.length,blocks:extractVisibleOfferBlocks(html),elements:info},null,2));
    n++;
  }
});
