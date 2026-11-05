import {NextRequest,NextResponse} from "next/server";
import ExcelJS from "exceljs";
import {authUser,adminClient,ensureUser} from "../../../../../lib/mobilityServer";
import {getInstitutionMobilityRequestIds,getRecruiterMobilityRequestIds,getUserMobilityInstitutionIds} from "../../../../../lib/mobilityAccess";

export async function GET(req:NextRequest){
 try{
  const au=await authUser(req);
  if(!au)return NextResponse.json({message:"Session requise."},{status:401});
  const sb=adminClient(),user=await ensureUser(sb,au);
  const isAdmin=String(user.role??"").toUpperCase()==="ADMIN";
  const requestIds=new Set<string>();
  let canAccessReport=isAdmin||String(user.role??"").toUpperCase()==="RECRUITER";

  if(!isAdmin){
   const recruiterIds=await getRecruiterMobilityRequestIds(sb,String(user.id));
   recruiterIds.forEach(id=>requestIds.add(id));
   const institutionIds=await getUserMobilityInstitutionIds(sb,String(user.id));
   for(const institutionId of institutionIds){
    const ids=await getInstitutionMobilityRequestIds(sb,institutionId);
    ids.forEach(id=>requestIds.add(id));
   }
   if(institutionIds.length)canAccessReport=true;
  }
  if(!canAccessReport)return NextResponse.json({message:"Accès refusé : aucun rattachement recruteur ou institutionnel."},{status:403});

  let query=sb.from("MobilityRequest")
   .select("id,departCity,arriveeCity,distanceKm,costTotal,subventionPercent,status,createdAt")
   .order("createdAt",{ascending:false});
  if(!isAdmin){
   const ids=[...requestIds];
   if(!ids.length)return exportRows([],req);
   query=query.in("id",ids);
  }
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  return exportRows(data??[],req);
 }catch(e){
  return NextResponse.json({message:e instanceof Error?e.message:"Rapport indisponible."},{status:500});
 }
}

async function exportRows(rows:any[],req:NextRequest){
 if(req.nextUrl.searchParams.get("format")==="xlsx"){
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet("Mobility");
  ws.columns=[
   {header:"ID",key:"id"},{header:"Départ",key:"departCity"},{header:"Arrivée",key:"arriveeCity"},
   {header:"Distance km",key:"distanceKm"},{header:"Coût total",key:"costTotal"},
   {header:"Subvention %",key:"subventionPercent"},{header:"Statut",key:"status"},{header:"Créé le",key:"createdAt"}
  ];
  ws.addRows(rows);
  const buffer=await wb.xlsx.writeBuffer();
  return new NextResponse(buffer,{headers:{
   "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   "Content-Disposition":"attachment; filename=jobly-mobility-report.xlsx"
  }});
 }
 const header="id;depart;arrivee;distanceKm;costTotal;subventionPercent;status;createdAt\n";
 const csv=header+rows.map(r=>[r.id,r.departCity,r.arriveeCity,r.distanceKm,r.costTotal,r.subventionPercent,r.status,r.createdAt]
  .map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(";")).join("\n");
 return new NextResponse(csv,{headers:{
  "Content-Type":"text/csv; charset=utf-8",
  "Content-Disposition":"attachment; filename=jobly-mobility-report.csv"
 }});
}
