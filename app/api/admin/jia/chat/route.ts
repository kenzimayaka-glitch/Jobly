import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildCEOIntelligence} from "@/lib/ceoIntelligence";

export const runtime="nodejs";
export const dynamic="force-dynamic";

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
    const terms=message.toLowerCase().split(/\\W+/).filter((x:string)=>x.length>3).slice(0,20);
    const knowledge=(allKnowledge||[]).map((x:any)=>{const hay=(String(x.title||"")+" "+String(x.domain||"")+" "+String(x.content||"")).toLowerCase();const score=terms.reduce((n:number,t:string)=>n+(hay.includes(t)?1:0),0);return {...x,_score:score};}).filter((x:any)=>x._score>0).sort((a:any,b:any)=>b._score-a._score).slice(0,30).map(({_score,...x}:any)=>x);
    const ceoSnapshot=await buildCEOIntelligence(admin.sb);
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
          ceoSnapshot
        }
      }),
      signal:AbortSignal.timeout(45000)
    });
    const aiBody=await aiResponse.json().catch(()=>({}));
    if(!aiResponse.ok)throw new Error(aiBody.message||"J’IA est momentanément indisponible.");
    const output=aiBody.output||{};
    const reply=typeof output.reply==="string"?output.reply:(typeof output.text==="string"?output.text:"J’IA n’a pas produit de réponse exploitable.");
    const metadata={provider:aiBody.provider||null,model:aiBody.model||null,confidence:output.confidence||null,sources:output.sources||[],webResearchUsed:Array.isArray(output.sources)&&output.sources.some((x:any)=>typeof x?.url==="string"&&x.url.length>0),keyPoints:output.keyPoints||[],suggestedActions:output.suggestedActions||[]};
    const traceBase={userId:admin.user.id,actorRole:"ADMIN",conversationId,entityType:"CEO_CHAT",title:"J’IA CEO Copilot",evidence:output.sources||[],sourceType:"CEO_CHAT",sourceRef:"/api/admin/jia/chat",metadata:{provider:aiBody.provider||null,model:aiBody.model||null,webResearchUsed:metadata.webResearchUsed}};
    const {data:observationTrace}=await admin.sb.from("JiaIntelligenceTrace").insert({...traceBase,stage:"OBSERVATION",content:message,confidence:"HIGH"}).select("id").single();
    const {data:recommendationTrace}=await admin.sb.from("JiaIntelligenceTrace").insert({...traceBase,parentId:observationTrace?.id||null,stage:"RECOMMENDATION",content:reply,confidence:output.confidence||"LOW",status:Array.isArray(output.suggestedActions)&&output.suggestedActions.length?"PENDING_APPROVAL":"RECORDED"}).select("id").single();
    if(observationTrace?.id)metadata.traceId=recommendationTrace?.id||observationTrace.id;
    const {data:saved,error:savedError}=await admin.sb.from("JiaCEOMessage").insert({conversationId,role:"assistant",content:reply,metadata}).select("id,role,content,metadata,createdAt").single();
    if(savedError)throw new Error(savedError.message);
    await admin.sb.from("JiaCEOConversation").update({updatedAt:new Date().toISOString()}).eq("id",conversationId).eq("adminUserId",admin.user.id);
    await admin.sb.from("CEOAuditLog").insert({adminUserId:admin.user.id,action:"CEO_CHAT",endpoint:"/api/admin/jia/chat",metadata:{conversationId,provider:aiBody.provider||null,model:aiBody.model||null}});
    return NextResponse.json({conversationId,message:saved});
  }catch(e){
    return NextResponse.json({message:e instanceof Error?e.message:"J’IA est momentanément indisponible."},{status:500});
  }
}
