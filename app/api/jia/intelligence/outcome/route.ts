import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildLearningObservation,type IntelligenceConfidence} from "@/lib/jia/intelligence";

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
    return NextResponse.json({ok:true,outcome:row.data,learning:learned.data,autoPromotedToMemory:false});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Impossible d’enregistrer le résultat."},{status:500});}
}
