import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildRecruiterIntelligence} from "@/lib/jia/recruiterIntelligence";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
 try{
  const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,auth);
  if(String(user.role)!=="RECRUITER")return NextResponse.json({message:"Accès Recruiter requis."},{status:403});
  const intelligence=await buildRecruiterIntelligence(sb,String(user.id));
  return NextResponse.json({ok:true,intelligence});
 }catch(error){
  return NextResponse.json({message:error instanceof Error?error.message:"Intelligence Recruiter indisponible."},{status:500});
 }
}
