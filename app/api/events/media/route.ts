import { NextRequest,NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient,getAuthUser } from "../../../../lib/server-auth";
import { EVENT_MEDIA_MAX_BYTES,EVENT_VIDEO_MAX_SECONDS } from "../../../../lib/events";
export async function POST(request:NextRequest){
  try{
    const auth=await getAuthUser(request);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
    const form=await request.formData(),file=form.get("file");
    if(!(file instanceof File))return NextResponse.json({message:"Fichier manquant."},{status:400});
    if(file.size<=0||file.size>EVENT_MEDIA_MAX_BYTES)return NextResponse.json({message:"Le média doit peser au maximum 10 MB."},{status:422});
    const type=file.type.startsWith("video/")?"VIDEO":file.type==="application/pdf"?"FLYER":file.type.startsWith("image/")?"IMAGE":null;
    if(!type)return NextResponse.json({message:"Format média non supporté."},{status:422});
    const bucket=process.env.JOBLY_EVENTS_BUCKET;
    if(!bucket)return NextResponse.json({message:"JOBLY_EVENTS_BUCKET n'est pas configuré."},{status:503});
    const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,8)||"bin";
    const path=auth.id+"/"+crypto.randomUUID()+"."+ext;
    const bytes=new Uint8Array(await file.arrayBuffer());
    const sb=adminClient();
    const {error}=await sb.storage.from(bucket).upload(path,bytes,{contentType:file.type,upsert:false});
    if(error)throw new Error(error.message);
    const publicUrl=sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return NextResponse.json({url:publicUrl,path,type,sizeBytes:file.size,maxVideoSeconds:EVENT_VIDEO_MAX_SECONDS});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Upload impossible."},{status:500});}
}
