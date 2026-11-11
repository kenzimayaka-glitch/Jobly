import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { getEventDomain, getEventPricing, estimateEventAudience, validateEventMedia, EVENT_MAX_DAYS } from "../../../lib/events";
import { buildEventEcosystemConnections, scoreEventForProfile } from "../../../lib/eventEcosystem";
import { estimateAndDistributeEvent } from "../../../lib/eventDistribution";
import { discoverEventPartners } from "../../../lib/eventPartnerDiscovery";
import { getEventManualPaymentInstructions } from "../../../lib/eventManualPayments";
import { exposePublishedEventMedia, JOBLY_EVENTS_BUCKET } from "../../../lib/eventStorage";

export const dynamic = "force-dynamic";
const fail=(message:string,status=400,code="EVENT_ERROR")=>NextResponse.json({error:code,message},{status});

type EventLike = Parameters<typeof scoreEventForProfile>[0];

function isEventLike(value: unknown): value is EventLike {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return typeof event.id === "string"
    && typeof event.title === "string"
    && typeof event.description === "string"
    && typeof event.domain === "string"
    && typeof event.startAt === "string";
}

export async function GET(request:NextRequest){
  try{
    const sb=adminClient(),now=new Date().toISOString();
    const {data:events,error}=await sb.from("Event").select("*").eq("status","PUBLISHED").lte("campaignStartAt",now).gte("campaignEndAt",now).order("createdAt",{ascending:false}).limit(100);
    if(error)throw new Error(error.message);
    const {data:featured,error:fe}=await sb.from("EventFeaturedCampaign").select("eventId,startAt,endAt,slot,status").eq("status","ACTIVE").lte("startAt",now).gte("endAt",now).order("slot",{ascending:true}).limit(6);
    if(fe)throw new Error(fe.message);
    const ids=(featured??[]).map(x=>x.eventId);
    const allEvents=(await Promise.all((events??[]).map((event)=>exposePublishedEventMedia(sb,event)))).filter(isEventLike);

    const auth=await getAuthUser(request);
    let recommended: Array<{event:any;score:number|null}>=allEvents.slice(0,12).map(e=>({event:e,score:null}));
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
    const auth=await getAuthUser(request);
    if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const body=await request.json().catch(()=>null);
    if(!body || typeof body!=="object" || Array.isArray(body))return fail("Données événement invalides.");

    const title=String(body.title??"").trim();
    const description=String(body.description??"").trim();
    const domain=String(body.domain??"").trim();
    const domainConfig=getEventDomain(domain);
    if(!title||title.length<4||title.length>180)return fail("Le titre doit contenir entre 4 et 180 caractères.");
    if(!description||description.length<20||description.length>12000)return fail("La description doit contenir entre 20 et 12 000 caractères.");
    if(!domainConfig)return fail("Domaine invalide.");

    const rawSubdomains=Array.isArray(body.subdomains)?body.subdomains:[];
    if(rawSubdomains.some((value:unknown)=>typeof value!=="string"||!domainConfig.subs.includes(value as never)))return fail("Sous-domaine invalide.");
    const subdomains=[...new Set(rawSubdomains as string[])].slice(0,3);

    const startAt=new Date(String(body.startAt??""));
    const endAt=new Date(String(body.endAt??""));
    const nowDate=new Date();
    if(!Number.isFinite(startAt.getTime())||!Number.isFinite(endAt.getTime())||endAt<=startAt)return fail("Dates invalides.");
    if(endAt<=nowDate)return fail("La date de fin doit être dans le futur.");
    const durationDays=Math.ceil((endAt.getTime()-startAt.getTime())/86400000);
    if(durationDays<1||durationDays>EVENT_MAX_DAYS)return fail("La durée doit être comprise entre 1 et 90 jours.");

    const mode=String(body.mode??"PHYSICAL").toUpperCase();
    if(!["PHYSICAL","ONLINE","HYBRID"].includes(mode))return fail("Mode événementiel invalide.");
    const registrationMode=String(body.registrationMode??"EXTERNAL").toUpperCase();
    if(!["EXTERNAL","INTERNAL","NONE"].includes(registrationMode))return fail("Mode d'inscription invalide.");
    const country=String(body.country??"CM").trim().toUpperCase();
    if(!/^[A-Z]{2}$/.test(country))return fail("Code pays invalide.");

    const safeUrl=(value:unknown):string|null=>{
      if(value==null||value==="")return null;
      if(typeof value!=="string"||value.length>2000)return null;
      try{
        const parsed=new URL(value);
        if(!["https:","http:"].includes(parsed.protocol)||parsed.username||parsed.password)return null;
        return parsed.toString();
      }catch{return null;}
    };
    const registrationUrl=safeUrl(body.registrationUrl);
    const mediaUrl=safeUrl(body.mediaUrl);
    const mediaStoragePath=body.mediaStoragePath==null?null:String(body.mediaStoragePath).trim();
    if(body.registrationUrl&&!registrationUrl)return fail("Lien d'inscription invalide.");
    if(body.mediaUrl&&!mediaUrl)return fail("URL média invalide.");
    if(mediaStoragePath&&(mediaStoragePath.length>500||mediaStoragePath.includes("..")||mediaStoragePath.startsWith("/")||mediaUrl))return fail("Chemin de média invalide.");

    const mediaType=body.mediaType==null?null:String(body.mediaType);
    const mediaSizeBytes=body.mediaSizeBytes==null?null:Number(body.mediaSizeBytes);
    const mediaDurationSeconds=body.mediaDurationSeconds==null?null:Number(body.mediaDurationSeconds);
    const media=validateEventMedia({mediaType,mediaSizeBytes,mediaDurationSeconds});
    if(!media.ok)return fail(media.error??"Média invalide.");
    if(mediaType&&!mediaUrl&&!mediaStoragePath)return fail("Le média doit être associé à un fichier Jobly ou à une URL.");
    if(mediaStoragePath&&(!mediaType||!mediaSizeBytes))return fail("Métadonnées du média manquantes.");

    const audience=Array.isArray(body.audience)
      ? body.audience.filter((value:unknown):value is string=>typeof value==="string"&&value.trim().length>0&&value.trim().length<=80).slice(0,8).map((value:string)=>value.trim())
      : [];

    const sb=adminClient();
    const user=await ensureUser(sb,auth);
    if(mediaStoragePath){
      if(!mediaStoragePath.startsWith(auth.id+"/"))return fail("Ce média ne vous appartient pas.",403,"EVENT_MEDIA_FORBIDDEN");
      const {data:storedMedia,error:storedMediaError}=await sb.storage.from(JOBLY_EVENTS_BUCKET).download(mediaStoragePath);
      if(storedMediaError||!storedMedia)return fail("Le fichier média privé est introuvable.",422,"EVENT_MEDIA_NOT_FOUND");
      if(storedMedia.size<=0||storedMedia.size!==mediaSizeBytes)return fail("Le fichier média ne correspond pas à sa taille déclarée.",422,"EVENT_MEDIA_SIZE_MISMATCH");
    }
    const now=new Date().toISOString();
    const {data:entitlement,error:entitlementError}=await sb.from("EventEntitlement")
      .select("*").eq("organizerUserId",user.id).eq("active",true).lte("validFrom",now)
      .or("validUntil.is.null,validUntil.gte."+now).order("validFrom",{ascending:false}).limit(1).maybeSingle();
    if(entitlementError)throw new Error(entitlementError.message);

    const free=user.role==="ADMIN"||Boolean(entitlement?.freePublication);
    if(entitlement?.maxDurationDays&&durationDays>Number(entitlement.maxDurationDays))return fail("La durée dépasse votre droit de publication.",422,"ENTITLEMENT_DURATION");
    const pricing=getEventPricing(durationDays);
    const id=crypto.randomUUID();
    const organizerName=String(body.organizerName??user.displayName??"Organisateur").trim().slice(0,180)||"Organisateur";

    const {error}=await sb.from("Event").insert({
      id,creatorUserId:user.id,organizerName,title,description,domain,subdomains,
      startAt:startAt.toISOString(),endAt:endAt.toISOString(),campaignStartAt:now,campaignEndAt:endAt.toISOString(),
      mode,venue:body.venue?String(body.venue).trim().slice(0,300):null,
      city:body.city?String(body.city).trim().slice(0,120):null,country,
      registrationMode,registrationUrl,audience,
      mediaType,mediaUrl,mediaStoragePath,mediaSizeBytes,mediaDurationSeconds,
      status:free?"PUBLISHED":"PENDING_PAYMENT",
      publicationSource:free?(user.role==="ADMIN"?"JOBLY":"PARTNER_CONVENTION"):"STANDARD",
      priceAmount:free?0:pricing.total,priceCurrency:"XAF",
      safetyAcceptedAt:now,rightsAcceptedAt:now,createdAt:now,updatedAt:now
    });
    if(error)throw new Error(error.message);

    if(free){
      const distribution=await estimateAndDistributeEvent(sb,{id,title,description,domain,subdomains,city:body.city,country,startAt:startAt.toISOString(),endAt:endAt.toISOString()},user.id).catch(error=>({error:error instanceof Error?error.message:"Distribution indisponible."}));
      const partnerDiscovery=await discoverEventPartners(sb,{id,title,description,domain,city:body.city,country},user.id).catch(error=>({error:error instanceof Error?error.message:"Découverte partenaire indisponible."}));
      return NextResponse.json({eventId:id,status:"PUBLISHED",pricing:{...pricing,total:0},audienceEstimate:("audienceEstimate" in distribution)?distribution.audienceEstimate:null,distribution,partnerDiscovery,publicationSource:user.role==="ADMIN"?"JOBLY":"PARTNER_CONVENTION"},{status:201});
    }

    const paymentId=crypto.randomUUID();
    const {error:paymentError}=await sb.from("Payment").insert({
      id:paymentId,userId:user.id,provider:"MANUAL",externalId:paymentId,idempotencyKey:paymentId,amount:pricing.total,currency:"XAF",
      status:"PENDING",feature:"EVENT_PUBLICATION",createdAt:now,updatedAt:now
    });
    if(paymentError){
      await sb.from("Event").update({status:"DRAFT",updatedAt:new Date().toISOString()}).eq("id",id);
      return fail("Le paiement n'a pas pu être préparé. L'événement est revenu en brouillon.",503,"PAYMENT_RECORD_FAILED");
    }

    const {error:eventPaymentError}=await sb.from("EventPayment").insert({
      id:crypto.randomUUID(),eventId:id,paymentId,purpose:"PUBLICATION",amount:pricing.total,status:"PENDING",createdAt:now,updatedAt:now
    });
    if(eventPaymentError){
      const failedAt=new Date().toISOString();
      await Promise.all([
        sb.from("Payment").update({status:"FAILED",failureReason:"EVENT_PAYMENT_LINK_FAILED",updatedAt:failedAt}).eq("id",paymentId),
        sb.from("Event").update({status:"DRAFT",updatedAt:failedAt}).eq("id",id)
      ]);
      return fail("Le paiement n'a pas pu être associé à l'événement. L'événement est revenu en brouillon.",503,"EVENT_PAYMENT_LINK_FAILED");
    }

    return NextResponse.json({
      eventId:id,
      status:"PENDING_PAYMENT",
      pricing,
      audienceEstimate:estimateEventAudience({domain,secondaryDomains:subdomains,city:body.city,audience}),
      payment:{
        id:paymentId,
        amount:pricing.total,
        currency:"XAF",
        provider:"MANUAL",
        instructions:getEventManualPaymentInstructions(),
        submissionUrl:"/events/payment/"+paymentId
      }
    },{status:201});
  }catch(e){
    return fail(e instanceof Error?e.message:"Création impossible.",500);
  }
}
