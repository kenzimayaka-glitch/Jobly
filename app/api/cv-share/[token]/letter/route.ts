import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { adminClient } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const required = (description: string) => /(?:lettre\s+(?:de\s+)?motivation[^.\n]{0,120}(?:obligatoire|requise|exigée|demandée|à\s+joindre|à\s+fournir)|(?:obligatoire|requise|exigée|demandée)[^.\n]{0,80}lettre\s+(?:de\s+)?motivation|cover\s+letter\s+(?:is\s+)?(?:required|mandatory))/i.test(description);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = adminClient();
  const { data: share } = await db.from("CVShare").select("*").eq("token", token).maybeSingle();
  if (!share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now())) {
    return new NextResponse("Lettre indisponible.", { status: 404 });
  }
  const source = typeof share.source === "string" ? share.source : "";
  const match = source.match(/^WHATSAPP_APPLICATION:([0-9a-f-]{36})$/i);
  if (!match) return new NextResponse("Lettre indisponible.", { status: 404 });

  const { data: application } = await db.from("Application")
    .select("id,userId,jobId,recruiterJobId,letterText,letterApprovedAt")
    .eq("id", match[1]).eq("userId", share.userId).maybeSingle();
  if (!application) return new NextResponse("Lettre indisponible.", { status: 404 });
  const linked = (application.jobId && share.jobId === application.jobId) ||
    (application.recruiterJobId && !share.jobId);
  if (!linked) return new NextResponse("Lettre indisponible.", { status: 404 });

  const table = application.jobId ? "Job" : "RecruiterJob";
  const offerId = application.jobId || application.recruiterJobId;
  const { data: offer } = await db.from(table).select("description").eq("id", offerId).maybeSingle();
  const letterText = clean(application.letterText);
  if (!offer || !required(String(offer.description || "")) || !application.letterApprovedAt || letterText.length < 30) {
    return new NextResponse("Aucune lettre validée n'est jointe à cette candidature.", { status: 404 });
  }

  const doc = new PDFDocument({ size: "A4", margin: 58 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.font("Helvetica").fontSize(11).fillColor("#111827").text(letterText, { lineGap: 5, width: 480 });
  doc.end();
  const pdf = await done;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Lettre_de_motivation.pdf"',
      "Cache-Control": "no-store, private",
    },
  });
}
