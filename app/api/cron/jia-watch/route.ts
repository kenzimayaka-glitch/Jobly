import { NextRequest, NextResponse } from "next/server";
import { runDueWatchSubscriptions } from "@/lib/jia/watcher";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;
  if(secret&&req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({message:"Non autorisé."},{status:401});
  try{
    const results=await runDueWatchSubscriptions(20);
    return NextResponse.json({ok:true,processed:results.length,results});
  }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"J’IA Watch Cron indisponible."},{status:500});}
}
