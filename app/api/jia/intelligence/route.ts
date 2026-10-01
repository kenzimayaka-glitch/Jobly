import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildUserTransversalIntelligence,buildAdminTransversalIntelligence} from "@/lib/jia/transversal";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const ECOSYSTEMS=["TALENT","RECRUITER","PARTNER","MOBILITY","COMMUNITY","BUSINESS","ADMIN"] as const;
export async function GET(req:NextRequest){
 try{
  const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,auth);
  const ecosystem=(req.nextUrl.searchParams.get("ecosystem")||"TALENT").toUpperCase();
  if(!ECOSYSTEMS.includes(ecosystem as typeof ECOSYSTEMS[number]))return NextResponse.json({message:"Écosystème invalide."},{status:400});
  if(ecosystem==="ADMIN"&&String(user.role)!=="ADMIN")return NextResponse.json({message:"Accès ADMIN requis."},{status:403});
  const snapshot=ecosystem==="ADMIN"?await buildAdminTransversalIntelligence(sb,req.nextUrl.searchParams.get("includeMarketWatch")==="true"):await buildUserTransversalIntelligence(sb,String(user.id),ecosystem);
  return NextResponse.json({ok:true,ecosystem,snapshot});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Intelligence transversale indisponible."},{status:500});}
}
