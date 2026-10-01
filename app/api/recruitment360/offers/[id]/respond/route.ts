import { NextRequest,NextResponse } from "next/server";
import { adminClient,ensureUser,getAuthUser } from "../../../../../lib/server-auth";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await getAuthUser(req);if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const {id}=await params;const sb=adminClient(),u=await ensureUser(sb,auth),b=await req.json();
  const {data,error}=await sb.rpc("recruitment360_lot6_respond_offer",{p_offer_id:id,p_actor_user_id:u.id,p_action:b.action,p_salary:b.salary==null?null:Number(b.salary),p_channel:b.channel||"JOBLY",p_message:b.message||null,p_service_date:b.serviceDate||null});
  if(error)throw new Error(error.message);
  return NextResponse.json({offer:data});
 }catch(e){const m=e instanceof Error?e.message:"Impossible de répondre à l'offre.";return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:400});}
}
