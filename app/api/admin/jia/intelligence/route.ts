import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildAdminTransversalIntelligence} from "@/lib/jia/transversal";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{
  const auth=await getAuthUser(req);if(!auth)return NextResponse.json({error:"UNAUTHENTICATED",message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,auth);
  if(String(user.role)!=="ADMIN")return NextResponse.json({error:"FORBIDDEN",message:"Accès réservé à l’administrateur."},{status:403});
  const includeMarketWatch=req.nextUrl.searchParams.get("includeMarketWatch")==="true";
  const snapshot=await buildAdminTransversalIntelligence(sb,includeMarketWatch);
  const audit=await sb.from("CEOAuditLog").insert({adminUserId:user.id,action:"VIEW_TRANSVERSAL_JIA_INTELLIGENCE",endpoint:"/api/admin/jia/intelligence",metadata:{generatedAt:snapshot.generatedAt,layers:snapshot.layers.map(l=>l.layer)}});
  if(audit.error)throw new Error(audit.error.message);
  return NextResponse.json(snapshot);
 }catch(error){return NextResponse.json({error:"JIA_INTELLIGENCE_UNAVAILABLE",message:error instanceof Error?error.message:"Intelligence J’IA indisponible."},{status:500});}
}
