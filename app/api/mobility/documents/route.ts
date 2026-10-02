import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authUser, adminClient, ensureUser } from "../../../../lib/mobilityServer";
const BUCKET="mobility-documents", MAX_BYTES=10*1024*1024;
const MIME_EXT:Record<string,string>={"application/pdf":"pdf","image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
function fail(message:string,status=400){return NextResponse.json({message},{status});}
async function owned(sb:any,userId:string,requestId:string){return (await sb.from("MobilityRequest").select("id,userId,status,currentStep,eligibilityStatus,eligibilityBurdenPercent,eligibilityThresholdPercent").eq("id",requestId).eq("userId",userId).maybeSingle()).data;}
export async function GET(req:NextRequest){try{
 const au=await authUser(req);if(!au)return fail("Session requise.",401);const sb=adminClient(),u=await ensureUser(sb,au);
 const requestId=new URL(req.url).searchParams.get("requestId");if(!requestId)return fail("requestId requis.");
 const request=await owned(sb,u.id,requestId);if(!request)return fail("Dossier Mobility introuvable.",404);
 const {data:documents,error}=await sb.from("MobilityDocument").select("id,documentType,side,fileName,mimeType,fileSize,validUntil,status,rejectionReason,createdAt,updatedAt").eq("mobilityRequestId",requestId).order("createdAt",{ascending:true});if(error)throw new Error(error.message);
 return NextResponse.json({request,documents:documents||[]});
}catch(e){return fail(e instanceof Error?e.message:"Lecture impossible.",500);}}
export async function POST(req:NextRequest){try{
 const au=await authUser(req);if(!au)return fail("Session requise.",401);const sb=adminClient(),u=await ensureUser(sb,au);const form=await req.formData();
 const requestId=String(form.get("requestId")||""),documentType=String(form.get("documentType")||""),side=form.get("side")?String(form.get("side")):null,validUntil=form.get("validUntil")?String(form.get("validUntil")):null,file=form.get("file");
 if(!requestId||!["CNI","PASSPORT","LOCATION_PLAN","HONOR_COMMITMENT"].includes(documentType)||!(file instanceof File))return fail("Dossier, type de document et fichier sont requis.");
 if(file.size<=0||file.size>MAX_BYTES)return fail("Le fichier doit être compris entre 1 octet et 10 Mo.");if(!MIME_EXT[file.type])return fail("Format accepté : PDF, JPG, PNG ou WEBP.");
 if(documentType==="CNI"&&!["FRONT","BACK"].includes(side||""))return fail("La CNI doit être fournie recto et verso.");if(documentType==="PASSPORT"&&side)return fail("Le passeport utilise une seule pièce d'identité.");
 if((documentType==="CNI"||documentType==="PASSPORT")&&!validUntil)return fail("La date d'expiration est obligatoire pour une pièce d'identité.");if(validUntil&&new Date(validUntil)<new Date(new Date().toDateString()))return fail("La pièce d'identité doit être en cours de validité.");
 const request=await owned(sb,u.id,requestId);if(!request)return fail("Dossier Mobility introuvable.",404);if(["INELIGIBLE","REJECTED","CANCELLED","CLOSED"].includes(String(request.status)))return fail("Ce dossier n'accepte plus de nouvelle pièce.");
 const path=u.id+"/"+requestId+"/"+documentType.toLowerCase()+"-"+(side?side.toLowerCase()+"-":"")+crypto.randomUUID()+"."+MIME_EXT[file.type];
 const bytes=new Uint8Array(await file.arrayBuffer());const up=await sb.storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:false});if(up.error)throw new Error(up.error.message);
 const {data:doc,error}=await sb.from("MobilityDocument").insert({mobilityRequestId:requestId,documentType,side,fileName:file.name,storagePath:path,mimeType:file.type,fileSize:file.size,validUntil,status:"PENDING",uploadedByUserId:u.id}).select("id,documentType,side,fileName,mimeType,fileSize,validUntil,status,createdAt,updatedAt").single();
 if(error){await sb.storage.from(BUCKET).remove([path]);throw new Error(error.message);}
 await sb.from("MobilityProcessEvent").insert({mobilityRequestId:requestId,actorUserId:u.id,actorRole:String(u.role||"TALENT"),eventType:"DOCUMENT_UPLOADED",fromStatus:request.status,toStatus:request.status,title:"Pièce ajoutée",description:documentType+(side?" ("+side+")":"")+" a été ajoutée au dossier.",metadata:{documentId:doc.id},visibleToTalent:true,visibleToRecruiter:true,visibleToInstitution:true});
 return NextResponse.json({document:doc},{status:201});
}catch(e){return fail(e instanceof Error?e.message:"Upload impossible.",500);}}
