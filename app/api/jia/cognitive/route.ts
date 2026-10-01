import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, adminClient, ensureUser } from "@/lib/server-auth";
import { buildCareerTwin, createPrediction, getCognitiveSnapshot, reflect, updateBelief, upsertSelfState, recordPredictionOutcome, upsertWorldEntity, relateWorldEntities } from "@/lib/jia/cognitive";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req: NextRequest) {
  const auth=await getAuthUser(req); if(!auth) return NextResponse.json({message:"Session requise."},{status:401});
  try {
    const sb=adminClient(), user=await ensureUser(sb,auth);
    const kind=req.nextUrl.searchParams.get("kind")||"snapshot";
    if(kind==="career-twin") return NextResponse.json({careerTwin:await buildCareerTwin(user.id)});
    return NextResponse.json(await getCognitiveSnapshot(user.id));
  } catch(e) { return NextResponse.json({message:e instanceof Error?e.message:"Cognitive core indisponible."},{status:500}); }
}

export async function POST(req: NextRequest) {
  const auth=await getAuthUser(req); if(!auth) return NextResponse.json({message:"Session requise."},{status:401});
  try {
    const sb=adminClient(), user=await ensureUser(sb,auth), body=await req.json().catch(()=>({}));
    switch(String(body?.type||"")) {
      case "belief": return NextResponse.json({belief:await updateBelief({userId:user.id,key:String(body.key),belief:String(body.belief),confidence:Number(body.confidence),status:body.status||"UNKNOWN",evidence:Array.isArray(body.evidence)?body.evidence:[],counterEvidence:Array.isArray(body.counterEvidence)?body.counterEvidence:[]})});
      case "prediction": return NextResponse.json({prediction:await createPrediction({userId:user.id,prediction:String(body.prediction),probability:Number(body.probability),horizon:body.horizon,context:body.context||{},expectedAt:body.expectedAt||null})});
      case "prediction-outcome": return NextResponse.json({prediction:await recordPredictionOutcome({userId:user.id,predictionId:String(body.predictionId),outcome:body.outcome||{},probability:Number(body.probability),observed:body.observed===true})});
      case "world-entity": return NextResponse.json({entity:await upsertWorldEntity({userId:user.id,type:String(body.entityType),key:String(body.key),attributes:body.attributes||{},confidence:Number(body.confidence),sources:Array.isArray(body.sources)?body.sources:[]})});
      case "world-relation": return NextResponse.json({relation:await relateWorldEntities({userId:user.id,fromId:String(body.fromId),relation:String(body.relation),toId:String(body.toId),confidence:Number(body.confidence),sources:Array.isArray(body.sources)?body.sources:[]})});
      case "reflection": return NextResponse.json({reflection:await reflect({userId:user.id,triggerType:String(body.triggerType||"manual"),expectation:body.expectation||{},result:body.result||{},error:body.error||{},learning:body.learning||{},nextStrategy:body.nextStrategy||{}})});
      case "self": return NextResponse.json({self:await upsertSelfState(user.id,body.state||{})});
      case "career-twin": return NextResponse.json({careerTwin:await buildCareerTwin(user.id)});
      default: return NextResponse.json({message:"type invalide"},{status:400});
    }
  } catch(e) { return NextResponse.json({message:e instanceof Error?e.message:"Cognitive operation failed."},{status:500}); }
}
