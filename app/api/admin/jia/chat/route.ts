import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildCEOIntelligence} from "@/lib/ceoIntelligence";
import {remember,reflect} from "@/lib/jia/cognitive";
import {publishTraceEvent} from "@/lib/jia/eventBus";
import {runUnifiedCognitiveCycle} from "@/lib/jia/runtime";

export const runtime="nodejs";
export const dynamic="force-dynamic";
// Production build checkpoint: CEO Copilot route is validated through CI before deployment.

async function getAdmin(req:NextRequest){
  const auth=await getAuthUser(req);
  if(!auth)return null;
  const sb=adminClient();
  const user=await ensureUser(sb,auth);
  if(String(user.role)!=="ADMIN")return null;
  return {auth,sb,user};
}

export async function GET(req:NextRequest){
  try{
    const admin=await getAdmin(req);
    if(!admin)return NextResponse.json({message:"Accès CEO réservé à l’administrateur."},{status:403});
    const conversationId=new URL(req.url).searchParams.get("conversationId");
    if(!conversationId)return NextResponse.json({conversation:null,messages:[]});
    const {data:conversation,error:conversationError}=await admin.sb.from("JiaCEOConversation").select("id,title,createdAt,updatedAt").eq("id",conversationId).eq("adminUserId",admin.user.id).maybeSingle();
    if(conversationError)throw new Error(conversationError.message);
    if(!conversation)return NextResponse.json({message:"Conversation introuvable."},{status:404});
    const {data:messages,error}=await admin.sb.from("JiaCEOMessage").select("id,role,content,metadata,createdAt").eq("conversationId",conversationId).order("createdAt",{ascending:true}).limit(100);
    if(error)throw new Error(error.message);
    return NextResponse.json({conversation,messages:messages||[]});
  }catch(e){
    return NextResponse.json({message:e instanceof Error?e.message:"Impossible de charger J’IA."},{status:500});
  }
}

export async function POST(req:NextRequest){
  try{
    const admin=await getAdmin(req);
    if(!admin)return NextResponse.json({message:"Accès CEO réservé à l’administrateur."},{status:403});
    const body=await req.json().catch(()=>({}));
    const message=String(body.message||"").trim();
    if(!message)return NextResponse.json({message:"Message requis."},{status:400});
    let conversationId=typeof body.conversationId==="string"&&body.conversationId?body.conversationId:null;
    if(conversationId){
      const {data:existing,error}=await admin.sb.from("JiaCEOConversation").select("id").eq("id",conversationId).eq("adminUserId",admin.user.id).maybeSingle();
      if(error)throw new Error(error.message);
      if(!existing)return NextResponse.json({message:"Conversation introuvable."},{status:404});
    }else{
      const {data:newConversation,error}=await admin.sb.from("JiaCEOConversation").insert({adminUserId:admin.user.id,title:message.slice(0,80)}).select("id").single();
      if(error)throw new Error(error.message);
      conversationId=newConversation.id;
    }

    const {data:history,error:historyError}=await admin.sb.from("JiaCEOMessage").select("role,content,createdAt").eq("conversationId",conversationId).order("createdAt",{ascending:false}).limit(20);
    if(historyError)throw new Error(historyError.message);
    const {data:allKnowledge,error:knowledgeError}=await admin.sb.from("JiaEnterpriseMemory").select("domain,title,content,source_ref,sensitivity").eq("active",true).order("updatedAt",{ascending:false}).limit(200);
    if(knowledgeError)throw new Error(knowledgeError.message);
    const terms=message.toLowerCase().split(/\W+/).filter((x:string)=>x.length>3).slice(0,20);
    const knowledge=(allKnowledge||[]).map((x:any)=>{const hay=(String(x.title||"")+" "+String(x.domain||"")+" "+String(x.content||"")).toLowerCase();const score=terms.reduce((n:number,t:string)=>n+(hay.includes(t)?1:0),0);return {...x,_score:score};}).filter((x:any)=>x._score>0).sort((a:any,b:any)=>b._score-a._score).slice(0,30).map(({_score,...x}:any)=>x);
    const ceoSnapshot=await buildCEOIntelligence(admin.sb);
    const cognitive=await runUnifiedCognitiveCycle(admin.sb,{userId:String(admin.user.id),ecosystem:"ADMIN",scope:"ADMIN",ceoSnapshot,action:"CEO_CHAT",message});
    const {error:insertUserError}=await admin.sb.from("JiaCEOMessage").insert({conversationId,role:"user",content:message});
    if(insertUserError)throw new Error(insertUserError.message);

    const token=req.headers.get("authorization")||"";
    const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
    if(!supabaseUrl)throw new Error("Supabase URL serveur non configurée.");
    const aiResponse=await fetch(`${supabaseUrl}/functions/v1/ai-core`,{
      method:"POST",
      headers:{"content-type":"application/json",authorization:token},
      body:JSON.stringify({
        operation:"CEO_CHAT",
        priority:"QUALITY",
        input:{message},
        context:{
          enterpriseKnowledge:knowledge||[],
          conversationHistory:(history||[]).reverse(),
          adminRole:"ADMIN",
          ceoSnapshot,
          cognitiveCycle:cognitive
        }
      }),
      signal:AbortSignal.timeout(45000)
    });
    const aiBody=await aiResponse.json().catch(()=>({}));
    if(!aiResponse.ok)throw new Error(aiBody.message||"J’IA est momentanément indisponible.");
    const output=aiBody.output||{};
    const reply=typeof output.reply==="string"?output.reply:(typeof output.text==="string"?output.text:"J’IA n’a pas produit de réponse exploitable.");
    const metadata:Record<string,any>={provider:aiBody.provider||null,model:aiBody.model||null,confidence:output.confidence||null,sources:output.sources||[],webResearchUsed:Array.isArray(output.sources)&&output.sources.some((x:any)=>typeof x?.url==="string"&&x.url.length>0),keyPoints:output.keyPoints||[],suggestedActions:output.suggestedActions||[]};
    const observationTrace=await publishTraceEvent(admin.sb,{
      userId:String(admin.user.id),type:"JIA_CEO_OBSERVATION",ecosystem:"ADMIN",source:"CEO_CHAT",
      correlationId:String(conversationId),payload:{messageLength:message.length}
    },{
      stage:"OBSERVATION",title:"CEO Copilot — observation",content:message,confidence:"HIGH",
      evidence:[],metadata:{conversationId}
    });
    const recommendationTrace=await publishTraceEvent(admin.sb,{
      userId:String(admin.user.id),type:"JIA_CEO_RECOMMENDATION",ecosystem:"ADMIN",source:"CEO_CHAT",
      correlationId:String(conversationId),payload:{suggestedActions:Array.isArray(output.suggestedActions)?output.suggestedActions.length:0}
    },{
      stage:"RECOMMENDATION",title:"CEO Copilot — recommandation",content:reply,
      confidence:output.confidence||"LOW",evidence:output.sources||[],
      status:Array.isArray(output.suggestedActions)&&output.suggestedActions.length?"PENDING_APPROVAL":"RECORDED",
      metadata:{conversationId,webResearchUsed:metadata.webResearchUsed,autoPromoteToMemory:false}
    });
    metadata.traceId=recommendationTrace.trace?.id||observationTrace.trace?.id||null;
    const {data:saved,error:savedError}=await admin.sb.from("JiaCEOMessage").insert({conversationId,role:"assistant",content:reply,metadata}).select("id,role,content,metadata,createdAt").single();
    if(savedError)throw new Error(savedError.message);
    await admin.sb.from("JiaCEOConversation").update({updatedAt:new Date().toISOString()}).eq("id",conversationId).eq("adminUserId",admin.user.id);
    await publishTraceEvent(admin.sb,{
      userId:String(admin.user.id),type:"JIA_CEO_CHAT",ecosystem:"ADMIN",source:"CEO_CHAT",
      correlationId:String(conversationId),payload:{messageLength:message.length,suggestedActions:Array.isArray(output.suggestedActions)?output.suggestedActions.length:0}
    },{
      stage:"RECOMMENDATION",title:"CEO Copilot — échange cognitif",
      content:reply,confidence:typeof output.confidence==="string"?output.confidence:"LOW",
      evidence:output.sources||[],metadata:{conversationId,webResearchUsed:metadata.webResearchUsed,autoPromoteToMemory:false}
    });
    await remember({
      userId:String(admin.user.id),type:"WORKING",
      content:{kind:"CEO_CHAT_CONTEXT",conversationId,userMessage:message,assistantReply:reply,suggestedActions:output.suggestedActions||[]},
      source:"CEO_CHAT",confidence:typeof output.confidence==="string"&&output.confidence==="HIGH"?0.9:0.65,
      importance:0.6,relevance:0.9,futureUtility:0.8,
      contradictionKey:"ceo-chat:"+conversationId
    });
    if(Array.isArray(output.suggestedActions)&&output.suggestedActions.length){
      await reflect({
        userId:String(admin.user.id),triggerType:"CEO_RECOMMENDATION",
        expectation:{conversationId,message},result:{suggestedActions:output.suggestedActions},
        error:{autoExecution:false},learning:{policy:"HUMAN_APPROVAL_REQUIRED"},
        nextStrategy:{reviewActions:true,autoPromoteToCanonicalMemory:false}
      });
    }
    await admin.sb.from("CEOAuditLog").insert({adminUserId:admin.user.id,action:"CEO_CHAT",endpoint:"/api/admin/jia/chat",metadata:{conversationId,provider:aiBody.provider||null,model:aiBody.model||null}});
    return NextResponse.json({conversationId,message:saved,cognitive});
  }catch(e){
    return NextResponse.json({message:e instanceof Error?e.message:"J’IA est momentanément indisponible."},{status:500});
  }
}
