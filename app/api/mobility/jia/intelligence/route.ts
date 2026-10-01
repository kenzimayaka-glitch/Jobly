import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildMobilityIntelligence} from "@/lib/jia/mobilityIntelligence";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});const sb=adminClient(),user=await ensureUser(sb,auth);return NextResponse.json({ok:true,intelligence:await buildMobilityIntelligence(sb,String(user.id))});}
 catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Intelligence Mobility indisponible."},{status:500});}
}
