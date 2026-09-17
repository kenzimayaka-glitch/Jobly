import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

function renderPdf(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "Jobly — CV adapté à l'offre" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.45);
        continue;
      }
      const isHeading = ["PROFIL", "COMPÉTENCES CLÉS", "EXPÉRIENCE PROFESSIONNELLE", "FORMATION"].includes(trimmed) || trimmed.startsWith("CANDIDATURE CIBLÉE");
      if (isHeading) {
        doc.moveDown(0.35).font("Helvetica-Bold").fontSize(11).text(trimmed).moveDown(0.15).font("Helvetica").fontSize(10);
      } else if (doc.y < 100 && lines.indexOf(line) === 0) {
        doc.font("Helvetica-Bold").fontSize(20).text(trimmed).moveDown(0.15).font("Helvetica").fontSize(10);
      } else {
        doc.fontSize(10).text(trimmed, { lineGap: 2 });
      }
    }
    doc.end();
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Candidature invalide." }, { status: 400 });
    const { data: application, error } = await supabase.from("Application").select("id,userId,tailoredCvText").eq("id", id).eq("userId", user.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!application) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });
    if (!application.tailoredCvText) return NextResponse.json({ message: "Le CV adapté n'est pas encore disponible." }, { status: 404 });
    const pdf = await renderPdf(application.tailoredCvText);
    const body = new ArrayBuffer(pdf.byteLength);
    new Uint8Array(body).set(pdf);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="jobly-cv-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de générer le CV." }, { status: 500 });
  }
}
