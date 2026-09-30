import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getProvider } from "../../../../../lib/paymentProviders";
import { getEntitlements } from "../../../../../lib/billingCatalog";
import { getActivePlanCode } from "../../../../../lib/entitlements";

export const runtime = "nodejs";
export const maxDuration = 30;

const PREMIUM_PLANS = new Set(["START", "PREMIUM", "PRO"]);
const ACCESS_WINDOW_MS = 2 * 60 * 60 * 1000;

type CVPayload = {
  name?: string;
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills?: string[] | string;
  experience?: string;
  education?: string;
};

function clean(v: unknown, max = 12000) {
  return String(v ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function lineBreak(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.text(text, { width: 480, ...options });
}

async function buildPdf(cv: CVPayload) {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 54, info: { Title: clean(cv.name || "CV Jobly"), Author: "JOBLY" } });
  const promise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const fullName = clean(cv.fullName || "Nom complet", 120);
  const headline = clean(cv.headline, 180);
  const email = clean(cv.email, 160);
  const phone = clean(cv.phone, 100);
  const summary = clean(cv.summary, 5000);
  const experience = clean(cv.experience, 10000);
  const education = clean(cv.education, 6000);
  const skills = Array.isArray(cv.skills) ? cv.skills.map(x => clean(x, 100)).filter(Boolean) : clean(cv.skills).split(/[,;
]/).map(x => x.trim()).filter(Boolean);

  doc.font("Helvetica-Bold").fontSize(22).text(fullName);
  if (headline) doc.moveDown(0.25).font("Helvetica-Bold").fontSize(12).text(headline);
  const contact = [email, phone].filter(Boolean).join("  |  ");
  if (contact) doc.moveDown(0.3).font("Helvetica").fontSize(9.5).text(contact);

  const section = (title: string, body: string) => {
    if (!body) return;
    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(10.5).text(title.toUpperCase());
    doc.moveTo(54, doc.y + 3).lineTo(541, doc.y + 3).stroke();
    doc.moveDown(0.35).font("Helvetica").fontSize(9.5);
    lineBreak(doc, body, { lineGap: 2 });
  };

  section("Profil", summary);
  if (skills.length) section("Compétences", skills.join(" • "));
  section("Expérience professionnelle", experience);
  section("Formation et certifications", education);

  doc.moveDown(1).font("Helvetica").fontSize(7.5).fillColor("#666666").text("CV généré par JOBLY — version ATS structurée", { align: "right" });
  doc.end();
  return promise;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const body = await request.json();
    const cv: CVPayload = body?.cv && typeof body.cv === "object" ? body.cv : {};

    const activePlan = await getActivePlanCode(sb, user.id, "TALENT");
    const service = String(body?.service || "ATS").toUpperCase() === "OPTIMIZED" ? "OPTIMIZED" : "ATS";
    const entitlements = getEntitlements(activePlan);
    const oneOffPrice = service === "OPTIMIZED" ? Number(entitlements.cvOptimizedDownloadPriceXaf || 0) : Number(entitlements.cvAtsDownloadPriceXaf || entitlements.cvDownloadPriceXaf || 0);
    const isIncluded = PREMIUM_PLANS.has(activePlan) && oneOffPrice <= 0;

    if (!isIncluded && oneOffPrice > 0) {
      const paymentId = clean(body?.paymentId, 100);
      if (!paymentId) {
        return NextResponse.json({
          error: "PAYMENT_REQUIRED",
          message: `Le téléchargement ${service === "OPTIMIZED" ? "du CV optimisé" : "ATS"} coûte ${oneOffPrice.toLocaleString("fr-FR")} FCFA pour votre formule.`,
          paymentRequired: true,
          priceXaf: oneOffPrice,
          currency: "XAF",
        }, { status: 402 });
      }

      const { data: payment, error: paymentError } = await sb
        .from("Payment")
        .select("id,userId,subscriptionId,amount,currency,status,provider,externalId,paidAt,feature")
        .eq("id", paymentId)
        .eq("userId", user.id)
        .maybeSingle();

      if (paymentError) throw new Error(paymentError.message);
      if (!payment) return NextResponse.json({ error: "PAYMENT_NOT_FOUND", message: "Paiement CV introuvable." }, { status: 404 });
      if (Number(payment.amount) !== oneOffPrice || payment.currency !== "XAF" || payment.subscriptionId !== null || payment.feature !== `CV_${service}_DOWNLOAD`) {
        return NextResponse.json({ error: "PAYMENT_INVALID", message: "Ce paiement ne correspond pas à cette opération CV." }, { status: 409 });
      }
      if (payment.status !== "SUCCESSFUL") {
        return NextResponse.json({ error: "PAYMENT_NOT_CONFIRMED", message: "Le paiement doit être confirmé avant le téléchargement." }, { status: 402 });
      }
      const paidAt = payment.paidAt ? new Date(payment.paidAt).getTime() : 0;
      if (!paidAt || Date.now() >= paidAt + ACCESS_WINDOW_MS) {
        return NextResponse.json({ error: "CV_ACCESS_EXPIRED", message: "L’accès payé à ce service CV a expiré après 2 heures. Un nouveau paiement est nécessaire.", accessWindowHours: 2 }, { status: 402 });
      }
    }

    const pdf = await buildPdf(cv);
    const suffix = service === "OPTIMIZED" ? "Jobly-optimise" : "ATS";
    const filename = `${clean(cv.fullName || "CV-Jobly", 80).replace(/[^a-zA-Z0-9_-]+/g, "-")}-${suffix}.pdf`;
    return new NextResponse(new Uint8Array(pdf), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "CV_EXPORT_FAILED", message: error instanceof Error ? error.message : "Impossible de générer le CV ATS." }, { status: 500 });
  }
}
