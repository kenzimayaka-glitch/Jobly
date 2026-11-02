import { jwtVerify, createRemoteJWKSet } from "npm:jose@6";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveEffectivePublicationDate } from "../_shared/job-freshness.ts";
const JWKS=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const ISSUER="https://token.actions.githubusercontent.com",AUDIENCE="jobly-harvest",REPOSITORY="kenzimayaka-glitch/Jobly";
const MAX_BATCH=40,MAX_ATTEMPTS=3;
const COUNTRY_CODES=new Set(["AO","BF","BI","BJ","BW","CD","CF","CG","CI","CM","CV","DJ","DZ","EG","ER","ET","GA","GH","GM","GN","GQ","GW","KE","KM","LR","LS","LY","MA","MG","ML","MR","MU","MW","MZ","NA","NE","NG","RW","SC","SD","SL","SN","SO","SS","ST","SZ","TD","TG","TN","TZ","UG","ZA","ZM","ZW"]);
const COUNTRY_ALIASES:Record<string,string>={
  ANGOLA:"AO","BURKINA FASO":"BF",BURUNDI:"BI",BENIN:"BJ",BOTSWANA:"BW",
  "REPUBLIQUE DEMOCRATIQUE DU CONGO":"CD","DEMOCRATIC REPUBLIC OF THE CONGO":"CD",
  "REPUBLIQUE CENTRAFRICAINE":"CF",CENTRAFRIQUE:"CF","CENTRAL AFRICAN REPUBLIC":"CF",
  "REPUBLIQUE DU CONGO":"CG",CONGO:"CG","COTE D IVOIRE":"CI",CAMEROUN:"CM",CAMEROON:"CM",
  "CAP VERT":"CV","CAPE VERDE":"CV",DJIBOUTI:"DJ",ALGERIE:"DZ",ALGERIA:"DZ",EGYPTE:"EG",EGYPT:"EG",
  ERYTHREE:"ER",ERITREA:"ER",ETHIOPIE:"ET",ETHIOPIA:"ET",GABON:"GA",GHANA:"GH",GAMBIE:"GM",GAMBIA:"GM",
  GUINEE:"GN",GUINEA:"GN","GUINEE EQUATORIALE":"GQ","EQUATORIAL GUINEA":"GQ","GUINEE BISSAU":"GW",
  "GUINEA BISSAU":"GW",KENYA:"KE",COMORES:"KM",COMOROS:"KM",LIBERIA:"LR",LESOTHO:"LS",LIBYE:"LY",LIBYA:"LY",
  MAROC:"MA",MOROCCO:"MA",MADAGASCAR:"MG",MALI:"ML",MAURITANIE:"MR",MAURITANIA:"MR",MAURICE:"MU",
  MAURITIUS:"MU",MALAWI:"MW",MOZAMBIQUE:"MZ",NAMIBIE:"NA",NAMIBIA:"NA",NIGER:"NE",NIGERIA:"NG",
  RWANDA:"RW",SEYCHELLES:"SC",SOUDAN:"SD",SUDAN:"SD","SIERRA LEONE":"SL",SENEGAL:"SN",SOMALIE:"SO",
  SOMALIA:"SO","SOUDAN DU SUD":"SS","SOUTH SUDAN":"SS","SAO TOME ET PRINCIPE":"ST",ESWATINI:"SZ",
  SWAZILAND:"SZ",TCHAD:"TD",CHAD:"TD",TOGO:"TG",TUNISIE:"TN",TUNISIA:"TN",TANZANIE:"TZ",TANZANIA:"TZ",
  OUGANDA:"UG",UGANDA:"UG","AFRIQUE DU SUD":"ZA","SOUTH AFRICA":"ZA",ZAMBIE:"ZM",ZAMBIA:"ZM",ZIMBABWE:"ZW",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const asDate=(value:unknown):string|null=>{if(!value)return null;const d=new Date(String(value));return Number.isFinite(d.getTime())?d.toISOString():null;};
const clean=(value:unknown,max=30000)=>String(value??"").replace(/\s+/g," ").trim().slice(0,max);
function normalizeCountryCode(value:unknown):string|null{
  const raw=String(value??"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[’']/g," ").replace(/[^A-Z0-9 ]/g," ").replace(/\s+/g," ").trim();
  const code=/^[A-Z]{2}$/.test(raw)?raw:COUNTRY_ALIASES[raw];
  return code&&COUNTRY_CODES.has(code)?code:null;
}
async function authorize(req:Request){
  const h=req.headers.get("authorization")??"";
  if(!h.startsWith("Bearer "))throw new Error("Missing GitHub Actions OIDC token");
  const {payload}=await jwtVerify(h.slice(7),JWKS,{issuer:ISSUER,audience:AUDIENCE});
  if(payload.repository!==REPOSITORY||payload.ref!=="refs/heads/main")throw new Error("Unauthorized repository/ref");
}
async function updateCapture(db:any,id:string,values:Record<string,unknown>){
  const {error}=await db.from("JobHarvestCapture").update({...values,updatedAt:new Date().toISOString()}).eq("id",id);
  if(error)throw new Error(error.message);
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({message:"POST required"},405);
  try{
    await authorize(req);
    const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");
    const key=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!key)throw new Error("No privileged Supabase key configured");
    const db=createClient(Deno.env.get("SUPABASE_URL")!,key);
    const body=await req.json().catch(()=>null);
    const requested=Number(body?.limit??MAX_BATCH);
    const limit=Math.min(Math.max(Number.isFinite(requested)?requested:MAX_BATCH,1),MAX_BATCH);
    const {data:rows,error:selectError}=await db.from("JobHarvestCapture").select("*")
      .in("status",["PENDING","FAILED"]).order("discoveredAt",{ascending:true}).limit(limit);
    if(selectError)throw new Error(selectError.message);
    const counts={created:0,updated:0,expired:0,quarantined:0,failed:0,claimed_elsewhere:0};
    for(const row of rows??[]){
      const now=new Date();
      if(Number(row.attempts??0)>=MAX_ATTEMPTS){
        await updateCapture(db,row.id,{status:"QUARANTINED",rejectionCode:"MAX_PROCESS_ATTEMPTS",
          rejectionReason:"Processing retry ceiling reached.",lastError:"MAX_PROCESS_ATTEMPTS"});
        counts.quarantined++;continue;
      }
      const {data:capture,error:claimError}=await db.from("JobHarvestCapture")
        .update({status:"PROCESSING",attempts:Number(row.attempts??0)+1,updatedAt:now.toISOString()})
        .eq("id",row.id).in("status",["PENDING","FAILED"]).select("*").maybeSingle();
      if(claimError)throw new Error(claimError.message);
      if(!capture){counts.claimed_elsewhere++;continue;}
      try{
        const title=clean(capture.title,300),description=clean(capture.description||capture.extractedText||title,30000);
        const payload=capture.payload??{},applicationProfile=capture.applicationProfile??{};
        const countryCode=normalizeCountryCode(payload.countryCode??applicationProfile.countryCode??payload.country??applicationProfile.country);
        if(!countryCode){
          await updateCapture(db,capture.id,{status:"QUARANTINED",rejectionCode:"COUNTRY_CODE_UNRESOLVED",
            rejectionReason:"No supported African country code could be verified.",lastError:"COUNTRY_CODE_UNRESOLVED",
            processedAt:now.toISOString()});
          counts.quarantined++;continue;
        }
        if(!title||!description||!capture.sourceKey||!capture.sourceUrl||!capture.externalId)throw new Error("TECHNICAL_FIELDS_MISSING");
        let existing:{id:string;createdAt:string}|null=null;
        const byExternalId=await db.from("Job").select("id,createdAt").eq("sourceKey",capture.sourceKey)
          .eq("externalId",capture.externalId).maybeSingle();
        if(byExternalId.error)throw new Error(byExternalId.error.message);
        existing=byExternalId.data;
        if(!existing){
          const bySourceUrl=await db.from("Job").select("id,createdAt").eq("source",capture.sourceKey)
            .eq("sourceUrl",capture.sourceUrl).maybeSingle();
          if(bySourceUrl.error)throw new Error(bySourceUrl.error.message);
          existing=bySourceUrl.data;
        }
        const freshness=resolveEffectivePublicationDate({sourcePublishedAt:asDate(capture.publishedAt),
          firstHarvestAt:asDate(capture.discoveredAt),createdAt:existing?.createdAt??null,
          deadline:asDate(capture.deadline),now:now.toISOString()});
        if(!freshness.effectivePublishedAt){
          await updateCapture(db,capture.id,{status:"QUARANTINED",countryCode,rejectionCode:freshness.rejectionCode,
            rejectionReason:"No reliable source, first-harvest, or Job creation date is available.",
            lastError:freshness.rejectionCode,processedAt:now.toISOString()});
          counts.quarantined++;continue;
        }
        if(!freshness.visible){
          const futurePublication=freshness.rejectionCode==="PUBLICATION_DATE_IN_FUTURE";
          await updateCapture(db,capture.id,{status:futurePublication?"QUARANTINED":"EXPIRED",countryCode,rejectionCode:freshness.rejectionCode,
            rejectionReason:futurePublication?"The source publication date is in the future.":freshness.expiredByDeadline?"The source application deadline has passed.":"The publication date is outside the allowed freshness window.",
            lastError:freshness.rejectionCode,processedAt:now.toISOString()});
          if(futurePublication) counts.quarantined++; else counts.expired++;
          continue;
        }
        const applicationReady=Boolean(applicationProfile.applicationEmail||applicationProfile.applicationPhone||
          applicationProfile.applicationUrl||applicationProfile.applyUrl||applicationProfile.url||payload.applyUrl);
        const language=/\b(the|and|with|for|your|you|experience|skills|apply)\b/i.test(title+" "+description)?"en":"fr";
        const normalizedContent={version:"africa-harvest-v1",title,company:clean(capture.company,180)||null,
          description:[description],location:capture.location??null,skills:[],experienceYears:0,quality:{score:100,warnings:[]}};
        const jobValues={title,description,language,languageOriginal:language,languageRequirements:[],location:capture.location??null,
          contractType:capture.contractType??null,salaryMin:payload.salaryMin??null,salaryMax:payload.salaryMax??null,
          salaryCurrency:payload.salaryCurrency??null,source:capture.sourceKey,sourceUrl:capture.sourceUrl,sourceKey:capture.sourceKey,
          externalId:capture.externalId,contentHash:capture.contentHash??null,sourcePublishedAt:asDate(capture.publishedAt),
          publicationDateEstimated:freshness.publicationDateEstimated,publicationDateSource:freshness.publicationDateSource,
          lastSeenAt:now.toISOString(),deadline:asDate(capture.deadline),isActive:true,remoteMode:capture.remoteMode??"NO",
          minExperienceYears:0,applicationReady,applicationProfile,applicationCheckedAt:now.toISOString(),
          visualUrl:payload.logoUrl??null,visualSource:payload.logoUrl?"COMPANY_LOGO":null,aiProcessed:false,aiFlags:[],aiSkills:[],
          tags:[],opportunityType:"EMPLOI",normalizedContent,normalizedVersion:"africa-harvest-v1",
          normalizedAt:now.toISOString(),qualityStatus:"ok",countryCode,updatedAt:now.toISOString()};
        let jobId:string;
        if(existing?.id){
          const {error}=await db.from("Job").update(jobValues).eq("id",existing.id);
          if(error)throw new Error(error.message);
          jobId=existing.id;counts.updated++;
        }else{
          const {data,error}=await db.from("Job").insert({createdAt:now.toISOString(),...jobValues}).select("id").single();
          if(error)throw new Error(error.message);
          jobId=data.id;counts.created++;
        }
        const {error:pipelineError}=await db.from("JobOfferPipeline").upsert({
          jobId,sourceKey:capture.sourceKey,sourceUrl:capture.sourceUrl,captureMode:capture.captureMode??"unknown",
          countryCode,rawPayload:payload,extractedText:capture.extractedText??null,status:"READY",
          rejectionCode:null,rejectionReason:null,processedAt:now.toISOString(),updatedAt:now.toISOString(),
        },{onConflict:"jobId"});
        if(pipelineError)throw new Error(pipelineError.message);
        await updateCapture(db,capture.id,{status:"PROCESSED",jobId,countryCode,rejectionCode:null,
          rejectionReason:null,lastError:null,processedAt:now.toISOString()});
      }catch(error){
        const reason=error instanceof Error?error.message:"UNKNOWN_PROCESSING_ERROR";
        await updateCapture(db,capture.id,{status:"FAILED",rejectionCode:"PROCESSING_ERROR",rejectionReason:reason,lastError:reason});
        counts.failed++;
      }
    }
    return json({ok:true,selected:rows?.length??0,...counts,processedAt:new Date().toISOString()});
  }catch(error){
    return json({message:error instanceof Error?error.message:String(error)},401);
  }
});
