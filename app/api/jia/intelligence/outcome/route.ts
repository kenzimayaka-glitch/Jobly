import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildLearningObservation,type IntelligenceConfidence} from "@/lib/jia/intelligence";
import {reflect,remember} from "@/lib/jia/cognitive";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  try{
    const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
    const sb=adminClient(); const user=await ensureUser(sb,auth); const body=await req.json().catch(()=>({}));
    const signalId=String(body.signalId||"").trim(), detail=String(body.detail||"").trim(), success=Boolean(body.success);
    if(!signalId||!detail)return NextResponse.json({message:"signalId et detail sont requis."},{status:400});
    const parent=await sb.from("JiaIntelligenceTrace").select("id,confidence").eq("id",signalId).eq("userId",String(user.id)).maybeSingle();
    if(parent.error)throw new Error(parent.error.message);
    if(!parent.data)return NextResponse.json({message:"Signal introuvable."},{status:404});
    const learning=buildLearningObservation({success,signalId,detail},(parent.data.confidence||"LOW") as IntelligenceConfidence);
    const row=await sb.from("JiaIntelligenceTrace").insert({userId:String(user.id),actorRole:String(user.role),parentId:signalId,stage:"OUTCOME",title:"Résultat observé",content:detail,confidence:learning.confidence,evidence:[{signalId,success}],sourceType:"USER_FEEDBACK",sourceRef:"/api/jia/intelligence/outcome",status:"COMPLETED",metadata:{learningPolicy:"CONTROLLED",autoPromoteToMemory:false}}).select("id,stage,status,confidence,createdAt").single();
    if(row.error)throw new Error(row.error.message);
    const learned=await sb.from("JiaIntelligenceTrace").insert({userId:String(user.id),actorRole:String(user.role),parentId:row.data.id,stage:"LEARNING",title:learning.title,content:learning.content,confidence:learning.confidence,evidence:[{outcomeId:row.data.id,signalId,success}],sourceType:"CONTROLLED_LEARNING",sourceRef:"/api/jia/intelligence/outcome",status:"RECORDED",metadata:learning.metadata}).select("id,stage,status,confidence,createdAt").single();
    if(learned.error)throw new Error(learned.error.message);
    const reflection=await reflect({
      userId:String(user.id),triggerType:"INTELLIGENCE_OUTCOME",
      expectation:{signalId,parentConfidence:parent.data.confidence},result:{detail,success},
      error:{success},learning:{title:learning.title,content:learning.content},
      nextStrategy:{policy:"CONTROLLED",autoPromoteToCanonicalMemory:false}
    });
    await remember({
      userId:String(user.id),type:"REFLECTIVE",
      content:{kind:"INTELLIGENCE_LEARNING",signalId,success,detail,learning:learning.content},
      source:"USER_FEEDBACK",confidence:learning.confidence==="HIGH"?0.9:learning.confidence==="MEDIUM"?0.65:0.4,
      importance:0.7,relevance:0.8,futureUtility:0.85,
      contradictionKey:"intelligence-learning:"+signalId
    });
    return NextResponse.json({ok:true,outcome:row.data,learning:learned.data,reflection,autoPromotedToMemory:false});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Impossible d’enregistrer le résultat."},{status:500});}
}
