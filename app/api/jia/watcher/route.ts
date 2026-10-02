import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { defaultWatchTargets, monAfriqueWatchTarget, runDueWatchSubscriptions, stopWatchSubscription, upsertWatchSubscription, watchExternal } from "@/lib/jia/watcher";
import { resolveAfricaCountryCode } from "@/lib/countries/africa";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  const auth=await getAuthUser(req);
  if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
  try{
    const sb=adminClient(),user=await ensureUser(sb,auth);
    const body=await req.json().catch(()=>({}));
    const action=typeof body?.action==="string"?body.action:"cycle";
    if(action==="preview_mon_afrique"){
      const countries=Array.from(new Set((Array.isArray(body?.countries)?body.countries:[]).map((value:unknown)=>resolveAfricaCountryCode(value)).filter((value):value is string=>Boolean(value))));
      if(!countries.length)return NextResponse.json({message:"Sélectionne au moins un pays africain."},{status:400});
      return NextResponse.json({type:"JIA_MON_AFRIQUE_WATCH_PROPOSAL",requiresConfirmation:true,target:monAfriqueWatchTarget(countries)});
    }
    if(action==="confirm_mon_afrique"){
      if(body?.confirmed!==true)return NextResponse.json({message:"La confirmation explicite est requise avant de démarrer cette veille."},{status:400});
      const countries=Array.from(new Set((Array.isArray(body?.countries)?body.countries:[]).map((value:unknown)=>resolveAfricaCountryCode(value)).filter((value):value is string=>Boolean(value))));
      if(!countries.length)return NextResponse.json({message:"Sélectionne au moins un pays africain."},{status:400});
      const target=monAfriqueWatchTarget(countries),subscription=await upsertWatchSubscription(user.id,target);
      const result=await watchExternal(user.id,target,subscription);
      return NextResponse.json({type:"JIA_MON_AFRIQUE_WATCH_CONFIRMED",countries,subscription,result});
    }
    if(action==="stop_mon_afrique"){
      const stopped=await stopWatchSubscription(user.id,"mon-afrique");
      return NextResponse.json({type:"JIA_MON_AFRIQUE_WATCH_STOPPED",stopped:Boolean(stopped),subscription:stopped});
    }
    if(action==="list"){
      const {data,error}=await sb.from("JiaWatchSubscription").select("*").eq("userId",user.id).order("createdAt",{ascending:false});
      if(error)throw new Error(error.message);
      return NextResponse.json({subscriptions:data??[]});
    }
    const targets=defaultWatchTargets(),selected=typeof body?.key==="string"?targets.filter(t=>t.key===body.key):targets,results=[];
    for(const target of selected)results.push(await watchExternal(user.id,target));
    return NextResponse.json({type:"JIA_WATCH_CYCLE",count:results.length,results});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Watcher indisponible."},{status:500});}
}
