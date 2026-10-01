import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime="nodejs";

function makePdf(report:any){
 return new Promise<Buffer>((resolve,reject)=>{
  const doc=new PDFDocument({margin:48});
  const chunks:Buffer[]=[];
  doc.on("data",(chunk:Buffer)=>chunks.push(chunk));
  doc.on("error",reject);
  doc.on("end",()=>resolve(Buffer.concat(chunks)));
  const job=report?.job||{};
  const metrics=report?.metrics||{};
  doc.fontSize(20).text("JOBLY — Rapport de recrutement 360°");
  doc.moveDown(.4).fontSize(13).text(job.title||"Recrutement");
  doc.fontSize(11).text([job.companyName,job.location,job.contract,job.mode].filter(Boolean).join(" · "));
  doc.moveDown();
  doc.fontSize(14).text("Synthèse");
  doc.fontSize(11).text(`Candidatures : ${metrics.applicationCount??0}`);
  doc.text(`Embauchés : ${metrics.completedCount??0}`);
  doc.text(`Refusés : ${metrics.rejectedCount??0}`);
  doc.text(`Vivier : ${metrics.poolCount??0}`);
  doc.text(`Retraits : ${metrics.withdrawnCount??0}`);
  doc.moveDown();
  doc.fontSize(14).text("Entonnoir");
  Object.entries(report?.funnel||{}).forEach(([state,count])=>doc.fontSize(10).text(`${state} : ${count}`));
  doc.moveDown();
  doc.fontSize(14).text("Avis publiés");
  doc.fontSize(10).text(`Processus : ${report?.reviews?.processAverage??"—"}/5 · Expérience : ${report?.reviews?.experienceAverage??"—"}/5 · Jobly : ${report?.reviews?.joblyAverage??"—"}/5`);
  doc.moveDown();
  doc.fontSize(14).text("Candidatures");
  (report?.applications||[]).forEach((a:any)=>{
   doc.fontSize(10).text(`${a.candidateName||"Candidat"} — ${a.state||"—"} — ATS ${a.atsScore??"—"} — score ${a.scoreTotal??"—"} — issue ${a.decisionOutcome??"—"}`);
  });
  doc.moveDown();
  doc.fontSize(8).fillColor("#666").text("Rapport généré par Jobly. Les coordonnées, justificatifs, liens CV et informations salariales sensibles ne sont pas inclus dans ce partage.");
  doc.end();
 });
}

export async function GET(req:NextRequest){
 const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
 try{
  const sb=adminClient(),user=await ensureUser(sb,auth),id=req.nextUrl.searchParams.get("recruitmentId");
  if(!id)return NextResponse.json({message:"RECRUITMENT_ID_REQUIRED"},{status:400});
  const {data:report,error}=await sb.rpc("recruitment360_lot7_get_report",{p_recruitment_id:id,p_actor_user_id:user.id});
  if(error)throw new Error(error.message);
  const pdf=await makePdf(report);
  return new Response(pdf,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="jobly-recrutement-360-${id}.pdf"`,"Cache-Control":"private, no-store"}});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Erreur."},{status:500});}
}
