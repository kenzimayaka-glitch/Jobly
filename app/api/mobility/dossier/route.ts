import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../../lib/mobilityServer";
export async function GET(req:NextRequest){try{
 const au=await authUser(req);if(!au)return NextResponse.json({message:"Session requise."},{status:401});const sb=adminClient(),u=await ensureUser(sb,au),requestId=new URL(req.url).searchParams.get("requestId");if(!requestId)return NextResponse.json({message:"requestId requis."},{status:400});
 const {data:request}=await sb.from("MobilityRequest").select("*").eq("id",requestId).eq("userId",u.id).maybeSingle();if(!request)return NextResponse.json({message:"Dossier Mobility introuvable."},{status:404});
 const [{data:documents},{data:events}]=await Promise.all([sb.from("MobilityDocument").select("id,documentType,side,fileName,fileSize,validUntil,status,rejectionReason,createdAt,updatedAt").eq("mobilityRequestId",requestId).order("createdAt",{ascending:true}),sb.from("MobilityProcessEvent").select("id,actorRole,eventType,fromStatus,toStatus,title,description,metadata,createdAt").eq("mobilityRequestId",requestId).eq("visibleToTalent",true).order("createdAt",{ascending:true})]);
 return NextResponse.json({request,documents:documents||[],events:events||[]});
}catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Dossier indisponible."},{status:500});}}
