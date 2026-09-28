import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { runAiGateway } from "../../../../../lib/aiGateway";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await supabase.auth.getUser(token);
  return data.user || null;
}

function normalizeOutput(output: any) {
  const profile = output?.profile || {};
  return {
    fullName: typeof profile.fullName === "string" ? profile.fullName.trim() : "",
    headline: typeof profile.headline === "string" ? profile.headline.trim() : "",
    email: typeof profile.email === "string" ? profile.email.trim() : "",
    phone: typeof profile.phone === "string" ? profile.phone.trim() : "",
    summary: typeof profile.summary === "string" ? profile.summary.trim() : "",
    skills: Array.isArray(profile.skills) ? profile.skills.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 30) : [],
    experience: typeof profile.experience === "string" ? profile.experience.trim() : "",
    education: typeof profile.education === "string" ? profile.education.trim() : "",
    atsScore: Number.isFinite(Number(output?.ats?.score)) ? Math.max(0, Math.min(100, Number(output.ats.score))) : 0,
    atsKeywords: Array.isArray(output?.ats?.keywords) ? output.ats.keywords.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 20) : [],
    strengths: Array.isArray(output?.strengths) ? output.strengths.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 8) : [],
    gaps: Array.isArray(output?.gaps) ? output.gaps.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 8) : [],
    suggestions: Array.isArray(output?.suggestions) ? output.suggestions.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 8) : [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "PDF_REQUIRED", message: "Envoie le CV au format PDF." }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF_REQUIRED", message: "Aucun fichier PDF reçu." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "PDF_ONLY", message: "J’IA accepte ici uniquement les CV PDF." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF_TOO_LARGE", message: "Le CV PDF doit faire au maximum 8 Mo." }, { status: 413 });
    }

    const authUser = await getAuthUser(request);
    const fileBytes = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: fileBytes });
    const parsed = await parser.getText();
    await parser.destroy();
    const cvText = String(parsed.text || "").replace(/\u0000/g, " ").trim();
    if (cvText.length < 80) {
      return NextResponse.json({ error: "PDF_NOT_READABLE", message: "Le PDF ne contient pas assez de texte exploitable. Si c’est un scan image, utilise un PDF OCRisé." }, { status: 422 });
    }

    let originalCv: { stored: boolean; storagePath?: string; fileName?: string; pages?: number } = { stored: false };
    if (authUser) {
      const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (adminUrl && serviceKey) {
        const admin = createClient(adminUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
        const storagePath = `${authUser.id}/${crypto.randomUUID()}.pdf`;
        const upload = await admin.storage.from("talent-cvs").upload(storagePath, fileBytes, { contentType: "application/pdf", upsert: false });
        if (!upload.error) {
          const { data: userRow } = await admin.from("User").select("id").eq("authUserId", authUser.id).maybeSingle();
          if (userRow?.id) {
            await admin.from("User").update({
              cvOriginalStoragePath: storagePath,
              cvOriginalFileName: file.name,
              cvOriginalPageCount: parsed.total,
              cvOriginalUploadedAt: new Date().toISOString(),
            }).eq("id", userRow.id);
          }
          originalCv = { stored: true, storagePath, fileName: file.name, pages: parsed.total };
        }
      }
    }

    const ai = await runAiGateway(request, "CV_INTELLIGENCE", { cvText });
    if (!ai.ok) return NextResponse.json({ error: "CV_AI_UNAVAILABLE", message: ai.message }, { status: ai.status });

    return NextResponse.json({
      ok: true,
      aiName: ai.aiName,
      fileName: file.name,
      pages: parsed.total,
      extractedCharacters: cvText.length,
      credits: ai.credits,
      remaining: ai.remaining,
      provider: ai.provider,
      originalCv,
      cv: normalizeOutput(ai.output),
    });
  } catch (error) {
    return NextResponse.json({ error: "CV_IMPORT_FAILED", message: error instanceof Error ? error.message : "Impossible d’analyser le CV PDF." }, { status: 500 });
  }
}
