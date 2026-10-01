import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildPartnerIntelligence} from "@/lib/jia/partnerIntelligence";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});const sb=adminClient(),user=await ensureUser(sb,auth);if(String(user.role)!=="PARTNER")return NextResponse.json({message:"Accès Partner requis."},{status:403});return NextResponse.json({ok:true,intelligence:await buildPartnerIntelligence(sb,String(user.id))});}
 catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Intelligence Partner indisponible."},{status:500});}
}
