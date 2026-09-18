import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildCEOIntelligence} from "@/lib/ceoIntelligence";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{
  const auth=await getAuthUser(req); if(!auth)return NextResponse.json({error:"UNAUTHENTICATED",message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,auth);
  if(String(user.role)!=="ADMIN")return NextResponse.json({error:"FORBIDDEN",message:"Accès CEO réservé à l’administrateur."},{status:403});
  const snapshot=await buildCEOIntelligence(sb);
  await sb.from("CEOAuditLog").insert({adminUserId:user.id,action:"VIEW_CEO_SNAPSHOT",endpoint:"/api/admin/jia/ceo",metadata:{generatedAt:snapshot.generatedAt}});
  return NextResponse.json({snapshot});
 }catch(e){return NextResponse.json({error:"CEO_INTELLIGENCE_UNAVAILABLE",message:e instanceof Error?e.message:"Intelligence CEO indisponible."},{status:500});}
}
