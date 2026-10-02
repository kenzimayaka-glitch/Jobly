import { NextRequest,NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";
export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,context:{params:Promise<{id:string}>}){
  const {id}=await context.params,sb=adminClient();
  const {data,eventError}=await (async()=>{const r=await sb.from("Event").select("*").eq("id",id).eq("status","PUBLISHED").maybeSingle();return {data:r.data,eventError:r.error};})();
  if(eventError)return NextResponse.json({message:eventError.message},{status:500});
  if(!data)return NextResponse.json({message:"Événement introuvable."},{status:404});
  const {data:featured}=await sb.from("EventFeaturedCampaign").select("startAt,endAt,slot,status").eq("eventId",id).eq("status","ACTIVE").maybeSingle();
  return NextResponse.json({event:data,featured:featured??null});
}
