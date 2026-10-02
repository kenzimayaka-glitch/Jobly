import { NextRequest,NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient,ensureUser,getAuthUser } from "../../../../../lib/server-auth";
import { EVENT_FEATURED_DAYS,EVENT_FEATURED_PRICE,EVENT_FEATURED_SLOTS } from "../../../../../lib/events";
const fail=(message:string,status=400,code="EVENT_FEATURE_ERROR")=>NextResponse.json({error:code,message},{status});
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    const auth=await getAuthUser(request);if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const {id}=await context.params,sb=adminClient(),user=await ensureUser(sb,auth);
    const {data:event}=await sb.from("Event").select("id,creatorUserId,status").eq("id",id).maybeSingle();
    if(!event)return fail("Événement introuvable.",404,"EVENT_NOT_FOUND");
    if(event.creatorUserId!==user.id&&user.role!=="ADMIN")return fail("Non autorisé.",403,"FORBIDDEN");
    if(event.status!=="PUBLISHED")return fail("L'événement doit être publié avant sa mise en avant.",409,"EVENT_NOT_PUBLISHED");
    const now=new Date(),end=new Date(now.getTime()+EVENT_FEATURED_DAYS*86400000);
    const {data:active}=await sb.from("EventFeaturedCampaign").select("slot").eq("status","ACTIVE").lte("startAt",now.toISOString()).gte("endAt",now.toISOString()).limit(EVENT_FEATURED_SLOTS);
    const used=new Set((active??[]).map(x=>Number(x.slot)));
    const slot=Array.from({length:EVENT_FEATURED_SLOTS},(_,i)=>i+1).find(x=>!used.has(x));
    if(!slot)return fail("Les 6 emplacements Grand rendez-vous sont occupés. Revenez vérifier la disponibilité.",409,"FEATURED_FULL");
    const body=await request.json().catch(()=>({})),provider=String(body.provider??"ICLAN").toUpperCase(),paymentId=crypto.randomUUID();
    const {data:payment,error:pe}=await sb.from("Payment").insert({id:paymentId,userId:user.id,provider,externalId:paymentId,amount:EVENT_FEATURED_PRICE,currency:"XAF",status:"CREATED",feature:"EVENT_FEATURED",createdAt:now.toISOString(),updatedAt:now.toISOString()}).select("*").single();
    if(pe)throw new Error(pe.message);
    const {getProvider}=await import("../../../../../lib/paymentProviders");
    const intent=await getProvider(provider).createPayment({paymentId,amount:EVENT_FEATURED_PRICE,currency:"XAF",phone:auth.phone});
    const {data:campaign,error:ce}=await sb.from("EventFeaturedCampaign").insert({id:crypto.randomUUID(),eventId:id,slot,startAt:now.toISOString(),endAt:end.toISOString(),price:EVENT_FEATURED_PRICE,paymentId,status:"PENDING_PAYMENT",createdAt:now.toISOString(),updatedAt:now.toISOString()}).select("*").single();
    if(ce)throw new Error(ce.message);
    return NextResponse.json({campaign,payment:{id:paymentId,checkoutReference:intent.checkoutReference,instructions:intent.instructions}},{status:201});
  }catch(e){return fail(e instanceof Error?e.message:"Mise en avant impossible.",500);}
}
