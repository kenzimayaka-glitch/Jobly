import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { getActivePlanCode } from "../../../../lib/entitlements";

const BUCKET = "talent-ads";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set(["video/webm", "video/mp4", "video/quicktime"]);

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase serveur non configuré.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function auth(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase client non configuré.");
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await sb.auth.getUser(token);
  return data.user || null;
}
export async function POST(request: NextRequest) {
  try {
    const au = await auth(request); if (!au) return NextResponse.json({message:"Session requise."},{status:401});
    const sb = adminClient();
    const { data:user, error:userError } = await sb.from("User").select("id,advertisingVideoStoragePath").eq("authUserId",au.id).maybeSingle();
    if (userError || !user) return NextResponse.json({message:"Utilisateur introuvable."},{status:404});
    const plan = await getActivePlanCode(sb,user.id,"TALENT");
    const maxMs = plan === "PRO" ? 12000 : plan === "PREMIUM" ? 8000 : 0;
    if (!maxMs) return NextResponse.json({message:"La vidéo publicitaire Top Talent est réservée aux formules Pro et Premium."},{status:403});
    const form = await request.formData(); const file=form.get("file"); if (!(file instanceof File)) return NextResponse.json({message:"Vidéo manquante."},{status:400});
    if (!ALLOWED.has(file.type)) return NextResponse.json({message:"Format publicitaire accepté : WebM, MP4 ou MOV."},{status:415});
    if (file.size > MAX_BYTES) return NextResponse.json({message:"Vidéo publicitaire trop volumineuse."},{status:413});
    const durationMs=Number(form.get("durationMs")||0); if (!Number.isFinite(durationMs)||durationMs<1000||durationMs>maxMs) return NextResponse.json({message:`La vidéo publicitaire doit respecter la limite de ${maxMs/1000}s de ta formule.`},{status:422});
    const {data:buckets,error:be}=await sb.storage.listBuckets(); if(be) throw new Error(be.message);
    if(!buckets?.some(b=>b.name===BUCKET)){const {error:e}=await sb.storage.createBucket(BUCKET,{public:true,fileSizeLimit:`${MAX_BYTES}`,allowedMimeTypes:Array.from(ALLOWED)});if(e&&!/already exists/i.test(e.message))throw new Error(e.message);}
    const ext=file.type==="video/webm"?"webm":file.type==="video/quicktime"?"mov":"mp4"; const path=`${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const bytes=new Uint8Array(await file.arrayBuffer()); const {error:up}=await sb.storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:false,cacheControl:"31536000"}); if(up)throw new Error(up.message);
    const url=sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; const now=new Date().toISOString();
    const {error:update}=await sb.from("User").update({advertisingVideoUrl:url,advertisingVideoStoragePath:path,advertisingVideoDurationMs:Math.round(durationMs),advertisingVideoUpdatedAt:now,updatedAt:now}).eq("id",user.id);
    if(update){await sb.storage.from(BUCKET).remove([path]);throw new Error(update.message);}
    if(user.advertisingVideoStoragePath) await sb.storage.from(BUCKET).remove([user.advertisingVideoStoragePath]);
    return NextResponse.json({ok:true,advertisingVideoUrl:url,advertisingVideoDurationMs:Math.round(durationMs)});
  } catch(e) { return NextResponse.json({message:e instanceof Error?e.message:"Impossible de publier la vidéo publicitaire."},{status:500}); }
}
