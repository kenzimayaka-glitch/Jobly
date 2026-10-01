import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "../../../../../lib/server-auth";
import {ENVIRONMENT_PROFILE} from "../../../../../config/environment-profiles";

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const s=adminClient(),u=await ensureUser(s,auth);
  const {data:role}=await s.from("RecruitmentRole").select("id,role").eq("userId",u.id).in("role",["OWNER","HR","DG"]).limit(1).maybeSingle();
  if(!role)return NextResponse.json({message:"Accès recruteur requis."},{status:403});
  const start=new Date();start.setUTCDate(1);start.setUTCHours(0,0,0,0);
  const {data,error}=await s.from("RecruitmentInterviewVideoSession").select("participantMinutes,provider,endedAt").gte("endedAt",start.toISOString());
  if(error)throw new Error(error.message);
  const livekitMinutes=(data||[]).filter((x:any)=>x.provider==="LIVEKIT").reduce((sum:number,x:any)=>sum+Number(x.participantMinutes||0),0);
  const limit=ENVIRONMENT_PROFILE.video.monthlyParticipantMinutes;
  return NextResponse.json({profile:ENVIRONMENT_PROFILE.name,provider:process.env.JOBLY_VIDEO_PROVIDER||"JITSI",usedMinutes:Math.round(livekitMinutes*100)/100,limitMinutes:Number.isFinite(limit)?limit:null,percent:Number.isFinite(limit)?Math.min(100,Math.round(livekitMinutes/limit*10000)/100):0,warn:Number.isFinite(limit)&&livekitMinutes>=limit*0.8,exhausted:Number.isFinite(limit)&&livekitMinutes>=limit});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500})}
}
