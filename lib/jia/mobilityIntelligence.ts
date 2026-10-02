import type {SupabaseClient} from "@supabase/supabase-js";
export async function buildMobilityIntelligence(sb:SupabaseClient,userId:string){
 const {data,error}=await sb.from("MobilityRequest").select("id,departCity,arriveeCity,distanceKm,salary,costTotal,costMonthly,mobilityFit,status,currentStep,subventionPercent,createdAt,updatedAt").eq("userId",userId).order("updatedAt",{ascending:false}).limit(50);
 if(error)throw new Error(error.message);
 const rows=data||[];
 const avgFit=rows.length?Math.round(rows.reduce((n:number,r:any)=>n+Number(r.mobilityFit||0),0)/rows.length):null;
 const active=rows.filter((r:any)=>!["COMPLETED","CANCELLED","REJECTED"].includes(String(r.status).toUpperCase()));
 const opportunities:any[]=[];
 if(active.length)opportunities.push({id:"mobility-next-step",title:"Faire progresser le prochain dossier mobilité",reason:"Un dossier mobilité est encore actif."});
 if(avgFit!==null&&avgFit<70)opportunities.push({id:"mobility-fit",title:"Revoir le plan de mobilité",reason:"Le mobility fit moyen observé est inférieur à 70."});
 const totalCost=rows.reduce((n:number,r:any)=>n+Number(r.costTotal||0),0);
 return{generatedAt:new Date().toISOString(),status:rows.length?"CONNECTED":"NO_REQUESTS",metrics:{requests:rows.length,activeRequests:active.length,averageMobilityFit:avgFit,totalDeclaredCost:Math.round(totalCost)},requests:rows.map((r:any)=>({id:r.id,route:{from:r.departCity,to:r.arriveeCity},distanceKm:r.distanceKm,costTotal:r.costTotal,costMonthly:r.costMonthly,mobilityFit:r.mobilityFit,status:r.status,currentStep:r.currentStep,subventionPercent:r.subventionPercent,updatedAt:r.updatedAt})),opportunities,limitations:rows.length?[]:["Aucun dossier mobilité trouvé."]};
}
