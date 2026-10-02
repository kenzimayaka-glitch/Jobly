import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../../../lib/mobilityServer";
export async function POST(req:NextRequest){try{
 const au=await authUser(req);if(!au)return NextResponse.json({message:"Session requise."},{status:401});const sb=adminClient(),u=await ensureUser(sb,au);
 if(String(u.role||"")!=="ADMIN")return NextResponse.json({message:"Seul un opérateur Mobility autorisé peut vérifier une pièce."},{status:403});
 const b=await req.json(),status=String(b.status||"");if(!["UNDER_REVIEW","VERIFIED","REJECTED","EXPIRED"].includes(status))return NextResponse.json({message:"Statut documentaire invalide."},{status:400});
 if(status==="REJECTED"&&!String(b.rejectionReason||"").trim())return NextResponse.json({message:"Un motif est obligatoire en cas de rejet."},{status:400});
 const {data:doc}=await sb.from("MobilityDocument").select("*").eq("id",b.documentId).maybeSingle();if(!doc)return NextResponse.json({message:"Pièce introuvable."},{status:404});
 const {data:updated,error}=await sb.from("MobilityDocument").update({status,verifiedByUserId:u.id,verifiedAt:new Date().toISOString(),rejectionReason:status==="REJECTED"?String(b.rejectionReason):null,updatedAt:new Date().toISOString()}).eq("id",doc.id).select("id,documentType,side,fileName,status,rejectionReason,verifiedAt,updatedAt").single();if(error)throw new Error(error.message);
 await sb.from("MobilityProcessEvent").insert({mobilityRequestId:doc.mobilityRequestId,actorUserId:u.id,actorRole:"ADMIN",eventType:"DOCUMENT_"+status,fromStatus:doc.status,toStatus:doc.status,title:status==="VERIFIED"?"Pièce vérifiée":status==="REJECTED"?"Pièce rejetée":"Pièce mise à jour",description:status==="REJECTED"?String(b.rejectionReason):"Traitement documentaire mis à jour.",metadata:{documentId:doc.id},visibleToTalent:true,visibleToRecruiter:true,visibleToInstitution:true});
 return NextResponse.json({document:updated});
}catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Vérification impossible."},{status:500});}}
