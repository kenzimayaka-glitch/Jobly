import {NextRequest,NextResponse} from "next/server";
import {authUser,adminClient,ensureUser} from "../../../../../lib/mobilityServer";
import {getUserMobilityInstitutionIds,institutionOwnsMobilityRequest} from "../../../../../lib/mobilityAccess";

export async function POST(req:NextRequest){
 try{
  const au=await authUser(req);
  if(!au)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),u=await ensureUser(sb,au);
  const body=await req.json().catch(()=>({}));
  const requestId=String(body.requestId??"").trim();
  const pct=Number(body.subventionPercent);
  if(!requestId)return NextResponse.json({message:"requestId requis."},{status:400});
  if(!Number.isFinite(pct)||pct<0||pct>100)return NextResponse.json({message:"Pourcentage de subvention invalide."},{status:400});

  const isAdmin=String(u.role??"").toUpperCase()==="ADMIN";
  if(!isAdmin){
   const institutionIds=await getUserMobilityInstitutionIds(sb,String(u.id));
   let authorized=false;
   for(const institutionId of institutionIds){
    if(await institutionOwnsMobilityRequest(sb,institutionId,requestId)){authorized=true;break;}
   }
   if(!authorized)return NextResponse.json({message:"Accès refusé : membre actif INSTITUTION_ADMIN requis sur le programme de ce dossier."},{status:403});
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
