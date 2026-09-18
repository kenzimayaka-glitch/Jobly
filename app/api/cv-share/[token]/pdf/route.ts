import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { adminClient } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = adminClient();
  const { data: share } = await supabase.from("CVShare").select("*").eq("token", token).maybeSingle();
  if (!share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now())) return new NextResponse("CV indisponible.", { status: 404 });

  const [u,p,e,s,ed] = await Promise.all([
    supabase.from("User").select("displayName,firstName,lastName,email,phone").eq("id",share.userId).single(),
    supabase.from("Profile").select("headline,summary,location").eq("userId",share.userId).maybeSingle(),
    supabase.from("Experience").select("company,title,startDate,endDate,description").eq("userId",share.userId).order("startDate",{ascending:false}),
    supabase.from("Skill").select("name,level").eq("userId",share.userId).order("name"),
    supabase.from("Education").select("institution,degree,field,startDate,endDate").eq("userId",share.userId).order("startDate",{ascending:false}),
  ]);

  const name = [u.data?.firstName,u.data?.lastName].filter(Boolean).join(" ") || u.data?.displayName || "Talent Jobly";
  const doc = new PDFDocument({ size:"A4", margin:48 });
  const chunks: Buffer[] = [];
  doc.on("data",(chunk:Buffer)=>chunks.push(chunk));
  const done = new Promise<Buffer>(resolve=>doc.on("end",()=>resolve(Buffer.concat(chunks))));

  doc.fontSize(24).font("Helvetica-Bold").fillColor("#0B2447").text(name);
  if (p.data?.headline) doc.moveDown(.25).fontSize(13).font("Helvetica").fillColor("#174EA6").text(clean(p.data.headline));
  doc.moveDown(.4).fontSize(9).fillColor("#555").text([u.data?.email,u.data?.phone,p.data?.location].filter(Boolean).join(" · "));

  if (p.data?.summary) {
    doc.moveDown(1).fontSize(10).fillColor("#111").font("Helvetica-Bold").text("PROFIL");
    doc.moveDown(.25).font("Helvetica").text(clean(p.data.summary),{lineGap:3});
  }
  if (e.data?.length) {
    doc.moveDown(1).font("Helvetica-Bold").text("EXPÉRIENCE");
    for (const x of e.data) {
      doc.moveDown(.45).font("Helvetica-Bold").text([x.title,x.company].filter(Boolean).join(" — "));
      doc.font("Helvetica").fontSize(9).fillColor("#555").text([x.startDate && new Date(x.startDate).getFullYear(),x.endDate ? new Date(x.endDate).getFullYear() : "Aujourd'hui"].filter(Boolean).join(" — "));
      if(x.description) doc.moveDown(.2).fontSize(9).fillColor("#111").text(clean(x.description),{lineGap:2});
    }
  }
  if (s.data?.length) {
    doc.moveDown(1).fontSize(10).fillColor("#111").font("Helvetica-Bold").text("COMPÉTENCES");
    doc.moveDown(.25).font("Helvetica").text(s.data.map((x:any)=>x.name).filter(Boolean).join(" · "));
  }
  if (ed.data?.length) {
    doc.moveDown(1).font("Helvetica-Bold").text("FORMATION");
    for (const x of ed.data) {
      doc.moveDown(.4).font("Helvetica-Bold").text([x.degree,x.field].filter(Boolean).join(" — ") || "Formation");
      doc.font("Helvetica").fontSize(9).fillColor("#555").text(x.institution || "");
    }
  }
  doc.end();
  const pdf = await done;
  await supabase.from("CVShare").update({ downloadCount:(share.downloadCount||0)+1 }).eq("id",share.id);

  const safeName = name.replace(/[^a-zA-Z0-9]+/g,"_");
  const safeCompany = share.companyNameSnapshot ? "_Candidature_" + String(share.companyNameSnapshot).replace(/[^a-zA-Z0-9]+/g,"_") : "";
  return new NextResponse(new Uint8Array(pdf),{status:200,headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="CV_' + safeName + safeCompany + '.pdf"',
    "Cache-Control":"no-store"
  }});
}
