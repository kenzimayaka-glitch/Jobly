import { NextRequest,NextResponse } from "next/server";
import { adminClient,ensureUser,getAuthUser } from "../../../../../lib/server-auth";
const fail=(message:string,status=400,code="EVENT_FEATURE_PAYMENT_ERROR")=>NextResponse.json({error:code,message},{status});
export async function POST(request:NextRequest){
  try{
    const auth=await getAuthUser(request);if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const body=await request.json(),campaignId=String(body.campaignId??""),sb=adminClient(),user=await ensureUser(sb,auth);
    const {data:campaign}=await sb.from("EventFeaturedCampaign").select("*").eq("id",campaignId).maybeSingle();
    if(!campaign)return fail("Campagne introuvable.",404,"CAMPAIGN_NOT_FOUND");
    const {data:event}=await sb.from("Event").select("creatorUserId").eq("id",campaign.eventId).maybeSingle();
    if(!event||event.creatorUserId!==user.id)return fail("Non autorisé.",403,"FORBIDDEN");
    const {data:payment}=await sb.from("Payment").select("*").eq("id",campaign.paymentId).eq("userId",user.id).maybeSingle();
    if(!payment)return fail("Paiement introuvable.",404,"PAYMENT_NOT_FOUND");
    const {getProvider}=await import("../../../../../../lib/paymentProviders");
    const verification=await getProvider(String(payment.provider)).verifyPayment(String(body.externalId??payment.externalId));
    if(verification.status!=="SUCCESSFUL")return NextResponse.json({status:verification.status,message:verification.message??"Paiement non confirmé."},{status:202});
    const now=new Date().toISOString();
    await sb.from("Payment").update({status:"PAID",paidAt:now,updatedAt:now}).eq("id",payment.id);
    await sb.from("EventFeaturedCampaign").update({status:"ACTIVE",updatedAt:now}).eq("id",campaign.id);
    return NextResponse.json({status:"ACTIVE",campaignId:campaign.id});
  }catch(e){return fail(e instanceof Error?e.message:"Vérification impossible.",500);}
}
