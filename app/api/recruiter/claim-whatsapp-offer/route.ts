import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, getRecruiterProfileForAuthUser } from "@/lib/server-auth";
import { resolveApplicationContact } from "@/lib/applicationEngine";
import { normalizePhoneNumber } from "@/lib/phoneNumber";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
 try {
  const auth=await getAuthUser(request);
  if(!auth) return NextResponse.json({message:"Session recruteur requise."},{status:401});
  const db=adminClient(); const user=await ensureUser(db,auth);
  const recruiterProfile=user.role==="ADMIN"?null:await getRecruiterProfileForAuthUser(db,auth.id,user.id);
  if(user.role!=="ADMIN"&&user.role!=="RECRUITER"&&!recruiterProfile) return NextResponse.json({message:"Espace recruteur requis."},{status:403});
  const body=await request.json().catch(()=>({})); const token=typeof body.shareToken==="string"?body.shareToken.trim():"";
  if(!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return NextResponse.json({message:"Lien de conversion invalide."},{status:400});
  const {data:share,error:se}=await db.from("CVShare").select("id,userId,jobId,source,expiresAt,revokedAt,companyNameSnapshot").eq("token",token).maybeSingle();
  if(se) throw new Error(se.message);
  if(!share||share.revokedAt||(share.expiresAt&&new Date(share.expiresAt).getTime()<=Date.now())) return NextResponse.json({message:"Lien expiré ou révoqué."},{status:404});
  const match=typeof share.source==="string"?share.source.match(/^WHATSAPP_APPLICATION:([0-9a-f-]{36})$/i):null;
  if(!match) return NextResponse.json({message:"Contexte de candidature invalide."},{status:404});
  const {data:app,error:ae}=await db.from("Application").select("id,userId,jobId,recruiterJobId").eq("id",match[1]).eq("userId",share.userId).maybeSingle();
  if(ae) throw new Error(ae.message); if(!app) return NextResponse.json({message:"Candidature introuvable."},{status:404});
  if(app.recruiterJobId&&!app.jobId) {
   const {data:owned,error}=await db.from("RecruiterJob").select("id,recruiterUserId").eq("id",app.recruiterJobId).maybeSingle();
   if(error) throw new Error(error.message);
   if(owned && owned.recruiterUserId===user.id) return NextResponse.json({claimed:true,idempotent:true,recruiterJobId:owned.id});
   return NextResponse.json({message:"Offre déjà rattachée à un autre recruteur.",code:"ALREADY_CLAIMED"},{status:409});
  }
  if(!share.jobId||app.jobId!==share.jobId||app.recruiterJobId) return NextResponse.json({message:"Contexte offre/candidature invalide."},{status:409});
  const {data:offer,error:oe}=await db.from("Job").select("*").eq("id",share.jobId).maybeSingle();
  if(oe) throw new Error(oe.message); if(!offer) return NextResponse.json({message:"Offre introuvable."},{status:404});
  const {data:reg,error:re}=await db.from("User").select("signupPhone,country").eq("id",user.id).maybeSingle();
  if(re) throw new Error(re.message);
  const contact=resolveApplicationContact(offer.applicationProfile&&typeof offer.applicationProfile==="object"?offer.applicationProfile:{},String(offer.description||""));
  const registeredPhone=normalizePhoneNumber(reg?.signupPhone||null,reg?.country||null);
  const offerPhone=normalizePhoneNumber(contact.phone,offer.countryCode||reg?.country||null);
  if(!registeredPhone||!offerPhone||registeredPhone!==offerPhone) {
   const {error}=await db.from("RecruiterOfferClaim").upsert({sourceShareId:share.id,sourceJobId:share.jobId,applicationId:app.id,recruiterUserId:user.id,registeredPhone,offerPhone,status:"PENDING"},{onConflict:"sourceShareId,recruiterUserId"});
   if(error) throw new Error(error.message);
   return NextResponse.json({claimed:false,code:"PHONE_MISMATCH",manualReviewRequested:true,message:"Une vérification manuelle du numéro est nécessaire."},{status:409,headers:{"Cache-Control":"no-store, private"}});
  }
  const {data:rpc,error:rpcError}=await db.rpc("claim_whatsapp_recruiter_offer",{p_share_id:share.id,p_application_id:app.id,p_recruiter_user_id:user.id,p_recruiter_phone:registeredPhone,p_offer_phone:offerPhone,p_company_name:recruiterProfile?.companyName||share.companyNameSnapshot||"Mon entreprise"});
  if(rpcError) throw new Error(rpcError.message);
  const result=Array.isArray(rpc)?rpc[0]:rpc;
  if(result?.status!=="CLAIMED") return NextResponse.json({claimed:false,code:String(result?.status||"CLAIM_FAILED"),message:"Rattachement impossible."},{status:409});
  return NextResponse.json({claimed:true,idempotent:Boolean(result.idempotent),recruiterJobId:result.recruiterJobId,applicationId:result.applicationId},{headers:{"Cache-Control":"no-store, private"}});
 } catch(error) { return NextResponse.json({message:error instanceof Error?error.message:"Impossible de rattacher l'offre."},{status:500,headers:{"Cache-Control":"no-store, private"}}); }
}
