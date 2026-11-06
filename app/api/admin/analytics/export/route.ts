import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { analyticsError, buildAnalytics360, requireAdminAnalytics } from "@/lib/adminAnalytics360";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function csvCell(value: unknown) { return '"' + String(value ?? "").replace(/"/g,'""') + '"'; }
export async function GET(request: NextRequest) {
  try {
    const { db, user } = await requireAdminAnalytics(request);
    const params = new URLSearchParams(request.nextUrl.searchParams);
    const format = params.get("format") || "csv";
    if (!["csv","xlsx","pdf"].includes(format)) return NextResponse.json({message:"Format non pris en charge."},{status:400});
    params.delete("format");
    const report = await buildAnalytics360(db, params);
    const rows = report.summary.map(m => ({
      indicateur:m.label, module:m.module, total_actuel:m.available?m.count:"indisponible",
      valeur_periode:m.periodValue ?? "historique indisponible",
      periode_precedente:m.previousValue ?? "historique indisponible",
      variation_pct:m.change ?? "non calculable", source:m.available?"source interrogée":"source indisponible"
    }));
    const stamp = new Date().toISOString().slice(0,10);
    const title = "JOBLY INTELLIGENCE 360 — "+report.range.from+" au "+report.range.to;
    let bytes: Buffer; let contentType: string; let filename: string;
    if (format === "csv") {
      const keys = Object.keys(rows[0] || {});
      const text = [keys.map(csvCell).join(";"),...rows.map(row=>keys.map(k=>csvCell((row as any)[k])).join(";"))].join("\r\n");
      bytes = Buffer.from("\uFEFF"+text,"utf8"); contentType="text/csv; charset=utf-8"; filename="jobly-intelligence-"+stamp+".csv";
    } else if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook(); workbook.creator="Jobly Intelligence 360";
      const sheet = workbook.addWorksheet("Synthèse BI");
      sheet.addRow([title]); sheet.addRow(["Fuseau",report.range.timeZone]); sheet.addRow(["Regroupement",report.range.groupBy]);
      sheet.addRow([]); sheet.addRow(Object.keys(rows[0]||{}));
      rows.forEach(row=>sheet.addRow(Object.values(row)));
      sheet.columns.forEach(col=>{col.width=24;}); sheet.getRow(1).font={bold:true,size:16}; sheet.getRow(5).font={bold:true};
      const series=workbook.addWorksheet("Séries");
      series.addRow(["Date",...report.metricKeys]);
      report.series.forEach(point=>series.addRow([point.date,...report.metricKeys.map(k=>point[k]??0)]));
      series.columns.forEach(col=>{col.width=20;});
      bytes=Buffer.from(await workbook.xlsx.writeBuffer()); contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; filename="jobly-intelligence-"+stamp+".xlsx";
    } else {
      const doc = new PDFDocument({size:"A4",margin:42,info:{Title:title,Author:"Jobly"}});
      const chunks:Buffer[]=[]; doc.on("data",(chunk:Buffer)=>chunks.push(chunk));
      const finished=new Promise<Buffer>((resolve,reject)=>{doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);});
      doc.fontSize(18).fillColor("#10264A").text("JOBLY INTELLIGENCE 360");
      doc.moveDown(.4).fontSize(10).fillColor("#64748b").text(title+" · "+report.range.timeZone);
      doc.moveDown(1);
      rows.forEach(row=>{doc.fontSize(10).fillColor("#10264A").text(String(row.indicateur),{continued:true}).fillColor("#334155").text("  "+String(row.total_actuel));doc.fontSize(8).fillColor("#64748b").text("Période : "+String(row.valeur_periode)+" · Précédente : "+String(row.periode_precedente)+" · Variation : "+String(row.variation_pct));doc.moveDown(.45);});
      doc.moveDown().fontSize(8).fillColor("#64748b").text("Les valeurs indisponibles ne sont pas assimilées à zéro. Les projections éventuelles ne sont pas des résultats constatés.");
      doc.end(); bytes=await finished; contentType="application/pdf"; filename="jobly-intelligence-"+stamp+".pdf";
    }
    const { data: savedReport, error: saveError } = await db.from("JoblyAnalyticsReport").insert({
      title, reportType:"executive", fileFormat:format, parameters:Object.fromEntries(params.entries()),
      payload:{ generatedAt:report.generatedAt, range:report.range, rows, series:report.series },
      createdByUserId:user.id,
    });
    if (saveError) return NextResponse.json({message:"Export produit mais archivage du rapport impossible : "+saveError.message},{status:503});
    return new NextResponse(new Uint8Array(bytes),{headers:{
      "Content-Type":contentType,"Content-Disposition":'attachment; filename="'+filename+'"',
      "Cache-Control":"no-store"
    }});
  } catch (error) { return analyticsError(error); }
}
