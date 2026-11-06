import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildMobilityIntelligence} from "@/lib/jia/mobilityIntelligence";
import {enforceApiRateLimit} from "@/lib/server-security";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});const sb=adminClient(),user=await ensureUser(sb,auth);const limited=await enforceApiRateLimit(req,sb,{scope:"mobility-jia-intelligence",identity:user.id,accountWindows:[{limit:10,windowSeconds:60},{limit:60,windowSeconds:3600}],ipWindows:[{limit:20,windowSeconds:60},{limit:120,windowSeconds:3600}],requireIp:true});if(limited)return limited;return NextResponse.json({ok:true,intelligence:await buildMobilityIntelligence(sb,String(user.id))},{headers:{"Cache-Control":"private, no-store, max-age=0",Vary:"Authorization"}});}
 catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Intelligence Mobility indisponible."},{status:500});}
}
