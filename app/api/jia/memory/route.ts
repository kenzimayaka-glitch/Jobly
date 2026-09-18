import {NextRequest,NextResponse} from "next/server";
import {adminClient,getAuthUser} from "@/lib/server-auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function DELETE(req:NextRequest){
  const auth=await getAuthUser(req); if(!auth)return NextResponse.json({error:"Session requise."},{status:401});
  const sb=adminClient(),{data:user,error:userError}=await sb.from("User").select("id").eq("id",auth.id).maybeSingle();
  if(userError||!user)return NextResponse.json({error:"Utilisateur introuvable."},{status:404});
  const {error}=await sb.rpc("purge_jia_memory",{p_user_id:user.id});
  if(error)return NextResponse.json({error:"Impossible de supprimer la mémoire J’IA."},{status:500});
  return NextResponse.json({ok:true,deleted:true});
}
