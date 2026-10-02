import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {defaultWatchTargets,monAfriqueWatchTarget,watchExternal} from "@/lib/jia/watcher";
import { resolveAfricaCountryCode } from "@/lib/countries/africa";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  try{
    const sb=adminClient(),user=await ensureUser(sb,auth);
    const body=await req.json().catch(()=>({}));
    const action=typeof body?.action==="string"?body.action:"cycle";
    if(action==="preview_mon_afrique"){
      const countries=Array.from(new Set((Array.isArray(body?.countries)?body.countries:[]).map((value:unknown)=>resolveAfricaCountryCode(value)).filter((value):value is string=>Boolean(value))));
      if(!countries.length)return NextResponse.json({message:"Sélectionne au moins un pays africain."},{status:400});
      const target=monAfriqueWatchTarget(countries);
      return NextResponse.json({type:"JIA_MON_AFRIQUE_WATCH_PROPOSAL",requiresConfirmation:true,target});
    }
    if(action==="confirm_mon_afrique"){
      if(body?.confirmed!==true)return NextResponse.json({message:"La confirmation explicite est requise avant de démarrer cette veille."},{status:400});
      const countries=Array.from(new Set((Array.isArray(body?.countries)?body.countries:[]).map((value:unknown)=>resolveAfricaCountryCode(value)).filter((value):value is string=>Boolean(value))));
      if(!countries.length)return NextResponse.json({message:"Sélectionne au moins un pays africain."},{status:400});
      const result=await watchExternal(user.id,monAfriqueWatchTarget(countries));
      return NextResponse.json({type:"JIA_MON_AFRIQUE_WATCH_CONFIRMED",countries,result});
    }
    if(action==="stop_mon_afrique"){
      return NextResponse.json({type:"JIA_MON_AFRIQUE_WATCH_STOPPED",stopped:true});
    }
    const targets=defaultWatchTargets();
    const selected=typeof body?.key==="string"?targets.filter(t=>t.key===body.key):targets;
    const results=[];
    for(const target of selected) results.push(await watchExternal(user.id,target));
    return NextResponse.json({type:"JIA_WATCH_CYCLE",count:results.length,results});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Watcher indisponible."},{status:500});}
}
