import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildCEOIntelligence} from "@/lib/ceoIntelligence";
import {enforceApiRateLimit} from "@/lib/server-security";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{
  const auth=await getAuthUser(req); if(!auth)return NextResponse.json({error:"UNAUTHENTICATED",message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,auth);
  if(String(user.role)!=="ADMIN")return NextResponse.json({error:"FORBIDDEN",message:"Accès CEO réservé à l’administrateur."},{status:403});
  const limited=await enforceApiRateLimit(req,sb,{
   scope:"admin-jia-ceo-snapshot",identity:user.id,
   accountWindows:[{limit:10,windowSeconds:60},{limit:100,windowSeconds:3600}],
   ipWindows:[{limit:20,windowSeconds:60},{limit:200,windowSeconds:3600}],requireIp:true
  });
  if(limited)return limited;
  const snapshot=await buildCEOIntelligence(sb);
  await sb.from("CEOAuditLog").insert({adminUserId:user.id,action:"VIEW_CEO_SNAPSHOT",endpoint:"/api/admin/jia/ceo",metadata:{generatedAt:snapshot.generatedAt}});
  return NextResponse.json({snapshot});
 }catch(e){return NextResponse.json({error:"CEO_INTELLIGENCE_UNAVAILABLE",message:e instanceof Error?e.message:"Intelligence CEO indisponible."},{status:500});}
}
