import { NextRequest,NextResponse } from "next/server";
import { adminClient,ensureUser,getAuthUser } from "../../../../../../lib/server-auth";
import { estimateAndDistributeEvent } from "../../../../../../lib/eventDistribution";
import { discoverEventPartners } from "../../../../../../lib/eventPartnerDiscovery";
import { eventPaymentVerificationError } from "../../../../../../lib/eventPaymentVerification";

const fail=(message:string,status=400,code="EVENT_PAYMENT_ERROR")=>NextResponse.json({error:code,message},{status});

export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    const auth=await getAuthUser(request);
    if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");

    const {id}=await context.params;
    const body=await request.json().catch(()=>({}));
    const sb=adminClient();
    const user=await ensureUser(sb,auth);
    const {data:event,error:eventError}=await sb.from("Event")
      .select("id,creatorUserId,status,title,description,domain,subdomains,city,country,startAt,endAt")
      .eq("id",id).maybeSingle();
    if(eventError)throw new Error(eventError.message);
    if(!event||event.creatorUserId!==user.id)return fail("Événement introuvable.",404,"EVENT_NOT_FOUND");
    if(event.status==="PUBLISHED")return NextResponse.json({status:"PUBLISHED",eventId:id,alreadyPublished:true});

    const {data:ep,error:epError}=await sb.from("EventPayment").select("*")
      .eq("eventId",id).eq("purpose","PUBLICATION").maybeSingle();
    if(epError)throw new Error(epError.message);
    if(!ep)return fail("Paiement événement introuvable.",404,"PAYMENT_NOT_FOUND");

    const {data:payment,error:paymentError}=await sb.from("Payment").select("*")
      .eq("id",ep.paymentId).eq("userId",user.id).maybeSingle();
    if(paymentError)throw new Error(paymentError.message);
    if(!payment)return fail("Paiement introuvable.",404,"PAYMENT_NOT_FOUND");

    const expectedExternalId=String(payment.externalId??"").trim();
    const requestedExternalId=String(body.externalId??expectedExternalId).trim();
    if(!expectedExternalId||requestedExternalId!==expectedExternalId){
      return fail("La référence de paiement ne correspond pas à cette transaction.",409,"PAYMENT_REFERENCE_MISMATCH");
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

    const {data:finalized,error:finalizeError}=await sb.rpc("finalize_event_publication",{
      p_event_id:id,
      p_payment_id:String(payment.id),
      p_expected_amount:Number(payment.amount),
      p_expected_currency:String(payment.currency)
    });
    if(finalizeError)throw new Error(finalizeError.message);
    if(finalized!==true)throw new Error("EVENT_PUBLICATION_FINALIZATION_FAILED");

    const distribution=await estimateAndDistributeEvent(sb,event,user.id)
      .catch(error=>({error:error instanceof Error?error.message:"Distribution indisponible."}));
    const partnerDiscovery=await discoverEventPartners(sb,event,user.id)
      .catch(error=>({error:error instanceof Error?error.message:"Découverte partenaire indisponible."}));
    return NextResponse.json({
      status:"PUBLISHED",eventId:id,distribution,partnerDiscovery,
      audienceEstimate:("audienceEstimate" in distribution)?distribution.audienceEstimate:null
    });
  }catch(e){
    return fail(e instanceof Error?e.message:"Vérification impossible.",500);
  }
}
