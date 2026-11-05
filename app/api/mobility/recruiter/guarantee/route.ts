import {NextRequest,NextResponse} from "next/server";
import {authUser,adminClient,ensureUser} from "../../../../../lib/mobilityServer";
import {mayGuaranteeMobilityRequest} from "../../../../../lib/mobilityAccess";

export async function POST(req:NextRequest){
 try{
  const au=await authUser(req);
  if(!au)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),u=await ensureUser(sb,au),body=await req.json().catch(()=>({}));
  const requestId=String(body.requestId??"").trim();
  if(!requestId)return NextResponse.json({message:"requestId requis."},{status:400});

  const {data:mobilityRequest,error:requestError}=await sb.from("MobilityRequest")
   .select("id,recruiterUserId,applicationId,companyAgreementId")
   .eq("id",requestId).maybeSingle();
  if(requestError)throw new Error(requestError.message);
  if(!mobilityRequest)return NextResponse.json({message:"Dossier Mobility introuvable."},{status:404});

  let agreementRecruiterUserId:string|null=null;
  let applicationRecruiterUserId:string|null=null;
  if(mobilityRequest.companyAgreementId){
   const {data:agreement,error}=await sb.from("MobilityCompanyAgreement").select("recruiterUserId")
    .eq("id",mobilityRequest.companyAgreementId).maybeSingle();
   if(error)throw new Error(error.message);
   agreementRecruiterUserId=agreement?.recruiterUserId??null;
  }
  if(mobilityRequest.applicationId){
   const {data:application,error}=await sb.from("Application").select("recruiterJobId")
    .eq("id",mobilityRequest.applicationId).maybeSingle();
   if(error)throw new Error(error.message);
   if(application?.recruiterJobId){
    const {data:job,error:jobError}=await sb.from("RecruiterJob").select("recruiterUserId")
     .eq("id",application.recruiterJobId).maybeSingle();
    if(jobError)throw new Error(jobError.message);
    applicationRecruiterUserId=job?.recruiterUserId??null;
   }
  }
  const authorized=mayGuaranteeMobilityRequest(u.role,String(u.id),{
   requestRecruiterUserId:mobilityRequest.recruiterUserId,
   agreementRecruiterUserId,
   applicationRecruiterUserId,
  });
  if(!authorized)return NextResponse.json({message:"Accès recruteur refusé pour ce dossier."},{status:403});

  const {data,error}=await sb.from("MobilityRequest").update({
   recruiterGuaranteed:true,currentStep:3,status:"GUARANTEED",updatedAt:new Date().toISOString(),
  }).eq("id",requestId).select("*").single();
  if(error)throw new Error(error.message);
  return NextResponse.json({request:data});
 }catch(e){
  return NextResponse.json({message:e instanceof Error?e.message:"Garantie impossible."},{status:500});
 }
}
