import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../lib/server-auth";
import { checkWeeklyApplicationQuota } from "../../../../../../lib/entitlements";
import { decryptToken, encryptToken } from "../../../../../../lib/candidateGmail";

function value(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function profileValue(profile: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const found = value(profile[key]);
    if (found) return found;
  }
  return null;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function escapeHeader(input: string) {
  return input.replace(/[\r\n]/g, " ").trim();
}

async function renderCvPdf(text: string): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(10).text(text, { width: 495, lineGap: 3 });
    doc.end();
  });
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credentials Google serveur manquantes.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) throw new Error("La connexion Gmail doit être réautorisée.");
  return { accessToken: String(json.access_token), expiresIn: Number(json.expires_in || 3600) };
}

async function sendGmail(accessToken: string, from: string, to: string, subject: string, body: string, cvPdf: Buffer, filename: string) {
  const boundary = `jobly_${crypto.randomUUID()}`;
  const mime = [
    `From: ${escapeHeader(from)}`,
    `To: ${escapeHeader(to)}`,
    `Subject: ${escapeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${escapeHeader(filename)}"`,
    "Content-Disposition: attachment; filename="${escapeHeader(filename)}"`,
    "Content-Transfer-Encoding: base64",
    "",
    cvPdf.toString("base64").match(/.{1,76}/g)?.join("\r\n") || "",
    `--${boundary}--`,
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64Url(mime) }),
    cache: "no-store",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.id) throw new Error(String(json?.error?.message || "Gmail n'a pas accepté la candidature."));
  return { messageId: String(json.id), threadId: value(json.threadId) };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const { id } = await params;

    const { data: application, error: applicationError } = await supabase.from("Application").select("*").eq("id", id).eq("userId", user.id).maybeSingle();
    if (applicationError) throw new Error(applicationError.message);
    if (!application) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });
    if (application.status === "SUBMITTED") return NextResponse.json({ submitted: true, application, alreadySubmitted: true });
    if (application.status !== "USER_REVIEW" && application.status !== "PREPARED") return NextResponse.json({ message: "Cette candidature n'est pas prête à être envoyée." }, { status: 409 });

    const quota = await checkWeeklyApplicationQuota(supabase, user.id);
    if (!quota.allowed) return NextResponse.json({ message: quota.message || "Quota hebdomadaire atteint.", quota }, { status: 429 });

    const targetId = application.jobId || application.recruiterJobId;
    const table = application.jobId ? "Job" : "RecruiterJob";
    if (!targetId) return NextResponse.json({ message: "Cible de candidature manquante." }, { status: 422 });
    const { data: offer, error: offerError } = await supabase.from(table).select("*").eq("id", targetId).maybeSingle();
    if (offerError) throw new Error(offerError.message);
    if (!offer) return NextResponse.json({ message: "L'offre n'est plus disponible." }, { status: 410 });

    const applicationProfile = (offer.applicationProfile && typeof offer.applicationProfile === "object" ? offer.applicationProfile : {}) as Record<string, unknown>;
    const requestedChannel = String(application.sourceType || "").toUpperCase();
    if (requestedChannel !== "EMAIL") return NextResponse.json({ message: "Ce canal de candidature n'est pas encore automatisable." }, { status: 422 });

    const recipient = profileValue(applicationProfile, ["applicationEmail", "email", "recipientEmail", "recipient"]);
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return NextResponse.json({ message: "L'offre ne fournit pas d'adresse email de candidature vérifiable." }, { status: 422 });

    const { data: gmail, error: gmailError } = await supabase.from("CandidateGmailConnection").select("*").eq("userId", user.id).maybeSingle();
    if (gmailError) throw new Error(gmailError.message);
    if (!gmail?.encryptedAccessToken && !gmail?.encryptedRefreshToken) return NextResponse.json({ message: "Connectez votre Gmail avant d'envoyer la candidature.", requiresGmail: true }, { status: 412 });

    let accessToken = gmail.encryptedAccessToken ? decryptToken(gmail.encryptedAccessToken) : "";
    const expiresAt = gmail.accessTokenExpiresAt ? new Date(gmail.accessTokenExpiresAt).getTime() : 0;
    if (!accessToken || expiresAt < Date.now() + 60_000) {
      if (!gmail.encryptedRefreshToken) return NextResponse.json({ message: "La connexion Gmail doit être réautorisée.", requiresGmail: true }, { status: 412 });
      const refreshed = await refreshGoogleAccessToken(decryptToken(gmail.encryptedRefreshToken));
      accessToken = refreshed.accessToken;
      await supabase.from("CandidateGmailConnection").update({ encryptedAccessToken: encryptToken(accessToken), accessTokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(), updatedAt: new Date().toISOString() }).eq("userId", user.id);
    }

    const subject = profileValue(applicationProfile, ["subject", "emailSubject"]) || `Candidature — ${String(offer.title || "Offre Jobly")}`;
    const body = application.letterText || `Bonjour,\n\nVeuillez trouver ci-joint ma candidature au poste de ${String(offer.title || "")} .\n\nCordialement,\n${String(user.displayName || user.firstName || "Candidat")}`;
    const filename = `CV-${String(offer.title || "Jobly").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 70) || "Jobly"}.pdf`;
    const cvPdf = await renderCvPdf(String(application.tailoredCvText || "CV non disponible."));
    const sent = await sendGmail(accessToken, gmail.googleEmail, recipient, subject, body, cvPdf, filename);
    const submittedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase.from("Application").update({ status: "SUBMITTED", submittedAt, sourceMessageId: sent.messageId, sourceThreadId: sent.threadId, sourceEmail: recipient, sourceFilename: filename, updatedAt: submittedAt }).eq("id", id).eq("userId", user.id).neq("status", "SUBMITTED").select("*").maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) return NextResponse.json({ message: "La candidature a été envoyée, mais son enregistrement concurrentiel doit être vérifié.", submitted: true, messageId: sent.messageId }, { status: 202 });
    return NextResponse.json({ submitted: true, application: updated, proof: { provider: "GMAIL", messageId: sent.messageId, threadId: sent.threadId, from: gmail.googleEmail, to: recipient } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'envoyer la candidature." }, { status: 500 });
  }
}
