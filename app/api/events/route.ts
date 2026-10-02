import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { getEventDomain, getEventPricing, estimateEventAudience, validateEventMedia, EVENT_MAX_DAYS } from "../../../lib/events";
import { buildEventEcosystemConnections, scoreEventForProfile } from "../../../lib/eventEcosystem";

export const dynamic = "force-dynamic";
const fail=(message:string,status=400,code="EVENT_ERROR")=>NextResponse.json({error:code,message},{status});

export async function GET(request:NextRequest){
  try{
    const sb=adminClient(),now=new Date().toISOString();
    const {data:events,error}=await sb.from("Event").select("*").eq("status","PUBLISHED").lte("campaignStartAt",now).gte("campaignEndAt",now).order("createdAt",{ascending:false}).limit(100);
    if(error)throw new Error(error.message);
    const {data:featured,error:fe}=await sb.from("EventFeaturedCampaign").select("eventId,startAt,endAt,slot,status").eq("status","ACTIVE").lte("startAt",now).gte("endAt",now).order("slot",{ascending:true}).limit(6);
    if(fe)throw new Error(fe.message);
    const ids=(featured??[]).map(x=>x.eventId);
    const allEvents=events??[];

    const auth=await getAuthUser(request);
    let recommended=allEvents.slice(0,12).map(e=>({event:e,score:null}));
    let personalized=false;
    if(auth){
      const user=await ensureUser(sb,auth);
      const [{data:profile},{data:journey},{data:mobility}]=await Promise.all([
        sb.from("Profile").select("targetRoles,targetCities,preferredSectors,location").eq("userId",user.id).maybeSingle(),
        sb.from("CareerJourney").select("targetRole,targetDescription").eq("userId",user.id).maybeSingle(),
        sb.from("MobilityRequest").select("departCity,arriveeCity,status").eq("userId",user.id).order("updatedAt",{ascending:false}).limit(1).maybeSingle(),
      ]);
      const mobilityContext=mobility?.arriveeCity||mobility?.departCity;
      const enrichedProfile={...(profile??{}),targetCities:[...((profile?.targetCities??[]) as string[]),...(mobilityContext?[mobilityContext]:[])]};
      recommended=allEvents.map(event=>({event,score:scoreEventForProfile(event,enrichedProfile,journey)})).sort((a,b)=>(b.score??0)-(a.score??0)).slice(0,12);
      personalized=true;
    }

    return NextResponse.json({
      featured:allEvents.filter(e=>ids.includes(e.id)),
      events:allEvents.filter(e=>!ids.includes(e.id)),
      recommended:recommended.map(x=>({...x.event,relevanceScore:x.score})),
      personalized,
      featuredSlots:6,
      ecosystem:allEvents.slice(0,1).map(e=>buildEventEcosystemConnections(e))[0]??{
        eventSourceOfTruth:true,
        consumers:[
          {key:"COMMUNITY",status:"ADAPTER_READY"},
          {key:"CAMPUS",status:"AVAILABLE"},
          {key:"MOBILITY",status:"AVAILABLE"},
          {key:"OFFERS",status:"AVAILABLE"},
          {key:"CAREER_JOURNEY",status:"RELEVANT"},
          {key:"HUB",status:"AVAILABLE"}
        ]
      }
    });
  }catch(e){return fail(e instanceof Error?e.message:"Impossible de charger les événements.",500,"EVENTS_UNAVAILABLE");}
}

export async function POST(request:NextRequest){
  try{
    const auth=await getAuthUser(request); if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const body=await request.json(),title=String(body.title??"").trim(),description=String(body.description??"").trim(),domain=String(body.domain??"").trim();
    const subdomains=Array.isArray(body.subdomains)?body.subdomains.filter((v:unknown):v is string=>typeof v==="string").slice(0,3):[];
    const startAt=new Date(String(body.startAt??"")),endAt=new Date(String(body.endAt??""));
    if(!title||title.length<4||title.length>180)return fail("Le titre est obligatoire.");
    if(!description||description.length<20||description.length>12000)return fail("La description doit contenir entre 20 et 12 000 caractères.");
    if(!getEventDomain(domain))return fail("Domaine invalide.");
    if(!Number.isFinite(startAt.getTime())||!Number.isFinite(endAt.getTime())||endAt<=startAt)return fail("Dates invalides.");
    const durationDays=Math.ceil((endAt.getTime()-startAt.getTime())/86400000);
    if(durationDays<1||durationDays>EVENT_MAX_DAYS)return fail("La durée doit être comprise entre 1 et 90 jours.");
    const media=validateEventMedia({mediaType:body.mediaType,mediaSizeBytes:body.mediaSizeBytes,mediaDurationSeconds:body.mediaDurationSeconds});
    if(!media.ok)return fail(media.error??"Média invalide.");
    if(body.safetyAccepted!==true||body.rightsAccepted!==true)return fail("Les règles de sécurité et des droits de contenu doivent être acceptés.");
    const sb=adminClient(),user=await ensureUser(sb,auth),now=new Date().toISOString();
    const {data:entitlement}=await sb.from("EventEntitlement").select("*").eq("organizerUserId",user.id).eq("active",true).lte("validFrom",now).or("validUntil.is.null,validUntil.gte."+now).maybeSingle();
    const free=user.role==="ADMIN"||Boolean(entitlement?.freePublication);
    if(entitlement?.maxDurationDays&&durationDays>Number(entitlement.maxDurationDays))return fail("La durée dépasse votre droit de publication.",422,"ENTITLEMENT_DURATION");
    const pricing=getEventPricing(durationDays),audienceEstimate=estimateEventAudience({domain,secondaryDomains:subdomains,city:body.city,audience:body.audience});
    const id=crypto.randomUUID();
    const {error}=await sb.from("Event").insert({
      id,creatorUserId:user.id,organizerName:String(body.organizerName??user.displayName??"Organisateur").slice(0,180),title,description,domain,subdomains,
      startAt:startAt.toISOString(),endAt:endAt.toISOString(),campaignStartAt:now,campaignEndAt:endAt.toISOString(),mode:String(body.mode??"PHYSICAL"),
      venue:body.venue?String(body.venue).slice(0,300):null,city:body.city?String(body.city).slice(0,120):null,country:String(body.country??"CM").slice(0,3),
      registrationMode:String(body.registrationMode??"EXTERNAL"),registrationUrl:body.registrationUrl?String(body.registrationUrl).slice(0,1000):null,
      audience:Array.isArray(body.audience)?body.audience.filter((v:unknown):v is string=>typeof v==="string").slice(0,8):[],
      mediaType:body.mediaType??null,mediaUrl:body.mediaUrl?String(body.mediaUrl).slice(0,2000):null,
      mediaSizeBytes:body.mediaSizeBytes?Number(body.mediaSizeBytes):null,mediaDurationSeconds:body.mediaDurationSeconds?Number(body.mediaDurationSeconds):null,
      status:free?"PUBLISHED":"PENDING_PAYMENT",publicationSource:free?(user.role==="ADMIN"?"JOBLY":"PARTNER_CONVENTION"):"STANDARD",
      priceAmount:pricing.total,priceCurrency:"XAF",safetyAcceptedAt:now,rightsAcceptedAt:now,createdAt:now,updatedAt:now
    });
    if(error)throw new Error(error.message);
    if(free)return NextResponse.json({eventId:id,status:"PUBLISHED",pricing:{...pricing,total:0},audienceEstimate,publicationSource:user.role==="ADMIN"?"JOBLY":"PARTNER_CONVENTION"},{status:201});
    const provider=String(body.provider??"ICLAN").toUpperCase(),paymentId=crypto.randomUUID();
    const {data:payment,error:pe}=await sb.from("Payment").insert({id:paymentId,userId:user.id,provider,externalId:paymentId,amount:pricing.total,currency:"XAF",status:"CREATED",feature:"EVENT_PUBLICATION",createdAt:now,updatedAt:now}).select("*").single();
    if(pe)throw new Error(pe.message);
    const {getProvider}=await import("../../../lib/paymentProviders");
    const intent=await getProvider(provider).createPayment({paymentId,amount:pricing.total,currency:"XAF",phone:auth.phone});
    const {error:epe}=await sb.from("EventPayment").insert({id:crypto.randomUUID(),eventId:id,paymentId,purpose:"PUBLICATION",amount:pricing.total,status:"PENDING",createdAt:now,updatedAt:now});
    if(epe)throw new Error(epe.message);
    return NextResponse.json({eventId:id,status:"PENDING_PAYMENT",pricing,audienceEstimate,payment:{id:paymentId,checkoutReference:intent.checkoutReference,instructions:intent.instructions}},{status:201});
  }catch(e){return fail(e instanceof Error?e.message:"Création impossible.",500);}
}
