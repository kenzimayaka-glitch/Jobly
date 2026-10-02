import type {SupabaseClient} from "@supabase/supabase-js";

export type JiaRecruiterIntelligence={
 generatedAt:string;
 funnel:{publishedJobs:number;applications:number;interviews:number;submitted:number;acknowledged:number;hiredOrClosed:number};
 quality:{averageAts:number|null;averageReadiness:number|null;scoredApplications:number};
 staleApplications:Array<{id:string;jobId:string|null;recruiterJobId:string|null;status:string;ageDays:number}>;
 opportunities:Array<{id:string;title:string;reason:string}>;
 limitations:string[];
};

const activeStatuses=new Set(["SUBMITTED","ACKNOWLEDGED","INTERVIEW","SCREENING","SHORTLISTED"]);
function average(values:number[]){return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;}

export async function buildRecruiterIntelligence(sb:SupabaseClient,recruiterUserId:string):Promise<JiaRecruiterIntelligence>{
 const {data:jobs,error:jobsError}=await sb.from("RecruiterJob").select("id,status,title,updatedAt").eq("recruiterUserId",recruiterUserId);
 if(jobsError)throw new Error(jobsError.message);
 const recruiterJobIds=(jobs||[]).map((j:any)=>String(j.id));
 let applications:any[]=[];
 if(recruiterJobIds.length){
  const result=await sb.from("Application").select("id,status,atsScore,readinessScoreAtApply,createdAt,updatedAt,recruiterJobId,jobId").in("recruiterJobId",recruiterJobIds).order("updatedAt",{ascending:false}).limit(500);
  if(result.error)throw new Error(result.error.message);
  applications=result.data||[];
 }
 const ats=applications.map(a=>Number(a.atsScore)).filter(Number.isFinite);
 const readiness=applications.map(a=>Number(a.readinessScoreAtApply)).filter(Number.isFinite);
 const age=(a:any)=>Math.max(0,(Date.now()-new Date(a.updatedAt||a.createdAt).getTime())/86400000);
 const stale=applications.filter(a=>activeStatuses.has(String(a.status))&&age(a)>=7).slice(0,20).map(a=>({id:String(a.id),jobId:a.jobId?String(a.jobId):null,recruiterJobId:a.recruiterJobId?String(a.recruiterJobId):null,status:String(a.status),ageDays:Math.floor(age(a))}));
 const interviews=applications.filter(a=>String(a.status)==="INTERVIEW").length;
 const submitted=applications.filter(a=>String(a.status)==="SUBMITTED").length;
 const acknowledged=applications.filter(a=>String(a.status)==="ACKNOWLEDGED").length;
 const hiredOrClosed=applications.filter(a=>["HIRED","CLOSED","REJECTED"].includes(String(a.status))).length;
 const opportunities:Array<{id:string;title:string;reason:string}>=[];
 if(stale.length)opportunities.push({id:"recruiter-followups",title:"Traiter les candidatures stagnantes",reason:stale.length+" candidature(s) actives n'ont pas évolué depuis au moins 7 jours."});
 if(ats.length&&average(ats)!==null&&average(ats)!<70)opportunities.push({id:"recruiter-quality",title:"Revoir les critères de présélection",reason:"Le score ATS moyen observé est inférieur à 70."});
 if(!applications.length&&recruiterJobIds.length)opportunities.push({id:"recruiter-activation",title:"Renforcer la diffusion des postes",reason:"Des postes existent mais aucune candidature n'est encore reliée à ces Recruiter Jobs."});
 const limitations:string[]=[];
 if(!recruiterJobIds.length)limitations.push("Aucun Recruiter Job trouvé pour ce compte.");
 if(!applications.length)limitations.push("Aucun historique de candidatures à analyser.");
 if(!ats.length)limitations.push("Aucun score ATS disponible.");
 return{
  generatedAt:new Date().toISOString(),
  funnel:{publishedJobs:(jobs||[]).filter((j:any)=>String(j.status)==="published").length,applications:applications.length,interviews,submitted,acknowledged,hiredOrClosed},
  quality:{averageAts:average(ats),averageReadiness:average(readiness),scoredApplications:ats.length},
  staleApplications:stale,
  opportunities,
  limitations,
 };
}
