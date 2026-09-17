import { NextRequest, NextResponse } from "next/server";
import { calculateMobilityCosts, type CameroonCityKey } from "../../../../lib/gps";
import { CAMEROON_CITIES } from "../../../../lib/cities";
const valid=(x:string)=>x in CAMEROON_CITIES;
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams; const depart=(q.get("depart")||"YAOUNDE") as CameroonCityKey; const arrivee=(q.get("arrivee")||"DOUALA") as CameroonCityKey; const type=(q.get("type")||"CHAMBRE") as "CHAMBRE"|"STUDIO"|"APPART"; const salary=Number(q.get("salary")||500000);
 if(!valid(depart)||!valid(arrivee)||!['CHAMBRE','STUDIO','APPART'].includes(type)) return NextResponse.json({message:"Paramètres invalides."},{status:400});
 return NextResponse.json(calculateMobilityCosts(depart,arrivee,type,salary));
}
