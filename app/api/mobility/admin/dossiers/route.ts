import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser, requireRole } from "../../../../../lib/mobilityServer";

export async function GET(req: NextRequest) {
  try {
    const au=await authUser(req); if(!au) return NextResponse.json({message:"Session requise."},{status:401});
    const sb=adminClient(), u=await ensureUser(sb,au), denied=requireRole(u,["ADMIN"]);
    if(denied) return NextResponse.json({message:denied.error},{status:denied.status});
    const status=new URL(req.url).searchParams.get("status");
    let q=sb.from("MobilityRequest").select("id,userId,applicationId,recruiterUserId,departCity,arriveeCity,salaryApproved,salaryCurrency,costTotal,eligibilityThresholdPercent,eligibilityBurdenPercent,eligibilityStatus,eligibilityReason,currentStep,status,createdAt,updatedAt").order("createdAt",{ascending:false});
    if(status) q=q.eq("status",status);
    const {data,error}=await q; if(error) throw new Error(error.message);
    return NextResponse.json({requests:data||[]});
  } catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Lecture impossible."},{status:500});}
}
