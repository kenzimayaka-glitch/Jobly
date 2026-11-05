import { NextRequest,NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient,ensureUser,getAuthUser } from "../../../../../lib/server-auth";
import { EVENT_FEATURED_DAYS,EVENT_FEATURED_PRICE } from "../../../../../lib/events";
import { getEventManualPaymentInstructions } from "../../../../../lib/eventManualPayments";

const fail=(message:string,status=400,code="EVENT_FEATURE_ERROR")=>NextResponse.json({error:code,message},{status});

export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    const auth=await getAuthUser(request);
    if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const {id}=await context.params;
    const sb=adminClient();
    const user=await ensureUser(sb,auth);
    const {data:event,error:eventError}=await sb.from("Event")
      .select("id,creatorUserId,status").eq("id",id).maybeSingle();
    if(eventError)throw new Error(eventError.message);
    if(!event)return fail("Événement introuvable.",404,"EVENT_NOT_FOUND");
    if(event.creatorUserId!==user.id&&user.role!=="ADMIN")return fail("Non autorisé.",403,"FORBIDDEN");
    if(event.status!=="PUBLISHED")return fail("L'événement doit être publié avant sa mise en avant.",409,"EVENT_NOT_PUBLISHED");

    const now=new Date().toISOString();
    const {data:entitlement,error:entitlementError}=await sb.from("EventEntitlement")
      .select("id,freeFeatured").eq("organizerUserId",user.id).eq("active",true).lte("validFrom",now)
      .or("validUntil.is.null,validUntil.gte."+now).order("validFrom",{ascending:false}).limit(1).maybeSingle();
    if(entitlementError)throw new Error(entitlementError.message);
    const free=user.role==="ADMIN"||Boolean(entitlement?.freeFeatured);
    const campaignId=crypto.randomUUID();

    if(free){
      const {data:campaign,error:campaignError}=await sb.rpc("create_event_featured_campaign",{
        p_campaign_id:campaignId,
        p_event_id:id,
        p_payment_id:null,
        p_price:0,
        p_duration_days:EVENT_FEATURED_DAYS,
        p_free:true
      });
      if(campaignError){
        if(campaignError.message.includes("FEATURED_FULL"))return fail("Les 6 emplacements Grand rendez-vous sont occupés.",409,"FEATURED_FULL");
        throw new Error(campaignError.message);
      }
      return NextResponse.json({campaign,payment:null,free:true},{status:201});
    }

    const paymentId=crypto.randomUUID();
    const {error:paymentError}=await sb.from("Payment").insert({
      id:paymentId,userId:user.id,provider:"MANUAL",externalId:paymentId,idempotencyKey:paymentId,amount:EVENT_FEATURED_PRICE,
      currency:"XAF",status:"PENDING",feature:"EVENT_FEATURED",createdAt:now,updatedAt:now
    });
    if(paymentError)throw new Error(paymentError.message);

    const {data:campaign,error:campaignError}=await sb.rpc("create_event_featured_campaign",{
      p_campaign_id:campaignId,
      p_event_id:id,
      p_payment_id:paymentId,
      p_price:EVENT_FEATURED_PRICE,
      p_duration_days:EVENT_FEATURED_DAYS,
      p_free:false
    });
    if(campaignError){
      await sb.from("Payment").update({status:"FAILED",failureReason:campaignError.message.slice(0,240),updatedAt:new Date().toISOString()}).eq("id",paymentId);
      if(campaignError.message.includes("FEATURED_FULL"))return fail("Les 6 emplacements Grand rendez-vous sont occupés.",409,"FEATURED_FULL");
      throw new Error(campaignError.message);
    }

    return NextResponse.json({
      campaign,
      payment:{
        id:paymentId,
        amount:EVENT_FEATURED_PRICE,
        currency:"XAF",
        provider:"MANUAL",
        instructions:getEventManualPaymentInstructions(),
        submissionUrl:"/events/payment/"+paymentId
      }
    },{status:201});
  }catch(e){
    return fail(e instanceof Error?e.message:"Mise en avant impossible.",500);
  }
}
