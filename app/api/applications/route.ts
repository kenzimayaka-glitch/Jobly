import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../lib/server-auth";
import { prepareApplication, resolveApplicationContact } from "../../../lib/applicationEngine";
import { getActivePlanCode, isTestUnlimited } from "../../../lib/entitlements";
import { getEntitlements } from "../../../lib/billingCatalog";
import { maybeCreateJiaUpgradeNudge } from "../../../lib/jia/subscriptionNudge";

const MAX_OFFER_AGE_DAYS = 60;
type ApplicationRow = { id:string; userId:string; jobId:string|null; recruiterJobId:string|null; status:string; proofUrl:string|null; viewedAt:string|null; interviewAt:string|null; statusSource:string; createdAt:string; updatedAt:string };
function statusLabel(status:string){switch(status){case "DISCOVERED":return "Brouillon";case "PREPARED":return "Préparée";case "USER_REVIEW":return "Prête à envoyer";case "SUBMITTING":return "Envoi en cours";case "SUBMITTED":return "Candidature envoyée";case "ACKNOWLEDGED":return "Vue";case "INTERVIEW":return "Entretien";case "OFFER":return "Acceptée";case "REJECTED":return "Refusée";case "WITHDRAWN":return "Retirée";default:return status;}}
function addMonths(date:Date, months:number):Date { const copy=new Date(date); const originalDay=copy.getDate(); copy.setDate(1); copy.setMonth(copy.getMonth()+months); const lastDay=new Date(copy.getFullYear(),copy.getMonth()+1,0).getDate(); copy.setDate(Math.min(originalDay,lastDay)); return copy; }
function isFresh(publishedAt:string|null|undefined,deadline:string|null|undefined,createdAt:string){if(deadline)return new Date(deadline).getTime()>=Date.now();const base=new Date(publishedAt||createdAt);return Number.isFinite(base.getTime())&&Date.now()<=addMonths(base,2).getTime()&&Date.now()-base.getTime()<=MAX_OFFER_AGE_DAYS*24*60*60*1000;}
function isOpen(deadline:string|null|undefined){return !deadline||new Date(deadline).getTime()>=Date.now();}

export async function GET(request:NextRequest){try{const authUser=await getAuthUser(request);if(!authUser)return NextResponse.json({message:"Session requise."},{status:401});const supabase=adminClient();const user=await ensureUser(supabase,authUser);const {data:apps,error}=await supabase.from("Application").select("*").eq("userId",user.id).order("updatedAt",{ascending:false});if(error)throw new Error(error.message);const applications=(apps as ApplicationRow[])||[];const jobIds=applications.map(a=>a.jobId).filter(Boolean) as string[];const recruiterJobIds=applications.map(a=>a.recruiterJobId).filter(Boolean) as string[];const [jobsRes,recruiterJobsRes]=await Promise.all([jobIds.length?supabase.from("Job").select("id,title,location,contractType,remoteMode,companyId").in("id",jobIds):Promise.resolve({data:[],error:null}),recruiterJobIds.length?supabase.from("RecruiterJob").select("id,title,location,contract,remoteMode,companyName").in("id",recruiterJobIds):Promise.resolve({data:[],error:null})]);if(jobsRes.error)throw new Error(jobsRes.error.message);if(recruiterJobsRes.error)throw new Error(recruiterJobsRes.error.message);const companyIds=Array.from(new Set((jobsRes.data||[]).map((j:any)=>j.companyId).filter(Boolean)));const companiesRes=companyIds.length?await supabase.from("Company").select("id,name,logoUrl,description,website").in("id",companyIds):{data:[],error:null};if(companiesRes.error)throw new Error(companiesRes.error.message);const jobsById=new Map((jobsRes.data||[]).map((j:any)=>[j.id,j]));const recruiterJobsById=new Map((recruiterJobsRes.data||[]).map((j:any)=>[j.id,j]));const companiesById=new Map((companiesRes.data||[]).map((c:any)=>[c.id,c]));const results=applications.map(app=>{const isDiscovery=!!app.jobId;const job=isDiscovery?jobsById.get(app.jobId as string):recruiterJobsById.get(app.recruiterJobId as string);const company=isDiscovery&&job?.companyId?companiesById.get(job.companyId):null;return{id:app.id,source:isDiscovery?"discovery":"recruiter",jobId:app.jobId,recruiterJobId:app.recruiterJobId,status:app.status,statusLabel:statusLabel(app.status),statusSource:app.statusSource,proofUrl:app.proofUrl,viewedAt:app.viewedAt,interviewAt:app.interviewAt,createdAt:app.createdAt,updatedAt:app.updatedAt,job:job?{title:job.title,location:job.location,contractType:job.contract,remoteMode:job.remoteMode,companyName:isDiscovery?company?.name??null:job.companyName}:null};});const counters={total:results.length,brouillons:results.filter(a=>a.status==="DISCOVERED").length,pretes:results.filter(a=>["PREPARED","USER_REVIEW"].includes(a.status)).length,envoiEnCours:results.filter(a=>a.status==="SUBMITTING").length,envoyees:results.filter(a=>["SUBMITTED","ACKNOWLEDGED","INTERVIEW","OFFER","REJECTED","WITHDRAWN"].includes(a.status)).length,vues:results.filter(a=>["ACKNOWLEDGED","INTERVIEW","OFFER","REJECTED"].includes(a.status)).length,entretien:results.filter(a=>a.status==="INTERVIEW").length};return NextResponse.json({applications:results,counters});}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Impossible de charger les candidatures."},{status:500});}}

export async function POST(request:NextRequest){try{const authUser=await getAuthUser(request);if(!authUser)return NextResponse.json({message:"Session requise."},{status:401});const supabase=adminClient();const user=await ensureUser(supabase,authUser);const body=await request.json();const existingApplicationId=typeof body.applicationId==="string"?body.applicationId.trim():null;const letterOverride=typeof body.letterText==="string"&&body.letterText.trim()?body.letterText.trim().slice(0,30000):null;const source=body.source==="recruiter"?"recruiter":body.source==="discovery"?"discovery":null;const targetId=typeof body.jobId==="string"?body.jobId.trim():"";if(!source||!targetId)return NextResponse.json({message:"Offre invalide (source et identifiant requis)."},{status:400});
 let offer:any=null;
 if(source==="discovery"){
  const {data,error}=await supabase.from("Job").select("id,title,description,isActive,applicationReady,applicationProfile,createdAt,sourcePublishedAt,deadline,source,sourceUrl,companyId").eq("id",targetId).maybeSingle();if(error)throw new Error(error.message);offer=data;
  if(!offer||!offer.isActive)return NextResponse.json({message:"Cette offre n'est plus active."},{status:410});
  if(!offer.applicationReady)return NextResponse.json({message:"J'IA ne peut pas encore candidater à cette offre."},{status:422});
  if(!isFresh(offer.sourcePublishedAt,offer.deadline,offer.createdAt))return NextResponse.json({message:"Cette offre n'est plus diffusée par Jobly."},{status:410});
  if(!isOpen(offer.deadline))return NextResponse.json({message:"La date limite de candidature est dépassée."},{status:410});
 }else{
  const {data,error}=await supabase.from("RecruiterJob").select("id,title,description,companyName,status,applicationReady,applicationProfile,createdAt").eq("id",targetId).maybeSingle();if(error)throw new Error(error.message);offer=data;
  if(!offer||offer.status!=="published")return NextResponse.json({message:"Cette offre Jobly n'est plus publiée."},{status:410});
  if(!offer.applicationReady)return NextResponse.json({message:"J'IA ne peut pas encore candidater à cette offre."},{status:422});
  if(!isFresh(null,null,offer.createdAt))return NextResponse.json({message:"Cette offre n'est plus diffusée par Jobly."},{status:410});
 }
 if (existingApplicationId) {
   const { data: existingApplication, error: existingError } = await supabase.from("Application")
     .select("id,status,jobId,recruiterJobId")
     .eq("id", existingApplicationId)
     .eq("userId", user.id)
     .maybeSingle();
   if (existingError) throw new Error(existingError.message);
   if (!existingApplication) return NextResponse.json({message:"Brouillon de candidature introuvable."},{status:404});
   const sameOffer = source === "discovery"
     ? existingApplication.jobId === targetId
     : existingApplication.recruiterJobId === targetId;
   if (!sameOffer || !["USER_REVIEW","PREPARED"].includes(String(existingApplication.status))) {
     return NextResponse.json({message:"Ce brouillon ne peut plus être modifié pour cette offre."},{status:409});
   }
 }
 const company=source==="discovery"&&offer.companyId?(await supabase.from("Company").select("name").eq("id",offer.companyId).maybeSingle()).data?.name||"l'entreprise":offer.companyName||"l'entreprise";
 const applicationContact=resolveApplicationContact(offer.applicationProfile||{},offer.description||"");
 const applicationLink=String((offer.applicationProfile||{}).applicationUrl||(offer.applicationProfile||{}).applyUrl||(offer.applicationProfile||{}).url||"").trim();
 if(!applicationContact.email&&!applicationContact.phone&&!applicationLink){
   return NextResponse.json({message:"Aucun canal de candidature vérifiable n'est indiqué dans l'offre.",code:"APPLICATION_CONTACT_MISSING"},{status:422});
 }
 const [profileRes,experiencesRes,skillsRes,educationRes]=await Promise.all([supabase.from("Profile").select("firstName,lastName,headline,summary,experienceSummary,educationSummary,phone,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors,location").eq("userId",user.id).maybeSingle(),supabase.from("Experience").select("company,title,startDate,endDate,description,provenance").eq("userId",user.id),supabase.from("Skill").select("name,level,provenance").eq("userId",user.id),supabase.from("Education").select("institution,degree,field,startDate,endDate,provenance").eq("userId",user.id)]);if(profileRes.error)throw new Error(profileRes.error.message);if(experiencesRes.error)throw new Error(experiencesRes.error.message);if(skillsRes.error)throw new Error(skillsRes.error.message);if(educationRes.error)throw new Error(educationRes.error.message);
 const hasCvProfileData = Boolean(
   profileRes.data?.summary?.trim() ||
   profileRes.data?.headline?.trim() ||
   profileRes.data?.experienceSummary?.trim() ||
   profileRes.data?.educationSummary?.trim() ||
   (experiencesRes.data||[]).length ||
   (skillsRes.data||[]).length ||
   (educationRes.data||[]).length
 );
 if (!hasCvProfileData) {
   return NextResponse.json({
     message:"Votre CV/profil professionnel est incomplet. Renseignez au moins votre résumé, une expérience, une compétence ou une formation avant de postuler par email.",
     code:"CV_PROFILE_MISSING",
     redirect:"/cv",
   },{status:422});
 }
 const planCode=await getActivePlanCode(supabase,user.id,"TALENT");
 const quotaLimit=getEntitlements(planCode).applicationsPerWeek;
 const unlimited=isTestUnlimited();
 const effectiveQuotaLimit=unlimited?2147483647:quotaLimit;
 const cvPreparationMode = ["NORMAL","ATS","IMPROVE","ATS_IMPROVE"].includes(String(body.cvPreparationMode||""))
   ? String(body.cvPreparationMode) as "NORMAL"|"ATS"|"IMPROVE"|"ATS_IMPROVE"
   : "ATS";
 const applicationId=existingApplicationId||newId();
 const prepared=await prepareApplication(request,{jobTitle:offer.title,jobDescription:offer.description,company,applicationProfile:offer.applicationProfile||{},profile:profileRes.data||{},experiences:experiencesRes.data||[],skills:skillsRes.data||[],education:educationRes.data||[],letterOverride,skipAi:Boolean(letterOverride)||Boolean(body.skipApplicationAi),cvPreparationMode});
 const readinessScoreAtApply = Number.isFinite(Number(body.readinessScoreAtApply)) ? Math.max(0, Math.min(100, Number(body.readinessScoreAtApply))) : null;
 const locale = typeof body.locale === "string" && body.locale.trim() ? body.locale.trim().slice(0,10) : "fr";
 let application:any=null;
 if (existingApplicationId) {
   const {data:updated,error:updateError}=await supabase.from("Application").update({
     letterText:prepared.letter,
     tailoredCvText:prepared.tailoredCvText,
     sourceType:prepared.channel.channel,
     readinessScoreAtApply:readinessScoreAtApply,
     atsScoreAtApply:null,
     locale,
     updatedAt:new Date().toISOString(),
   }).eq("id",existingApplicationId).eq("userId",user.id).in("status",["USER_REVIEW","PREPARED"]).select("id,status,jobId,recruiterJobId,sourceType").maybeSingle();
   if(updateError)throw new Error(updateError.message);
   if(!updated) return NextResponse.json({message:"Ce brouillon a été modifié ou envoyé ailleurs. Recharge tes candidatures."},{status:409});
   application=updated;
 } else {
   const status="USER_REVIEW";
   const {data,error}=await supabase.rpc("create_application_with_quota",{p_user_id:user.id,p_weekly_limit:effectiveQuotaLimit,p_application:{id:applicationId,userId:user.id,jobId:source==="discovery"?targetId:null,recruiterJobId:source==="recruiter"?targetId:null,language:"fr",status,letterText:prepared.letter,tailoredCvText:prepared.tailoredCvText,submittedAt:null,proofUrl:null,statusSource:"CANDIDATE",officialListingConsent:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sourceType:prepared.channel.channel,readinessScoreAtApply,atsScoreAtApply:null,locale}});
   application=data as {id:string}|null;
   if(error){if(error.code==="P0001"&&(error.message.includes("APPLICATION_QUOTA_EXCEEDED")||error.message.includes("QUOTA_EXCEEDED"))){const upgradeSuggestion=await maybeCreateJiaUpgradeNudge(supabase,user.id,planCode,"APPLICATION_QUOTA",`La candidature demandée dépasse le quota hebdomadaire inclus dans ta formule.`,`Augmenter le nombre de candidatures que JOBLY peut préparer pour toi chaque semaine`,planCode==="FREE"?"START":planCode==="START"?"PREMIUM":"PRO");return NextResponse.json({message:"Votre quota hebdomadaire de candidatures est atteint.",code:"QUOTA_EXCEEDED",limit:quotaLimit,upgradeSuggestion},{status:429});}if(error.code==="P0002"||error.message.includes("DUPLICATE_APPLICATION"))return NextResponse.json({message:"Vous avez déjà une candidature pour cette offre."},{status:409});throw new Error(error.message);}
 }
 if(!application?.id)throw new Error("Impossible de créer la candidature.");
 const batchId = typeof body.batchId === "string" ? body.batchId.trim() : null;
 if (batchId) {
   const { data: batch } = await supabase.from("ApplicationBatch").select("id").eq("id", batchId).eq("userId", user.id).maybeSingle();
   if (batch?.id) {
     await supabase.from("Application").update({ batchId, readinessScoreAtApply, atsScoreAtApply: null, locale }).eq("id", application?.id ?? "").eq("userId", user.id);
     await supabase.from("ApplicationBatchItem").update({ generatedSubject: prepared.subject, generatedBody: prepared.letter, status: "READY" }).eq("batchId", batchId).eq("offerId", targetId);
   }
 }
 const coverLetterRequired=/(?:lettre\s+(?:de\s+)?motivation[^.\n]{0,120}(?:obligatoire|requise|exigée|demandée|à\s+joindre|à\s+fournir)|(?:obligatoire|requise|exigée|demandée)[^.\n]{0,80}lettre\s+(?:de\s+)?motivation|cover\s+letter\s+(?:is\s+)?(?:required|mandatory))/i.test(String(offer.description||""));
 return NextResponse.json({application:application,prepared:{channel:prepared.channel,subject:prepared.subject,applicationContact:prepared.applicationContact,letter:prepared.letter,letterRequired:coverLetterRequired,cvPreparationMode,letterSource:letterOverride?"CANDIDATE":"JIA",tailoredCvText:prepared.tailoredCvText,warnings:prepared.warnings,readyForSubmission:prepared.readyForSubmission,requiresUserConnection:prepared.requiresUserConnection,requiresExternalUserAction:prepared.requiresExternalUserAction},applicationProfile:{...(offer.applicationProfile||{}),...(applicationContact.email?{applicationEmail:applicationContact.email}:{}),...(applicationContact.phone?{applicationPhone:applicationContact.phone}:{})}});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Impossible de préparer la candidature."},{status:500});}}
