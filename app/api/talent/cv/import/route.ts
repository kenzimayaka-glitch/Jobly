import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import sharp from "sharp";
import { runAiGateway } from "../../../../../lib/aiGateway";
import { getActivePlanCode } from "../../../../../lib/entitlements";

export const runtime = "nodejs";
function safeFilePart(value: unknown) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Utilisateur";
}
async function canonicalCvFileName(authUserId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await admin.from("User").select("username,firstName").eq("authUserId", authUserId).maybeSingle();
  const now = new Date();
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now);
  return `CV_${safeFilePart(data?.username)}_${safeFilePart(data?.firstName)}_${safeFilePart(month)}_${now.getFullYear()}.pdf`;
}
export const maxDuration = 60;

const FREE_MAX_BYTES = 1 * 1024 * 1024;
const PAID_MAX_BYTES = 3 * 1024 * 1024;

async function getPlan(authUser: { id: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "FREE";
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await admin.from("User").select("id,role").eq("authUserId", authUser.id).maybeSingle();
  if (!data?.id) return "FREE";
  try {
    return String(await getActivePlanCode(admin, data.id, String(data.role) === "RECRUITER" ? "RECRUITER" : "TALENT")).toUpperCase();
  } catch {
    return "FREE";
  }
}

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

function section(text: string, names: string[]) {
  const lower = text.toLowerCase();
  for (const name of names) {
    const index = lower.indexOf(name.toLowerCase());
    if (index < 0) continue;
    const tail = text.slice(index + name.length);
    const next = tail.search(/\n\s*(profil|résumé|summary|compétences|skills|expérience|experience|formation|education|éducation|certifications?|activités|activites|intérêts|interests|références|references|langues|languages|réalisations|achievements)\s*[:\-]?\s*\n?/i);
    return (next >= 0 ? tail.slice(0, next) : tail).trim().slice(0, 6000);
  }
  return "";
}

function listSection(text: string, names: string[]) {
  return section(text, names).split(/[,;•|\n]/)
    .map(x => x.replace(/^[\-–—*]+\s*/, "").trim())
    .filter(x => x.length > 1)
    .slice(0, 30);
}

function extractDeterministicCv(text: string) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || "";
  const name = lines.find(line => {
    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 5 && !/@/.test(line) && !/^(cv|curriculum|resume|profil|contact|expérience|experience|formation|education)$/i.test(line);
  }) || "";
  const headline = lines.find(line => line !== name && line.length >= 4 && line.length <= 120 && !/@/.test(line) && !/^\+?\d/.test(line)) || "";
  const skills = listSection(text, ["compétences", "skills"]);
  const languages = listSection(text, ["langues", "languages"]);
  const activities = listSection(text, ["activités", "activites", "activities"]);
  const interests = listSection(text, ["intérêts", "interests", "hobbies", "centres d'intérêt"]);
  const references = listSection(text, ["références", "references"]);
  const achievements = listSection(text, ["réalisations", "achievements", "accomplissements"])
    .filter(x => /\d|%|€|\$|fcfa|xaf|million|milliard|x[af]/i.test(x));
  return {
    fullName: name, headline, email, phone,
    summary: section(text, ["profil professionnel", "résumé professionnel", "profil", "résumé", "summary"]),
    skills,
    experience: section(text, ["expérience professionnelle", "expériences professionnelles", "expérience", "experience"]),
    education: section(text, ["formation", "education", "éducation", "certifications"]),
    activities, interests, references, referencesVisible: references.length > 0,
    languages, achievements,
    atsScore: 0, atsKeywords: skills.slice(0, 20),
    strengths: skills.slice(0, 5), gaps: [], suggestions: [],
  };
}

async function extractCvPhoto(parser: any) {
  try {
    const result = await parser.getImage({ first: 2, imageThreshold: 60, imageBuffer: true, imageDataUrl: false });
    const candidates = (result.pages || [])
      .flatMap((page: any) => (page.images || []).map((image: any) => ({
        data: image.data,
        width: Number(image.width || 0),
        height: Number(image.height || 0),
      })))
      .filter((image: { data: unknown; width: number; height: number }) => image.data && image.width >= 100 && image.height >= 100);

    if (!candidates.length) return "";

    candidates.sort((a: { data: unknown; width: number; height: number }, b: { data: unknown; width: number; height: number }) => {
      const score = (x: { width: number; height: number }) => {
        const ratio = x.width / Math.max(1, x.height);
        const portraitBonus = ratio >= 0.55 && ratio <= 0.95 ? 300000 : 0;
        return x.width * x.height + portraitBonus;
      };
      return score(b) - score(a);
    });

    let quality = 82;
    let buffer = await sharp(Buffer.from(candidates[0].data as Uint8Array))
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    while (buffer.length > 500 * 1024 && quality > 50) {
      quality -= 8;
      buffer = await sharp(Buffer.from(candidates[0].data as Uint8Array))
        .rotate()
        .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
    }

    return buffer.length <= 500 * 1024 ? `data:image/jpeg;base64,${buffer.toString("base64")}` : "";
  } catch {
    return "";
  }
}
function normalizeOutput(output: any, fallback: ReturnType<typeof extractDeterministicCv>) {
  const profile = output?.profile || {};
  const textValue = (value: unknown, secondary: string) =>
    typeof value === "string" && value.trim() ? value.trim() : secondary;
  const listValue = (value: unknown, secondary: string[], limit: number) =>
    Array.isArray(value) && value.some((item) => String(item).trim())
      ? value.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, limit)
      : secondary.slice(0, limit);
  return {
    fullName: textValue(profile.fullName, fallback.fullName),
    headline: textValue(profile.headline, fallback.headline),
    email: textValue(profile.email, fallback.email),
    phone: textValue(profile.phone, fallback.phone),
    summary: textValue(profile.summary, fallback.summary),
    skills: listValue(profile.skills, fallback.skills, 30),
    experience: textValue(profile.experience, fallback.experience),
    education: textValue(profile.education, fallback.education),
    activities: listValue(profile.activities, fallback.activities, 20),
    interests: listValue(profile.interests, fallback.interests, 20),
    references: listValue(profile.references, fallback.references, 20),
    referencesVisible: typeof profile.referencesVisible === "boolean"
      ? profile.referencesVisible && listValue(profile.references, fallback.references, 20).length > 0
      : fallback.referencesVisible,
    languages: listValue(profile.languages, fallback.languages, 20),
    achievements: listValue(profile.achievements, fallback.achievements, 20)
      .filter((x: string) => /\d|%|€|\$|fcfa|xaf|million|milliard|x[af]/i.test(x)),
    atsScore: Number.isFinite(Number(output?.ats?.score)) ? Math.max(0, Math.min(100, Number(output.ats.score))) : 0,
    atsKeywords: listValue(output?.ats?.keywords, fallback.atsKeywords, 20),
    strengths: listValue(output?.strengths, fallback.strengths, 8),
    gaps: listValue(output?.gaps, fallback.gaps, 8),
    suggestions: listValue(output?.suggestions, fallback.suggestions, 8),
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
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Ta session Jobly n’est plus active. Reconnecte-toi puis réessaie.",
      }, { status: 401 });
    }
    const plan = await getPlan(authUser);
    const maxBytes = plan === "FREE" ? FREE_MAX_BYTES : PAID_MAX_BYTES;
    const maxLabel = plan === "FREE" ? "1 Mo" : "3 Mo";
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json({
        error: "PDF_TOO_LARGE",
        message: `La taille maximale de ton CV PDF est de ${maxLabel} avec la formule ${plan}.`,
        plan,
        maxBytes,
      }, { status: 413 });
    }
    const fileBytes = Buffer.from(await file.arrayBuffer());

    // pdf-parse v2 loads PDF.js rendering primitives during module evaluation.
    // In Vercel's Node runtime, loading it without the worker CanvasFactory
    // causes "ReferenceError: DOMMatrix is not defined" before the handler
    // can return JSON. Load the worker first, then PDFParse, as recommended
    // by pdf-parse for server-side Node deployments.
    const { CanvasFactory } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: fileBytes, CanvasFactory });
    const parsed = await parser.getText();
    const extractedPhoto = await extractCvPhoto(parser);
    await parser.destroy();
    const cvText = String(parsed.text || "").replace(/\u0000/g, " ").trim();
    if (cvText.length < 80) {
      return NextResponse.json({ error: "PDF_NOT_READABLE", message: "Le PDF ne contient pas assez de texte exploitable. Si c’est un scan image, utilise un PDF OCRisé." }, { status: 422 });
    }

    // Import is preview-only: durable original-file persistence happens only after the user explicitly clicks "Enregistrer".
    const canonicalFileName = await canonicalCvFileName(authUser.id);
    const originalCv: { stored: boolean; storagePath?: string; fileName?: string; pages?: number } = {
      stored: false,
      fileName: canonicalFileName || "CV_Utilisateur.pdf",
      pages: parsed.total,
    };

    // J'IA classe d'abord chaque information dans la rubrique CV appropriée.
    // Les règles déterministes interviennent ensuite uniquement pour valider,
    // compléter les champs laissés vides et assurer un secours sans IA.
    const deterministicCv = extractDeterministicCv(cvText);
    const ai = await runAiGateway(request, "CV_INTELLIGENCE", { cvText });
    if (ai.ok) {
      const classified = normalizeOutput(ai.output, deterministicCv);
      return NextResponse.json({
        ok: true,
        aiAvailable: true,
        classificationMethod: "AI_PRIMARY_RULES_SECONDARY",
        classificationLabel: "Classement J’IA, contrôle et complément automatique",
        fileName: canonicalFileName || "CV_Utilisateur.pdf",
        pages: parsed.total,
        extractedCharacters: cvText.length,
        credits: ai.credits,
        remaining: ai.remaining,
        provider: ai.provider,
        originalCv,
        cv: { ...classified, photoDataUrl: extractedPhoto },
      });
    }

    const quotaExceeded = ai.status === 429;
    return NextResponse.json({
      ok: true,
      aiAvailable: false,
      aiQuotaExceeded: quotaExceeded,
      aiMessage: ai.message,
      classificationMethod: "RULES_FALLBACK",
      classificationLabel: "Classement automatique de secours — vérification manuelle recommandée",
      fileName: canonicalFileName || "CV_Utilisateur.pdf",
      pages: parsed.total,
      extractedCharacters: cvText.length,
      originalCv,
      cv: { ...normalizeOutput({}, deterministicCv), photoDataUrl: extractedPhoto },
    });
  } catch (error) {
    return NextResponse.json({ error: "CV_IMPORT_FAILED", message: error instanceof Error ? error.message : "Impossible d’analyser le CV PDF." }, { status: 500 });
  }
}
