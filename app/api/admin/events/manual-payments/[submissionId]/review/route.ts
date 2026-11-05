import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../lib/server-auth";

const fail=(message:string,status=400,code="MANUAL_PAYMENT_REVIEW_ERROR")=>NextResponse.json({message,error:code},{status});

export async function POST(request:NextRequest,context:{params:Promise<{submissionId:string}>}){
  try{
    const auth=await getAuthUser(request);
    if(!auth)return fail("Session requise.",401,"UNAUTHENTICATED");
    const sb=adminClient();
    const user=await ensureUser(sb,auth);
    if(!["ADMIN","FINANCE"].includes(String(user.role)))return fail("Accès réservé à ADMIN/FINANCE.",403,"FORBIDDEN");
    const {submissionId}=await context.params;
    const body=await request.json().catch(()=>({}));
    const decision=String(body.decision??"").toUpperCase();
    const approved=decision==="APPROVE";
    if(!approved&&decision!=="REJECT")return fail("Décision invalide.",422,"DECISION_INVALID");
    const reviewNote=String(body.reviewNote??"").trim().slice(0,1000);
    if(!approved&&reviewNote.length<4)return fail("Indiquez le motif du rejet.",422,"REJECTION_REASON_REQUIRED");
    const {data:result,error}=await sb.rpc("finalize_event_manual_payment",{
      p_submission_id:submissionId,
      p_admin_user_id:user.id,
      p_approved:approved,
      p_review_note:reviewNote||null
    });
    if(error){
      const message=error.message||"";
      if(message.includes("MANUAL_PAYMENT_ALREADY_REVIEWED"))return fail("Ce justificatif a déjà été traité.",409,"ALREADY_REVIEWED");
      if(message.includes("MANUAL_PAYMENT_SUBMISSION_NOT_FOUND"))return fail("Justificatif introuvable.",404,"SUBMISSION_NOT_FOUND");
      if(message.includes("MANUAL_PAYMENT_REVIEW_FORBIDDEN"))return fail("Action réservée à ADMIN/FINANCE.",403,"FORBIDDEN");
      throw new Error(message);
    }
    return NextResponse.json({result,message:approved?"Paiement validé ; publication ou mise en avant activée.":"Paiement rejeté ; cible désactivée."});
  }catch(error){
    return fail(error instanceof Error?error.message:"Validation impossible.",500);
  }
}
