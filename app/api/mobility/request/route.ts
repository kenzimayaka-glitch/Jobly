import { NextRequest,NextResponse } from "next/server";
import crypto from "node:crypto";
import sharp from "sharp";
import { requirePremium } from "../../../../lib/mobilityServer";
import { CAMEROON_CITIES, calculateMobilityCosts, type CameroonCityKey } from "../../../../lib/gps";
export async function POST(req:NextRequest){try{const gate=await requirePremium(req);if("error"in gate)return NextResponse.json({message:gate.error},{status:gate.status});const b=await req.json();const depart=(b.departKey||"YAOUNDE") as CameroonCityKey,arrivee=(b.arriveeKey||"DOUALA") as CameroonCityKey,type=b.typeLocal||"CHAMBRE",salary=Number(b.salary||0);if(!CAMEROON_CITIES[depart]||!CAMEROON_CITIES[arrivee])return NextResponse.json({message:"Ville invalide."},{status:400});const costs=calculateMobilityCosts(depart,arrivee,type,salary);if(costs.total>Math.max(0,salary))return NextResponse.json({message:"Le budget Mobility dépasse le plafond autorisé (100% du salaire).",costs},{status:422});const company=CAMEROON_CITIES[arrivee];
    let cniWatermarked=false;
    let cniWatermarkedDataUrl: string | null = null;
    if(typeof b.cniDataUrl === "string" && b.cniDataUrl.startsWith("data:image/")){
      const base64=b.cniDataUrl.split(",")[1];
      if(base64){
        const svg=Buffer.from(`<svg width="600" height="380"><style>text{font-family:Arial;font-size:28px;font-weight:700;fill:#0A3D9C;opacity:.22}</style><text x="30" y="350">JOBLY MOBILITY • DOCUMENT PROTÉGÉ</text></svg>`);
        const out=await sharp(Buffer.from(base64,"base64")).composite([{input:svg,gravity:"southeast"}]).jpeg({quality:82}).toBuffer();
        cniWatermarked=true;cniWatermarkedDataUrl=`data:image/jpeg;base64,${out.toString("base64")}`;
      }
    }const {data,error}=await gate.sb.from("MobilityRequest").insert({id:crypto.randomUUID(),userId:gate.user.id,departCity:CAMEROON_CITIES[depart].name,arriveeCity:company.name,departLat:CAMEROON_CITIES[depart].lat,departLng:CAMEROON_CITIES[depart].lng,arriveeLat:company.lat,arriveeLng:company.lng,distanceKm:costs.distanceKm,housingType:type,salary,costTotal:costs.total,costMonthly:costs.monthly,mobilityFit:costs.mobilityFit,status:"DRAFT",currentStep:1,subventionPercent:0,cniWatermarked});if(error)throw new Error(error.message);return NextResponse.json({request:data,costs,cniWatermarkedDataUrl},{status:201});}catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Création impossible."},{status:500});}}
