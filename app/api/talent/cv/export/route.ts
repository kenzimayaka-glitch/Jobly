import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getProvider } from "../../../../../lib/paymentProviders";
import { getPlan } from "../../../../../lib/billingCatalog";

export const runtime = "nodejs";
export const maxDuration = 30;

const ATS_PRICE_XAF = 1000;
const PREMIUM_PLANS = new Set(["PREMIUM", "PRO"]);

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
  const skills = Array.isArray(cv.skills) ? cv.skills.map(x => clean(x, 100)).filter(Boolean) : clean(cv.skills).split(/[,;\n]/).map(x => x.trim()).filter(Boolean);

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

    const { data: sub } = await sb.from("Subscription").select("plan,status,provider").eq("userId", user.id).in("status", ["ACTIVE", "TRIAL"]).order("createdAt", { ascending: false }).limit(1).maybeSingle();
    const plan = getPlan(String(sub?.plan || "FREE")) || getPlan("FREE")!;
    const isPremium = PREMIUM_PLANS.has(plan.code);

    if (!isPremium) {
      const paymentId = clean(body?.paymentId, 100);
      if (!paymentId) {
        const providerName = "ICLAN";
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const { data: payment, error } = await sb.from("Payment").insert({
          id,
          userId: user.id,
          subscriptionId: null,
          provider: providerName,
          externalId: id,
          amount: ATS_PRICE_XAF,
          currency: "XAF",
          status: "CREATED",
          idempotencyKey: `CV_ATS:${id}`,
          createdAt: now,
          updatedAt: now,
        }).select("id,externalId,amount,currency,status,provider").single();
        if (error) throw new Error(error.message);
        const intent = await getProvider(providerName).createPayment({
          paymentId: id,
          amount: ATS_PRICE_XAF,
          currency: "XAF",
          phone: clean(body?.paymentPhone, 40) || auth.phone,
          paymentMethod: clean(body?.paymentMethod, 40) || null,
        });
        return NextResponse.json({ ok: false, paymentRequired: true, priceXaf: ATS_PRICE_XAF, payment, checkoutReference: intent.checkoutReference, instructions: intent.instructions }, { status: 402 });
      }

      const { data: payment, error } = await sb.from("Payment").select("*").eq("id", paymentId).eq("userId", user.id).eq("amount", ATS_PRICE_XAF).eq("currency", "XAF").maybeSingle();
      if (error) throw new Error(error.message);
      if (!payment) return NextResponse.json({ error: "PAYMENT_NOT_FOUND", message: "Paiement CV introuvable." }, { status: 404 });

      if (payment.status !== "PAID") {
        const verification = await getProvider(String(payment.provider)).verifyPayment(String(payment.externalId || payment.id));
        if (verification.status === "SUCCESSFUL") {
          await sb.from("Payment").update({ status: "PAID", paidAt: new Date().toISOString(), failureReason: null, updatedAt: new Date().toISOString() }).eq("id", payment.id).eq("userId", user.id);
          payment.status = "PAID";
        } else if (verification.status === "FAILED") {
          await sb.from("Payment").update({ status: "FAILED", failureReason: verification.message || "Paiement refusé", updatedAt: new Date().toISOString() }).eq("id", payment.id).eq("userId", user.id);
          return NextResponse.json({ error: "PAYMENT_FAILED", message: verification.message || "Le paiement n’a pas été confirmé." }, { status: 402 });
        } else {
          return NextResponse.json({ paymentRequired: true, pending: true, paymentId: payment.id, priceXaf: ATS_PRICE_XAF, message: "Paiement encore en attente. Valide le paiement sur ton téléphone puis relance le téléchargement." }, { status: 202 });
        }
      }
    }

    const pdf = await buildPdf(cv);
    const filename = `${clean(cv.fullName || "CV-Jobly", 80).replace(/[^a-zA-Z0-9_-]+/g, "-")}-ATS.pdf`;
    return new NextResponse(new Uint8Array(pdf), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "CV_EXPORT_FAILED", message: error instanceof Error ? error.message : "Impossible de générer le CV ATS." }, { status: 500 });
  }
}
