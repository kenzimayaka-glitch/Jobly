import { NextRequest,NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";
import { enforceApiRateLimit } from "../../../../lib/server-security";
export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,context:{params:Promise<{id:string}>}){
  const {id}=await context.params,sb=adminClient();
  const limited=await enforceApiRateLimit(_request,sb,{
    scope:"public-event-detail",
    ipWindows:[{limit:120,windowSeconds:60},{limit:1200,windowSeconds:3600}],
    requireIp:true
  });
  if(limited)return limited;
  const {data,eventError}=await (async()=>{const r=await sb.from("Event").select("id,organizerName,title,description,domain,subdomains,startAt,endAt,campaignStartAt,campaignEndAt,mode,venue,city,country,registrationMode,registrationUrl,audience,mediaType,mediaUrl,mediaSizeBytes,mediaDurationSeconds,status,publicationSource,priceAmount,priceCurrency,createdAt,updatedAt").eq("id",id).eq("status","PUBLISHED").maybeSingle();return {data:r.data,eventError:r.error};})();
  if(eventError)return NextResponse.json({message:eventError.message},{status:500});
  if(!data)return NextResponse.json({message:"Événement introuvable."},{status:404});
  const {data:featured}=await sb.from("EventFeaturedCampaign").select("startAt,endAt,slot,status").eq("eventId",id).eq("status","ACTIVE").maybeSingle();
  return NextResponse.json({event:data,featured:featured??null},{headers:{"Cache-Control":"private, no-store, max-age=0"}});
}
