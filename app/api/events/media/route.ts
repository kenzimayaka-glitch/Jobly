import { NextRequest,NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient,getAuthUser } from "../../../../lib/server-auth";
import { EVENT_MEDIA_MAX_BYTES,EVENT_VIDEO_MAX_SECONDS } from "../../../../lib/events";
import { inspectEventMedia } from "../../../../lib/eventMedia";

export const runtime = "nodejs";

export async function POST(request:NextRequest){
  try{
    const auth=await getAuthUser(request);
    if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
    const form=await request.formData(),file=form.get("file");
    if(!(file instanceof File))return NextResponse.json({message:"Fichier manquant."},{status:400});
    if(file.size<=0||file.size>EVENT_MEDIA_MAX_BYTES)return NextResponse.json({message:"Le média doit peser au maximum 10 MB."},{status:422});

    const bytes=new Uint8Array(await file.arrayBuffer());
    const inspected=inspectEventMedia(bytes,file.type);
    if(!inspected.ok)return NextResponse.json({message:inspected.error},{status:422});
    if(inspected.type==="VIDEO" && (inspected.durationSeconds===null || inspected.durationSeconds>EVENT_VIDEO_MAX_SECONDS)){
      return NextResponse.json({message:"La vidéo doit durer au maximum 30 secondes."},{status:422});
    }

    const bucket=process.env.JOBLY_EVENTS_BUCKET;
    if(!bucket)return NextResponse.json({message:"JOBLY_EVENTS_BUCKET n'est pas configuré."},{status:503});
    const path=auth.id+"/"+crypto.randomUUID()+"."+inspected.extension;
    const sb=adminClient();
    const {error}=await sb.storage.from(bucket).upload(path,bytes,{contentType:inspected.mimeType,upsert:false});
    if(error)throw new Error(error.message);
    const publicUrl=sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return NextResponse.json({
      url:publicUrl,
      path,
      type:inspected.type,
      mimeType:inspected.mimeType,
      sizeBytes:file.size,
      durationSeconds:inspected.durationSeconds,
      maxVideoSeconds:EVENT_VIDEO_MAX_SECONDS
    });
  }catch(e){
    return NextResponse.json({message:e instanceof Error?e.message:"Upload impossible."},{status:500});
  }
}
