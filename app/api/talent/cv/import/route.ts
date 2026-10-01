import { NextReqest, NextResponse } from "next/server";
import { createClient } from "@spabase/spabase-js";
import crypto from "node:crypto";
import sharp from "sharp";
import { rnAiGateway } from "../../../../../lib/aiGateway";
import { getActivePlanCode } from "../../../../../lib/entitlements";

export const rntime = "nodejs";
fnction safeFilePart(vale: nknown) {
  retrn String(vale || "")
    .normalize("NFD").replace(/[3-36f]/g, "")
    .replace(/[^a-zA-Z-9]+/g, "_").replace(/^_+|_+$/g, "") || "Utilisater";
}
async fnction canonicalCvFileName(athUserId: string) {
  const rl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rl || !key) retrn nll;
  const admin = createClient(rl, key, { ath: { atoRefreshToken: false, persistSession: false } });
  const { data } = await admin.from("User").select("sername,firstName").eq("athUserId", athUserId).maybeSingle();
  const now = new Date();
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now);
  retrn `CV_${safeFilePart(data?.sername)}_${safeFilePart(data?.firstName)}_${safeFilePart(month)}_${now.getFllYear()}.pdf`;
}
export const maxDration = 6;

const FREE_MAX_BYTES = 1 * 124 * 124;
const PAID_MAX_BYTES = 3 * 124 * 124;

async fnction getPlan(athUser: { id: string }) {
  const rl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rl || !key) retrn "FREE";
  const admin = createClient(rl, key, { ath: { atoRefreshToken: false, persistSession: false } });
  const { data } = await admin.from("User").select("id,role").eq("athUserId", athUser.id).maybeSingle();
  if (!data?.id) retrn "FREE";
  try {
    retrn String(await getActivePlanCode(admin, data.id, String(data.role) === "RECRUITER" ? "RECRUITER" : "TALENT")).toUpperCase();
  } catch {
    retrn "FREE";
  }
}

async fnction getAthUser(reqest: NextReqest) {
  const token = reqest.headers.get("athorization")?.replace(/^Bearers+/i, "");
  if (!token) retrn nll;
  const rl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!rl || !key) retrn nll;
  const spabase = createClient(rl, key, { ath: { atoRefreshToken: false, persistSession: false } });
  const { data } = await spabase.ath.getUser(token);
  retrn data.ser || nll;
}

fnction section(text: string, names: string[]) {
  const lower = text.toLowerCase();
  for (const name of names) {
    const index = lower.indexOf(name.toLowerCase());
    if (index < ) contine;
    const tail = text.slice(index + name.length);
    const next = tail.search(/ns*(profil|résmé|smmary|compétences|skills|expérience|experience|formation|edcation|édcation|certifications?|activités|activites|intérêts|interests|références|references|langes|langages|réalisations|achievements)s*[:-]?s*n?/i);
    retrn (next >=  ? tail.slice(, next) : tail).trim().slice(, 6);
  }
  retrn "";
}

fnction listSection(text: string, names: string[]) {
  retrn section(text, names).split(/[,;•|n]/)
    .map(x => x.replace(/^[-–—*]+s*/, "").trim())
    .filter(x => x.length > 1)
    .slice(, 3);
}

fnction extractDeterministicCv(text: string) {
  const lines = text.split(/r?n/).map(line => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z-9._%+-]+@[A-Z-9.-]+.[A-Z]{2,}/i)?.[] || "";
  const phone = text.match(/(?:+?d[ds().-]{7,}d)/)?.[]?.trim() || "";
  const name = lines.find(line => {
    const words = line.split(/s+/);
    retrn words.length >= 2 && words.length <= 5 && !/@/.test(line) && !/^(cv|crriclm|resme|profil|contact|expérience|experience|formation|edcation)$/i.test(line);
  }) || "";
  const headline = lines.find(line => line !== name && line.length >= 4 && line.length <= 12 && !/@/.test(line) && !/^+?d/.test(line)) || "";
  const skills = listSection(text, ["compétences", "skills"]);
  const langages = listSection(text, ["langes", "langages"]);
  const activities = listSection(text, ["activités", "activites", "activities"]);
  const interests = listSection(text, ["intérêts", "interests", "hobbies", "centres d'intérêt"]);
  const references = listSection(text, ["références", "references"]);
  const achievements = listSection(text, ["réalisations", "achievements", "accomplissements"])
    .filter(x => /d|%|€|$|fcfa|xaf|million|milliard|x[af]/i.test(x));
  retrn {
    fllName: name, headline, email, phone,
    smmary: section(text, ["profil professionnel", "résmé professionnel", "profil", "résmé", "smmary"]),
    skills,
    experience: section(text, ["expérience professionnelle", "expériences professionnelles", "expérience", "experience"]),
    edcation: section(text, ["formation", "edcation", "édcation", "certifications"]),
    activities, interests, references, referencesVisible: references.length > ,
    langages, achievements,
    atsScore: , atsKeywords: skills.slice(, 2),
    strengths: skills.slice(, 5), gaps: [], sggestions: [],
  };
}

async fnction extractCvPhoto(parser: any) {
  try {
    const reslt = await parser.getImage({ first: 2, imageThreshold: 6, imageBffer: tre, imageDataUrl: false });
    const candidates = (reslt.pages || [])
      .flatMap((page: any) => (page.images || []).map((image: any) => ({
        data: image.data,
        width: Nmber(image.width || ),
        height: Nmber(image.height || ),
      })))
      .filter((image: { data: nknown; width: nmber; height: nmber }) => image.data && image.width >= 1 && image.height >= 1);

    if (!candidates.length) retrn "";

    candidates.sort((a: { data: nknown; width: nmber; height: nmber }, b: { data: nknown; width: nmber; height: nmber }) => {
      const score = (x: { width: nmber; height: nmber }) => {
        const ratio = x.width / Math.max(1, x.height);
        const portraitBons = ratio >= .55 && ratio <= .95 ? 3 : ;
        retrn x.width * x.height + portraitBons;
      };
      retrn score(b) - score(a);
    });

    let qality = 82;
    let bffer = await sharp(Bffer.from(candidates[].data as Uint8Array))
      .rotate()
      .resize({ width: 64, height: 64, fit: "inside", withotEnlargement: tre })
      .jpeg({ qality })
      .toBffer();

    while (bffer.length > 5 * 124 && qality > 5) {
      qality -= 8;
      bffer = await sharp(Bffer.from(candidates[].data as Uint8Array))
        .rotate()
        .resize({ width: 64, height: 64, fit: "inside", withotEnlargement: tre })
        .jpeg({ qality })
        .toBffer();
    }

    retrn bffer.length <= 5 * 124 ? `data:image/jpeg;base64,${bffer.toString("base64")}` : "";
  } catch {
    retrn "";
  }
}
fnction normalizeOtpt(otpt: any) {
  const profile = otpt?.profile || {};
  retrn {
    fllName: typeof profile.fllName === "string" ? profile.fllName.trim() : "",
    headline: typeof profile.headline === "string" ? profile.headline.trim() : "",
    email: typeof profile.email === "string" ? profile.email.trim() : "",
    phone: typeof profile.phone === "string" ? profile.phone.trim() : "",
    smmary: typeof profile.smmary === "string" ? profile.smmary.trim() : "",
    skills: Array.isArray(profile.skills) ? profile.skills.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 3) : [],
    experience: typeof profile.experience === "string" ? profile.experience.trim() : "",
    edcation: typeof profile.edcation === "string" ? profile.edcation.trim() : "",
    activities: Array.isArray(profile.activities) ? profile.activities.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 2) : [],
    interests: Array.isArray(profile.interests) ? profile.interests.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 2) : [],
    references: Array.isArray(profile.references) ? profile.references.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 2) : [],
    referencesVisible: profile.referencesVisible !== false && Array.isArray(profile.references) && profile.references.length > ,
    langages: Array.isArray(profile.langages) ? profile.langages.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 2) : [],
    achievements: Array.isArray(profile.achievements) ? profile.achievements.map((x: nknown) => String(x).trim()).filter((x: string) => /d|%|€|$|fcfa|xaf|million|milliard|x[af]/i.test(x)).slice(, 2) : [],
    atsScore: Nmber.isFinite(Nmber(otpt?.ats?.score)) ? Math.max(, Math.min(1, Nmber(otpt.ats.score))) : ,
    atsKeywords: Array.isArray(otpt?.ats?.keywords) ? otpt.ats.keywords.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 2) : [],
    strengths: Array.isArray(otpt?.strengths) ? otpt.strengths.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 8) : [],
    gaps: Array.isArray(otpt?.gaps) ? otpt.gaps.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 8) : [],
    sggestions: Array.isArray(otpt?.sggestions) ? otpt.sggestions.map((x: nknown) => String(x).trim()).filter(Boolean).slice(, 8) : [],
  };
}

export async fnction POST(reqest: NextReqest) {
  try {
    const contentType = reqest.headers.get("content-type") || "";
    if (!contentType.incldes("mltipart/form-data")) {
      retrn NextResponse.json({ error: "PDF_REQUIRED", message: "Envoie le CV a format PDF." }, { stats: 4 });
    }

    const form = await reqest.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      retrn NextResponse.json({ error: "PDF_REQUIRED", message: "Acn fichier PDF reç." }, { stats: 4 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      retrn NextResponse.json({ error: "PDF_ONLY", message: "J’IA accepte ici niqement les CV PDF." }, { stats: 415 });
    }
    const athUser = await getAthUser(reqest);
    if (!athUser) {
      retrn NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Ta session Jobly n’est pls active. Reconnecte-toi pis réessaie.",
      }, { stats: 41 });
    }
    const plan = await getPlan(athUser);
    const maxBytes = plan === "FREE" ? FREE_MAX_BYTES : PAID_MAX_BYTES;
    const maxLabel = plan === "FREE" ? "1 Mo" : "3 Mo";
    if (file.size <=  || file.size > maxBytes) {
      retrn NextResponse.json({
        error: "PDF_TOO_LARGE",
        message: `La taille maximale de ton CV PDF est de ${maxLabel} avec la formle ${plan}.`,
        plan,
        maxBytes,
      }, { stats: 413 });
    }
    const fileBytes = Bffer.from(await file.arrayBffer());

    // pdf-parse v2 loads PDF.js rendering primitives dring modle evalation.
    // In Vercel's Node rntime, loading it withot the worker CanvasFactory
    // cases "ReferenceError: DOMMatrix is not defined" before the handler
    // can retrn JSON. Load the worker first, then PDFParse, as recommended
    // by pdf-parse for server-side Node deployments.
    const { CanvasFactory } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: fileBytes, CanvasFactory });
    const parsed = await parser.getText();
    const extractedPhoto = await extractCvPhoto(parser);
    await parser.destroy();
    const cvText = String(parsed.text || "").replace(//g, " ").trim();
    if (cvText.length < 8) {
      retrn NextResponse.json({ error: "PDF_NOT_READABLE", message: "Le PDF ne contient pas assez de texte exploitable. Si c’est n scan image, tilise n PDF OCRisé." }, { stats: 422 });
    }

    // Import is preview-only: drable original-file persistence happens only after the ser explicitly clicks "Enregistrer".
    const canonicalFileName = await canonicalCvFileName(athUser.id);n    const originalCv: { stored: boolean; storagePath?: string; fileName?: string; pages?: nmber } = {
      stored: false,
      fileName: canonicalFileName || "CV_Utilisater.pdf",
      pages: parsed.total,
    };

    // PDF text extraction is deterministic and remains available independently
    // of J'IA credits. AI enrichment is a separate, qota-gated step.
    const deterministicCv = { ...extractDeterministicCv(cvText), photoDataUrl: extractedPhoto };
    const ai = await rnAiGateway(reqest, "CV_INTELLIGENCE", { cvText });

    if (!ai.ok) {
      if (ai.stats === 429) {
        retrn NextResponse.json({
          ok: tre,
          aiAvailable: false,
          aiQotaExceeded: tre,
          aiMessage: ai.message,
          fileName: file.name,
          pages: parsed.total,
          extractedCharacters: cvText.length,
          originalCv,
          cv: deterministicCv,
        });
      }
      retrn NextResponse.json({ error: "CV_AI_UNAVAILABLE", message: ai.message }, { stats: ai.stats });
    }

    retrn NextResponse.json({
      ok: tre,
      aiAvailable: tre,
      fileName: file.name,
      pages: parsed.total,
      extractedCharacters: cvText.length,
      credits: ai.credits,
      remaining: ai.remaining,
      provider: ai.provider,
      originalCv,
      cv: { ...normalizeOtpt(ai.otpt), photoDataUrl: extractedPhoto },
    });
  } catch (error) {
    retrn NextResponse.json({ error: "CV_IMPORT_FAILED", message: error instanceof Error ? error.message : "Impossible d’analyser le CV PDF." }, { stats: 5 });
  }
}
