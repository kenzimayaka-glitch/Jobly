import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {listJiaTools,checkJiaToolAccess} from "@/lib/jia/toolRegistry";
import {type JiaEcosystem,type JiaPermissionLevel} from "@/lib/jia/policy";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const ecosystems:["TALENT","RECRUITER","PARTNER","MOBILITY","COMMUNITY","BUSINESS","ADMIN"] = ["TALENT","RECRUITER","PARTNER","MOBILITY","COMMUNITY","BUSINESS","ADMIN"];
const level:"PREPARE"="PREPARE";

export async function GET(req:NextRequest){
 try{
  const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,auth);
  const requested=(req.nextUrl.searchParams.get("ecosystem")||"TALENT").toUpperCase();
  const ecosystem=ecosystems.includes(requested as JiaEcosystem)?requested as JiaEcosystem:"TALENT";
  if(ecosystem==="ADMIN"&&String(user.role)!=="ADMIN")return NextResponse.json({message:"Accès ADMIN requis."},{status:403});
  const permission: JiaPermissionLevel = level;
  const tools=listJiaTools().map(tool=>({tool,access:checkJiaToolAccess({toolId:tool.id,level:permission,ecosystem,consent:false})}));
  return NextResponse.json({ok:true,ecosystem,permission,tools});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Registre d’outils indisponible."},{status:500});}
}
