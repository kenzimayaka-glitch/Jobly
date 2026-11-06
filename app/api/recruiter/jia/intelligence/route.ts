import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildRecruiterIntelligence} from "@/lib/jia/recruiterIntelligence";
import {enforceApiRateLimit} from "@/lib/server-security";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
 try{
  const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,auth);
  if(String(user.role)!=="RECRUITER")return NextResponse.json({message:"Accès Recruiter requis."},{status:403});
  const limited=await enforceApiRateLimit(req,sb,{
    scope:"recruiter-jia-intelligence",identity:user.id,
    accountWindows:[{limit:10,windowSeconds:60},{limit:60,windowSeconds:3600}],
    ipWindows:[{limit:20,windowSeconds:60},{limit:120,windowSeconds:3600}],requireIp:true
  });
  if(limited)return limited;
  const intelligence=await buildRecruiterIntelligence(sb,String(user.id));
  return NextResponse.json({ok:true,intelligence},{headers:{"Cache-Control":"private, no-store, max-age=0",Vary:"Authorization"}});
 }catch(error){
  return NextResponse.json({message:error instanceof Error?error.message:"Intelligence Recruiter indisponible."},{status:500});
 }
}
