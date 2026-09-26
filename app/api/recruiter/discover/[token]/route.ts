import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
import { calculateExplainableMatch } from "@/lib/opportunityAggregator";

function years(rows:any[]){const starts=rows.map(x=>new Date(x.startDate).getTime()).filter(Number.isFinite);if(!starts.length)return 0;return Math.max(0,Math.floor((Date.now()-Math.min(...starts))/(1000*60*60*24*365)));}

export async function GET(_request:NextRequest,{params}:{params:Promise<{token:string}>}) {
 try{
  const {token}=await params;const db=adminClient();
  const {data:share}=await db.from("CVShare").select("*").eq("token",token).maybeSingle();
  if(!share||share.revokedAt||(share.expiresAt&&new Date(share.expiresAt).getTime()<Date.now())) return NextResponse.json({message:"Partage indisponible."},{status:404});
  let job:any=null;
  if(share.jobId){
   if(share.source==="recruiter"){const r=await db.from("RecruiterJob").select("id,title,companyName,description,location,contract,remoteMode,minExperienceYears,sector,tags").eq("id",share.jobId).maybeSingle();job=r.data;}
   else {const r=await db.from("Job").select("id,title,description,location,contractType,remoteMode,minExperienceYears,aiSector,aiSkills,companyId").eq("id",share.jobId).maybeSingle();job=r.data?{...r.data,sector:r.data.aiSector,tags:r.data.aiSkills}:null;}
  }
  if(!job) return NextResponse.json({share:{jobTitle:share.jobTitleSnapshot,companyName:share.companyNameSnapshot},job:null,talents:[]});
  const {data:profiles}=await db.from("Profile").select("userId,firstName,lastName,headline,summary,location,targetRoles,preferredSectors,targetCities,contractPreferences,remotePreference,publicDiscoverable").eq("publicDiscoverable",true).neq("userId",share.userId).limit(250);
  const ids=(profiles||[]).map((p:any)=>p.userId);
  const [users,experiences,skills]=await Promise.all([
   ids.length?db.from("User").select("id,firstName,lastName,displayName,profilePhotoUrl").in("id",ids):Promise.resolve({data:[] as any[],error:null}),
   ids.length?db.from("Experience").select("userId,startDate").in("userId",ids):Promise.resolve({data:[] as any[],error:null}),
   ids.length?db.from("Skill").select("userId,name").in("userId",ids):Promise.resolve({data:[] as any[],error:null})
  ]);
  const userBy=new Map((users.data||[]).map((u:any)=>[u.id,u]));const expBy=new Map<string,any[]>();for(const x of experiences.data||[]){const a=expBy.get(x.userId)||[];a.push(x);expBy.set(x.userId,a);}const skillBy=new Map<string,string[]>();for(const x of skills.data||[]){const a=skillBy.get(x.userId)||[];a.push(x.name);skillBy.set(x.userId,a);}
  const ranked=(profiles||[]).map((p:any)=>{const u=userBy.get(p.userId)||{};const e=expBy.get(p.userId)||[];const score=calculateExplainableMatch({targetRoles:p.targetRoles,targetCities:p.targetCities,contractPreferences:p.contractPreferences,remotePreference:p.remotePreference,preferredSectors:p.preferredSectors,skills:skillBy.get(p.userId)||[],experienceYears:years(e)},job);return{id:p.userId,name:[p.firstName,p.lastName].filter(Boolean).join(" ")||u.displayName||"Talent Jobly",headline:p.headline||"Profil professionnel",location:p.location||"",profilePhotoUrl:u.profilePhotoUrl||null,skills:(skillBy.get(p.userId)||[]).slice(0,6),experienceYears:years(e),matchPercent:score};}).sort((a,b)=>b.matchPercent-a.matchPercent);
  const matching=ranked.filter((talent:any)=>talent.matchPercent>=60);
  const talents=ranked.slice(0,12);
  const totalMatches=matching.length;
  return NextResponse.json({share:{jobTitle:share.jobTitleSnapshot,companyName:share.companyNameSnapshot},job,talents,totalMatches});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Impossible de charger les talents."},{status:500});}
}
