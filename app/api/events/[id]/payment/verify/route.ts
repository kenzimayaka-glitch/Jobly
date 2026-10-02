import { NextRequest,NextResponse } from "next/server";
import { adminClient,ensureUser,getAuthUser } from "../../../../../../lib/server-auth";
import { estimateAndDistributeEvent } from "../../../../../../lib/eventDistribution";
const fail=(message:string,status=400,code="EVENT_PAYMENT_ERROR")=>NextResponse.json({error:code,message},{status});
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    const auth=await getAuthUser(request);if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const {id}=await context.params,body=await request.json().catch(()=>({})),sb=adminClient(),user=await ensureUser(sb,auth);
    const {data:event}=await sb.from("Event").select("id,creatorUserId,status,title,description,domain,subdomains,city,country,startAt,endAt").eq("id",id).maybeSingle();
    if(!event||event.creatorUserId!==user.id)return fail("Événement introuvable.",404,"EVENT_NOT_FOUND");
    const {data:ep}=await sb.from("EventPayment").select("*").eq("eventId",id).eq("purpose","PUBLICATION").maybeSingle();
    if(!ep)return fail("Paiement événement introuvable.",404,"PAYMENT_NOT_FOUND");
    const {data:payment}=await sb.from("Payment").select("*").eq("id",ep.paymentId).eq("userId",user.id).maybeSingle();
    if(!payment)return fail("Paiement introuvable.",404,"PAYMENT_NOT_FOUND");
    const {getProvider}=await import("../../../../../../lib/paymentProviders");
    const verification=await getProvider(String(payment.provider)).verifyPayment(String(body.externalId??payment.externalId));
    if(verification.status!=="SUCCESSFUL")return NextResponse.json({status:verification.status,message:verification.message??"Paiement non confirmé."},{status:202});
    const now=new Date().toISOString();
    await sb.from("Payment").update({status:"PAID",paidAt:now,updatedAt:now}).eq("id",payment.id);
    await sb.from("EventPayment").update({status:"PAID",updatedAt:now}).eq("id",ep.id);
    await sb.from("Event").update({status:"PUBLISHED",updatedAt:now}).eq("id",id);
    const distribution=await estimateAndDistributeEvent(sb,event,user.id);
    return NextResponse.json({status:"PUBLISHED",eventId:id,distribution,audienceEstimate:distribution.audienceEstimate});
  }catch(e){return fail(e instanceof Error?e.message:"Vérification impossible.",500);}
}
