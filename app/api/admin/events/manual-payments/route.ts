import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

const fail=(message:string,status=400,code="MANUAL_PAYMENT_ADMIN_ERROR")=>NextResponse.json({message,error:code},{status});

async function requireFinance(request:NextRequest){
  const auth=await getAuthUser(request);
  if(!auth)return {error:fail("Session requise.",401,"UNAUTHENTICATED")};
  const sb=adminClient();
  const user=await ensureUser(sb,auth);
  if(!["ADMIN","FINANCE"].includes(String(user.role)))return {error:fail("Accès réservé à ADMIN/FINANCE.",403,"FORBIDDEN")};
  return {sb,user};
}

export async function GET(request:NextRequest){
  try{
    const gate=await requireFinance(request);
    if("error" in gate)return gate.error;
    const status=String(request.nextUrl.searchParams.get("status")||"SUBMITTED").toUpperCase();
    if(!["SUBMITTED","APPROVED","REJECTED"].includes(status))return fail("Filtre de statut invalide.",422,"STATUS_INVALID");
    const {data:submissions,error}=await gate.sb.from("EventManualPaymentSubmission")
      .select("*").eq("status",status).order("submittedAt",{ascending:false}).limit(100);
    if(error)throw new Error(error.message);
    const rows=submissions??[];
    if(!rows.length)return NextResponse.json({submissions:[]});
    const paymentIds=rows.map(x=>x.paymentId);
    const eventIds=[...new Set(rows.map(x=>x.eventId))];
    const userIds=[...new Set(rows.map(x=>x.userId))];
    const [{data:payments,error:paymentsError},{data:events,error:eventsError},{data:users,error:usersError}]=await Promise.all([
      gate.sb.from("Payment").select("id,amount,currency,status,feature,provider").in("id",paymentIds),
      gate.sb.from("Event").select("id,title,organizerName,city,status").in("id",eventIds),
      gate.sb.from("User").select("id,displayName,email,phone").in("id",userIds),
    ]);
    if(paymentsError)throw new Error(paymentsError.message);
    if(eventsError)throw new Error(eventsError.message);
    if(usersError)throw new Error(usersError.message);
    const bucket=process.env.JOBLY_EVENTS_BUCKET||"jobly-events";
    const submissionsWithContext=rows.map(row=>{
      const proofUrl=gate.sb.storage.from(bucket).getPublicUrl(row.proofPath).data.publicUrl;
      return {
        ...row,
        proofUrl,
        payment:(payments??[]).find(x=>x.id===row.paymentId)??null,
        event:(events??[]).find(x=>x.id===row.eventId)??null,
        user:(users??[]).find(x=>x.id===row.userId)??null,
      };
    });
    return NextResponse.json({submissions:submissionsWithContext});
  }catch(error){
    return fail(error instanceof Error?error.message:"Chargements des justificatifs impossible.",500);
  }
}
