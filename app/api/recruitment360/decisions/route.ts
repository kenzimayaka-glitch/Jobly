import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export async function GET(req: NextRequest) {
  const auth=await getAuthUser(req);
  if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  try{
    const s=adminClient(),u=await ensureUser(s,auth), recruitmentId=req.nextUrl.searchParams.get("recruitmentId"), applicationId=req.nextUrl.searchParams.get("applicationId");
    if(applicationId){
      const {data,error}=await s.from("RecruitmentDecision").select("*,RecruitmentDecisionVote(*)").eq("applicationId",applicationId).maybeSingle();
      if(error)throw new Error(error.message);
      return NextResponse.json({decision:data});
    }
    if(!recruitmentId)return NextResponse.json({message:"recruitmentId requis."},{status:400});
    const {data,error}=await s.rpc("recruitment360_lot6_list_candidates",{p_recruitment_id:recruitmentId,p_actor_user_id:u.id});
    if(error)throw new Error(error.message);
    return NextResponse.json({candidates:data??[]});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500});}
}

export async function POST(req:NextRequest){
  const auth=await getAuthUser(req);
  if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  try{
    const s=adminClient(),u=await ensureUser(s,auth),b=await req.json(),action=b.action??"finalize";
    if(action==="vote"){
      const {data,error}=await s.rpc("recruitment360_lot6_submit_vote",{
        p_application_id:b.applicationId,p_actor_user_id:u.id,p_recommendation:b.recommendation,
        p_score:b.score==null?null:Number(b.score),p_rationale:b.rationale??null,p_interview_id:b.interviewId??null
      });
      if(error)throw new Error(error.message);
      return NextResponse.json({decision:data},{status:201});
    }
    const {data,error}=await s.rpc("recruitment360_lot6_finalize_decision",{
      p_application_id:b.applicationId,p_actor_user_id:u.id,p_outcome:b.outcome,
      p_rationale:b.rationale,p_next_action:b.nextAction??null,
      p_score_total:b.scoreTotal==null?null:Number(b.scoreTotal),
      p_score_breakdown:b.scoreBreakdown??{}
    });
    if(error)throw new Error(error.message);
    const {data:a}=await s.from("Application").select("userId").eq("id",b.applicationId).single();
    if(a?.userId){
      const titles:{[k:string]:string}={OFFER:"Suite de votre candidature",HIRED:"Candidature retenue",REJECTED:"Mise à jour de votre candidature",POOL:"Candidature conservée"};
      await s.from("Notification").insert({userId:a.userId,type:"RECRUITMENT_DECISION",title:titles[b.outcome]??"Décision de recrutement",body:b.outcome==="REJECTED"?"Votre candidature a été clôturée.":b.outcome==="POOL"?"Votre candidature est conservée dans le vivier.":"Votre candidature avance dans le processus.",link:"/career",entityId:data.id,recruitmentId:data.recruitmentId,applicationId:b.applicationId,actionType:"OPEN_DECISION",actionPayload:{decisionId:data.id,outcome:b.outcome}});
    }
    return NextResponse.json({decision:data},{status:201});
  }catch(e){
    const m=e instanceof Error?e.message:"Décision impossible.";
    const status=m==="FORBIDDEN"?403:m.includes("REQUIRED")||m.includes("INVALID")?400:409;
    return NextResponse.json({message:m},{status});
  }
}