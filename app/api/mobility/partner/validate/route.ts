import {NextRequest,NextResponse} from "next/server";
import {authUser,adminClient,ensureUser} from "../../../../../lib/mobilityServer";
import {getInstitutionSession} from "../../../../../lib/institution-auth";
import {institutionOwnsMobilityRequest} from "../../../../../lib/mobilityAccess";

export async function POST(req:NextRequest){
 try{
  const [au,institutionSession]=await Promise.all([authUser(req),getInstitutionSession(req)]);
  if(!au&&!institutionSession)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),u=au?await ensureUser(sb,au):null;
  const body=await req.json().catch(()=>({}));
  const requestId=String(body.requestId??"").trim();
  const pct=Number(body.subventionPercent);
  if(!requestId)return NextResponse.json({message:"requestId requis."},{status:400});
  if(!Number.isFinite(pct)||pct<0||pct>100)return NextResponse.json({message:"Pourcentage de subvention invalide."},{status:400});
  const isAdmin=String(u?.role??"").toUpperCase()==="ADMIN";
  if(!isAdmin){
   if(!institutionSession)return NextResponse.json({message:"Une session institutionnelle est requise pour valider une subvention."},{status:403});
   const authorized=await institutionOwnsMobilityRequest(sb,String(institutionSession.institution.id),requestId);
   if(!authorized)return NextResponse.json({message:"Ce dossier n'est pas rattaché à un programme de votre institution."},{status:403});
  }
  const {data,error}=await sb.from("MobilityRequest").update({
   subventionPercent:pct,currentStep:4,status:"SUBSIDY_VALIDATED",updatedAt:new Date().toISOString()
  }).eq("id",requestId).select("*").maybeSingle();
  if(error)throw new Error(error.message);
  if(!data)return NextResponse.json({message:"Dossier Mobility introuvable."},{status:404});
  return NextResponse.json({request:data});
 }catch(e){
  return NextResponse.json({message:e instanceof Error?e.message:"Validation impossible."},{status:500});
 }
}
