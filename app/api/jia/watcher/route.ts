import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {defaultWatchTargets,watchExternal} from "@/lib/jia/watcher";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  try{
    const sb=adminClient(),user=await ensureUser(sb,auth);
    const body=await req.json().catch(()=>({}));
    const targets=defaultWatchTargets();
    const selected=typeof body?.key==="string"?targets.filter(t=>t.key===body.key):targets;
    const results=[];
    for(const target of selected) results.push(await watchExternal(user.id,target));
    return NextResponse.json({type:"JIA_WATCH_CYCLE",count:results.length,results});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Watcher indisponible."},{status:500});}
}
