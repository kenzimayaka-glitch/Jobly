import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {runUnifiedCognitiveCycle} from "@/lib/jia/runtime";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const sb=adminClient(),user=await ensureUser(sb,auth);
  if(!user.privacyAcceptedAt)return NextResponse.json({message:"Le consentement de confidentialité est requis pour J’IA."},{status:403});
  const body=await req.json().catch(()=>({}));
  const values=["TALENT","RECRUITER","PARTNER","MOBILITY","COMMUNITY","BUSINESS","ADMIN"] as const;
  const ecosystem=values.includes(body?.ecosystem)?body.ecosystem:"TALENT";
  if(ecosystem==="ADMIN"&&String(user.role)!=="ADMIN")return NextResponse.json({message:"Accès ADMIN requis."},{status:403});
  const result=await runUnifiedCognitiveCycle(sb,{userId:String(user.id),ecosystem,path:typeof body?.path==="string"?body.path:"",action:typeof body?.action==="string"?body.action:"",message:typeof body?.message==="string"?body.message:"",internetQuery:typeof body?.internetQuery==="string"?body.internetQuery:undefined,includeInternet:body?.includeInternet===true});
  return NextResponse.json(result);
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Cycle cognitif indisponible."},{status:500});}
}
