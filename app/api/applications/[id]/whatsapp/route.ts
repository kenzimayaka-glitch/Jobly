import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { resolveApplicationContact } from "../../../../../lib/applicationEngine";
import { normalizePhoneNumber } from "../../../../../lib/phoneNumber";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiresCoverLetter(description: string) {
  return /(?:lettre\s+(?:de\s+)?motivation[^.\n]{0,100}(?:obligatoire|requise|exigée|à\s+joindre)|(?:obligatoire|requise|exigée)[^.\n]{0,80}lettre\s+(?:de\s+)?motivation|cover\s+letter\s+(?:is\s+)?(?:required|mandatory))/i.test(description);
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (user.role !== "TALENT" && user.role !== "ADMIN") {
      return NextResponse.json({ message: "Cette action est réservée au Talent." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const approvedLetter = stringValue(body.letterText).slice(0, 30000);
    const { data: application, error: appError } = await db
      .from("Application")
      .select("id,userId,status,sourceType,jobId,recruiterJobId,letterText,tailoredCvText")
      .eq("id", id)
      .eq("userId", user.id)
      .maybeSingle();
    if (appError) throw new Error(appError.message);
    if (!application) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });
    if (!["USER_REVIEW", "PREPARED"].includes(String(application.status))) {
      return NextResponse.json({ message: "La candidature n'est plus en phase de préparation." }, { status: 409 });
    }
    if (String(application.sourceType || "").toUpperCase() !== "PHONE") {
      return NextResponse.json({ message: "Cette offre n'utilise pas le canal WhatsApp/téléphone.", code: "NOT_WHATSAPP_APPLICATION" }, { status: 409 });
    }
    const cvText = stringValue(application.tailoredCvText);
    if (cvText.length < 40 || cvText === "CV non disponible.") {
      return NextResponse.json({ message: "Le CV validé est incomplet. Complète-le avant d'ouvrir WhatsApp." }, { status: 422 });
    }

    const isDiscovery = Boolean(application.jobId);
    const jobId = isDiscovery ? application.jobId : application.recruiterJobId;
    if (!jobId) return NextResponse.json({ message: "Offre liée à la candidature introuvable." }, { status: 404 });
    const table = isDiscovery ? "Job" : "RecruiterJob";
    const { data: offer, error: offerError } = await db.from(table).select("*").eq("id", jobId).maybeSingle();
    if (offerError) throw new Error(offerError.message);
    if (!offer || (isDiscovery ? offer.isActive !== true : offer.status !== "published")) {
      return NextResponse.json({ message: "Cette offre n'accepte plus de candidatures." }, { status: 410 });
    }

    const profile = (offer.applicationProfile && typeof offer.applicationProfile === "object" ? offer.applicationProfile : {}) as Record<string, unknown>;
    const contact = resolveApplicationContact(profile, String(offer.description || ""));
    const phone = normalizePhoneNumber(contact.phone, offer.countryCode || null);
    if (!phone) {
      return NextResponse.json({
        message: "Le numéro de candidature n'est pas un numéro international valide. Vérifie l'indicatif du pays sur l'offre.",
        code: "WHATSAPP_PHONE_INVALID",
      }, { status: 422 });
    }

    const jobTitle = stringValue(offer.title) || "Offre Jobly";
    const companyName = isDiscovery
      ? (offer.companyId ? (await db.from("Company").select("name").eq("id", offer.companyId).maybeSingle()).data?.name : null)
      : stringValue(offer.companyName);
    const coverLetterRequired = requiresCoverLetter(String(offer.description || ""));
    if (coverLetterRequired && !approvedLetter) {
      return NextResponse.json({ message: "Cette offre exige une lettre de motivation. Relis et valide-la avant de continuer.", code: "COVER_LETTER_REQUIRED" }, { status: 422 });
    }

    if (approvedLetter && approvedLetter !== String(application.letterText || "")) {
      const { error: letterError } = await db.from("Application")
        .update({ letterText: approvedLetter, updatedAt: new Date().toISOString() })
        .eq("id", application.id).eq("userId", user.id);
      if (letterError) throw new Error(letterError.message);
    }

    const shareSource = "WHATSAPP_APPLICATION:" + application.id;
    const now = new Date();
    const { data: existingShare, error: shareLookupError } = await db.from("CVShare")
      .select("id,token,expiresAt")
      .eq("userId", user.id)
      .eq("source", shareSource)
      .is("revokedAt", null)
      .gt("expiresAt", now.toISOString())
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (shareLookupError) throw new Error(shareLookupError.message);

    let token = existingShare?.token || "";
    if (!token) {
      token = nanoid(32);
      const candidateName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.displayName || "Talent Jobly";
      const { error: insertError } = await db.from("CVShare").insert({
        token,
        userId: user.id,
        jobId: isDiscovery ? application.jobId : null,
        source: shareSource,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        candidateNameSnapshot: candidateName,
        jobTitleSnapshot: jobTitle,
        companyNameSnapshot: companyName || null,
      });
      if (insertError) throw new Error(insertError.message);
    }

    const candidateName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.displayName || "Talent Jobly";
    const filename = "CV_" + candidateName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") + ".pdf";
    return NextResponse.json({
      ok: true,
      token,
      phone,
      candidateName,
      jobTitle,
      companyName: companyName || null,
      filename,
      coverLetterRequired,
      coverLetterAvailable: coverLetterRequired && Boolean(approvedLetter || application.letterText),
      cvUrl: "/cv/share/" + token,
      expiresInDays: 30,
      applicationStatus: application.status,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de préparer le partage WhatsApp.",
    }, { status: 500 });
  }
}
