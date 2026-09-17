import { NextRequest, NextResponse } from "next/server";
import { runAiGateway } from "../../../../lib/aiGateway";
export async function POST(req:NextRequest,{params}:{params:Promise<{operation:string}>}){try{const body=await req.json().catch(()=>({}));const r=await runAiGateway(req,(await params).operation,body);return NextResponse.json(r,{status:r.ok?200:r.status})}catch(e){return NextResponse.json({ok:false,message:e instanceof Error?e.message:"Service IA indisponible."},{status:500})}}
