import { NextRequest,NextResponse } from "next/server";
import { adminClient,ensureUser,getAuthUser } from "../../../../../../lib/server-auth";
import { eventPaymentVerificationError } from "../../../../../../lib/eventPaymentVerification";

const fail=(message:string,status=400,code="EVENT_FEATURE_PAYMENT_ERROR")=>NextResponse.json({error:code,message},{status});

export async function POST(request:NextRequest){
  try{
    const auth=await getAuthUser(request);
    if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const body=await request.json().catch(()=>({}));
    const campaignId=String(body.campaignId??"").trim();
    if(!campaignId)return fail("Campagne manquante.",400,"CAMPAIGN_ID_REQUIRED");

    const sb=adminClient();
    const user=await ensureUser(sb,auth);
    const {data:campaign,error:campaignError}=await sb.from("EventFeaturedCampaign")
      .select("*").eq("id",campaignId).maybeSingle();
    if(campaignError)throw new Error(campaignError.message);
    if(!campaign)return fail("Campagne introuvable.",404,"CAMPAIGN_NOT_FOUND");
    if(campaign.status==="ACTIVE"&&!campaign.paymentId){
      return NextResponse.json({status:"ACTIVE",campaignId:campaign.id,free:true,alreadyActive:true});
    }
    if(!campaign.paymentId)return fail("Référence de paiement manquante.",409,"PAYMENT_NOT_FOUND");

    const {data:event,error:eventError}=await sb.from("Event")
      .select("creatorUserId").eq("id",campaign.eventId).maybeSingle();
    if(eventError)throw new Error(eventError.message);
    if(!event||(event.creatorUserId!==user.id&&user.role!=="ADMIN"))return fail("Non autorisé.",403,"FORBIDDEN");

    const {data:payment,error:paymentError}=await sb.from("Payment")
      .select("*").eq("id",campaign.paymentId).maybeSingle();
    if(paymentError)throw new Error(paymentError.message);
    if(!payment || (payment.userId!==user.id&&user.role!=="ADMIN"))return fail("Paiement introuvable.",404,"PAYMENT_NOT_FOUND");

    const expectedExternalId=String(payment.externalId??"").trim();
    const requestedExternalId=String(body.externalId??expectedExternalId).trim();
    if(!expectedExternalId||requestedExternalId!==expectedExternalId){
      return fail("La référence de paiement ne correspond pas à cette campagne.",409,"PAYMENT_REFERENCE_MISMATCH");
    }

    const {getProvider}=await import("../../../../../../lib/paymentProviders");
    const verification=await getProvider(String(payment.provider)).verifyPayment(expectedExternalId);
    if(verification.status==="PENDING"){
      return NextResponse.json({status:"PENDING",message:verification.message??"Paiement en attente."},{status:202});
    }
    if(verification.status==="FAILED"){
      return fail(verification.message??"Le paiement a été refusé.",409,"PAYMENT_FAILED");
    }

    const verificationError=eventPaymentVerificationError({
      expectedExternalId,
      expectedAmount:Number(payment.amount),
      expectedCurrency:String(payment.currency),
      verification
    });
    if(verificationError)return fail("Le prestataire n'a pas confirmé la référence, le montant et la devise attendus.",409,verificationError);

    const {data:finalized,error:finalizeError}=await sb.rpc("finalize_event_featured_payment",{
      p_campaign_id:campaign.id,
      p_payment_id:String(payment.id),
      p_expected_amount:Number(payment.amount),
      p_expected_currency:String(payment.currency)
    });
    if(finalizeError)throw new Error(finalizeError.message);
    if(finalized!==true)throw new Error("EVENT_FEATURED_FINALIZATION_FAILED");
    return NextResponse.json({status:"ACTIVE",campaignId:campaign.id});
  }catch(e){
    return fail(e instanceof Error?e.message:"Vérification impossible.",500);
  }
}
