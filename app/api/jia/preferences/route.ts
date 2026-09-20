import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ECOSYSTEMS = new Set(["TALENT","RECRUITER","PARTNER"]);
const MODES = new Set(["text","voice"]);

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req); if (!auth) return NextResponse.json({message:"Session requise."},{status:401});
    const sb=adminClient(), user=await ensureUser(sb,auth);
    const ecosystem=(req.nextUrl.searchParams.get("ecosystem")||"TALENT").toUpperCase();
    if(!ECOSYSTEMS.has(ecosystem)) return NextResponse.json({message:"Écosystème invalide."},{status:400});
    const {data,error}=await sb.from("jia_preferences").select("access_enabled,interaction_mode,notification_mode,proactive_recommendations").eq("user_id",user.id).eq("ecosystem",ecosystem).maybeSingle();
    if(error) throw new Error(error.message);
    return NextResponse.json(data||{access_enabled:true,interaction_mode:"text",notification_mode:"text",proactive_recommendations:true});
  } catch(e){ return NextResponse.json({message:e instanceof Error?e.message:"Préférences J’IA indisponibles."},{status:500}); }
}

export async function PUT(req: NextRequest) {
  try {
    const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
    const sb=adminClient(),user=await ensureUser(sb,auth),body=await req.json().catch(()=>({}));
    const ecosystem=String(body?.ecosystem||"TALENT").toUpperCase();
    if(!ECOSYSTEMS.has(ecosystem))return NextResponse.json({message:"Écosystème invalide."},{status:400});
    const value={
      user_id:user.id, ecosystem,
      access_enabled:body?.access_enabled!==false,
      interaction_mode:MODES.has(body?.interaction_mode)?body.interaction_mode:"text",
      notification_mode:MODES.has(body?.notification_mode)?body.notification_mode:"text",
      proactive_recommendations:body?.proactive_recommendations!==false,
      updated_at:new Date().toISOString()
    };
    const {data,error}=await sb.from("jia_preferences").upsert(value,{onConflict:"user_id,ecosystem"}).select("access_enabled,interaction_mode,notification_mode,proactive_recommendations").single();
    if(error)throw new Error(error.message);
    return NextResponse.json(data);
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Impossible d’enregistrer."},{status:500});}
}
