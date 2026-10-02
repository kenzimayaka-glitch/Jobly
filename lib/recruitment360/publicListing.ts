import { adminClient } from "../server-auth";
import { immutableBlockChecksum, type ListingStage, type ListingTheme, type OfficialListingData } from "./officialListing";

function dossierNumber(applicationId: string) {
  return "JOB-" + applicationId.replace(/-/g, "").slice(-8).toUpperCase();
}

function qualifies(stage: ListingStage, application: any, state: any, shortlist: any, hasTest: boolean, hasInterview: boolean, hasDecision: boolean) {
  const status = String(application?.status || "").toUpperCase();
  const recruitmentStatus = String(application?.recruitment360Status || "").toUpperCase();
  if (["REJECTED", "WITHDRAWN", "RETIRED", "REFUSED", "OFFER_DECLINED"].includes(status)) return false;
  if (["REJECTED", "WITHDRAWN", "RETIRED", "REFUSED", "NON_RETENU"].includes(recruitmentStatus)) return false;
  const stateName = String(state?.currentState || "").toUpperCase();
  const shortlistStatus = String(shortlist?.status || "").toUpperCase();
  if (stage === "CV") return ["SELECTED","RETAINED","SHORTLISTED","CV_SELECTED"].includes(shortlistStatus) || ["RETAINED","SHORTLISTED","CV_SELECTED"].includes(stateName);
  if (stage === "TEST") return hasTest || ["TEST","TEST_SELECTED","TEST_COMPLETED","TEST_PASSED"].includes(stateName);
  if (stage === "INTERVIEW") return hasInterview || ["INTERVIEW","FINALIST","INTERVIEW_SELECTED"].includes(stateName);
  return hasDecision || ["FINALIST","DECISION","OFFER","HIRED"].includes(stateName);
}

export async function loadPublicOfficialListing(token: string): Promise<OfficialListingData> {
  if (!token || token.length < 20 || token.length > 100) throw new Error("PUBLIC_LINK_INVALID");
  const supabase = adminClient();
  const { data: raw, error } = await supabase.rpc("recruitment360_lot11_get_public_listing", { p_token: token.trim() });
  if (error) throw new Error(error.message);
  if (!raw) throw new Error("PUBLIC_LISTING_NOT_FOUND");

  const recruitmentId = String(raw.recruitmentId || "");
  const listing = raw.listing || {};
  const publicLink = raw.publicLink || {};
  const stage = String(publicLink.stage || "CV").toUpperCase() as ListingStage;
  const theme = String(publicLink.theme || "OFFICIAL_CONCOURS").toUpperCase() as ListingTheme;
  const versionId = String(listing.versionId || "");
  if (!recruitmentId || !versionId) throw new Error("PUBLIC_LISTING_INVALID");

  const { data: recruitment } = await supabase.from("Recruitment360").select("recruiterJobId").eq("id", recruitmentId).maybeSingle();
  if (!recruitment?.recruiterJobId) throw new Error("PUBLIC_LISTING_INVALID");

  const [{ data: job }, { data: applications }] = await Promise.all([
    supabase.from("RecruiterJob").select("companyName,location,recruiterUserId").eq("id", recruitment.recruiterJobId).maybeSingle(),
    supabase.from("Application").select("id,userId,status,recruitment360Status,officialListingConsent,officialListingDisplayName").eq("recruiterJobId", recruitment.recruiterJobId),
  ]);
  if (!job) throw new Error("PUBLIC_LISTING_INVALID");

  const apps = applications || [];
  const ids = apps.map((a:any)=>a.id);
  const users = apps.map((a:any)=>a.userId).filter(Boolean);
  const [statesRes, shortlistRes, testsRes, interviewsRes, decisionsRes, profilesRes, errataRes] = await Promise.all([
    ids.length ? supabase.from("RecruitmentApplicationState").select("applicationId,currentState,stepNumber").in("applicationId",ids) : Promise.resolve({data:[],error:null}),
    supabase.from("RecruitmentShortlist").select("applicationId,status").eq("recruitmentId",recruitmentId),
    ids.length ? supabase.from("RecruitmentTestSession").select("applicationId,id,status").in("applicationId",ids) : Promise.resolve({data:[],error:null}),
    ids.length ? supabase.from("RecruitmentInterview").select("applicationId,id,status").in("applicationId",ids) : Promise.resolve({data:[],error:null}),
    ids.length ? supabase.from("RecruitmentDecision").select("applicationId,id,outcome").in("applicationId",ids) : Promise.resolve({data:[],error:null}),
    users.length ? supabase.from("Profile").select("userId,firstName,lastName").in("userId",users) : Promise.resolve({data:[],error:null}),
    supabase.from("RecruitmentListingErratum").select("erratumNumber,summary,details").eq("versionId",versionId).order("erratumNumber",{ascending:true}),
  ]);
  for (const r of [statesRes,shortlistRes,testsRes,interviewsRes,decisionsRes,profilesRes,errataRes]) if(r.error) throw new Error(r.error.message);

  const states=new Map((statesRes.data||[]).map((x:any)=>[x.applicationId,x]));
  const shortlists=new Map((shortlistRes.data||[]).map((x:any)=>[x.applicationId,x]));
  const tests=new Set((testsRes.data||[]).map((x:any)=>x.applicationId));
  const interviews=new Set((interviewsRes.data||[]).map((x:any)=>x.applicationId));
  const decisions=new Set((decisionsRes.data||[]).map((x:any)=>x.applicationId));
  const profiles=new Map((profilesRes.data||[]).map((x:any)=>[String(x.userId),x]));

  const candidates=apps
    .filter((a:any)=>qualifies(stage,a,states.get(a.id),shortlists.get(a.id),tests.has(a.id),interviews.has(a.id),decisions.has(a.id)))
    .map((a:any)=>({
      applicationId:a.id,
      dossierNumber:dossierNumber(a.id),
      firstName:profiles.get(String(a.userId))?.firstName||null,
      lastName:profiles.get(String(a.userId))?.lastName||null,
      displayNameOverride:a.officialListingDisplayName||null,
      consented:Boolean(a.officialListingConsent),
    }))
    .sort((a:any,b:any)=>String(a.consented?a.lastName||"":a.dossierNumber).localeCompare(String(b.consented?b.lastName||"":b.dossierNumber),"fr",{sensitivity:"base"}));

  const publicUrl = String(process.env.JOBLY_PUBLIC_URL || "").replace(/\/$/,"") + "/public/recruitment-listing/" + token.trim();
  const block = raw.joblyBlock || {};
  const canonicalUrl = publicUrl;
  const qrPayload = canonicalUrl;
  const blockChecksum = immutableBlockChecksum(canonicalUrl, qrPayload);
  if (block && block.checksum && block.checksum !== blockChecksum) throw new Error("JOBLY_BLOCK_INTEGRITY_FAILED");

  return {
    recruitmentId,
    versionId,
    versionNumber:Number(listing.versionNumber||1),
    companyName:String(job.companyName||"Organisation"),
    city:job.location||null,
    stage,
    language:"fr",
    theme,
    publicUrl:canonicalUrl,
    qrPayload,
    generatedAt:new Date().toISOString(),
    signerTitle:"La Direction Générale",
    posts:[{title:String(listing.title||"Poste"),candidates}],
    errata:(errataRes.data||[]).map((e:any)=>({number:Number(e.erratumNumber),summary:e.summary,details:e.details})),
  };
}
