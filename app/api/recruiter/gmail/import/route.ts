import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { calculateATSScore } from "../../../../../../lib/atsService";
import { getGmailAccessToken } from "../../../../../../lib/gmailServer";
import { newId } from "../../../../../../lib/server-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function header(message: any, name: string) {
  return message?.payload?.headers?.find((h: any) => String(h.name).toLowerCase() === name.toLowerCase())?.value || "";
}
function partsOf(part: any): any[] {
  return Array.isArray(part?.parts) ? part.parts.flatMap((p: any) => [p, ...partsOf(p)]) : [];
}
function b64urlToBuffer(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function POST(req: NextRequest) {
  try {
    const { token, context } = await getGmailAccessToken(req);
    const jobs = (await context.supabase.from("RecruiterJob").select("id,title,description").eq("recruiterUserId", context.user.id)).data || [];
    const query = "has:attachment filename:pdf newer_than:90d";
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
    const listed = await listRes.json();
    if (!listRes.ok) return NextResponse.json({ message: listed?.error?.message || "Impossible de lire Gmail." }, { status: listRes.status });

    let imported = 0;
    let skipped = 0;
    const items: any[] = [];
    for (const item of listed.messages || []) {
      const messageId = String(item.id);
      const existing = await context.supabase.from("Application").select("id").eq("sourceMessageId", messageId).limit(1);
      if ((existing.data || []).length) { skipped++; continue; }

      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
      const message = await msgRes.json();
      if (!msgRes.ok) { skipped++; continue; }

      const sender = header(message, "From");
      const senderEmail = (sender.match(/<([^>]+)>/)?.[1] || sender).trim().toLowerCase();
      const subject = header(message, "Subject");
      const candidateName = sender.replace(/<[^>]+>/g, "").replace(/\"/g, "").trim() || senderEmail;
      const parts = [message.payload, ...partsOf(message.payload)].filter(Boolean);
      const pdf = parts.find((p: any) => String(p.filename || "").toLowerCase().endsWith(".pdf") && (p.body?.attachmentId || p.body?.data));
      if (!pdf || !senderEmail || senderEmail === String(context.user.email || "").toLowerCase()) { skipped++; continue; }

      let pdfBytes: Buffer;
      if (pdf.body.attachmentId) {
        const attRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(pdf.body.attachmentId)}`, { headers: { Authorization: `Bearer ${token}` } });
        const attachment = await attRes.json();
        if (!attRes.ok || !attachment.data) { skipped++; continue; }
        pdfBytes = b64urlToBuffer(attachment.data);
      } else pdfBytes = b64urlToBuffer(pdf.body.data);

      const parser = new PDFParse({ data: pdfBytes });
      const parsed = await parser.getText();
      await parser.destroy();
      const cvText = String(parsed.text || "").replace(/\u0000/g, " ").trim();
      if (cvText.length < 80) { skipped++; continue; }

      const job = jobs.find((j: any) => subject.toLowerCase().includes(String(j.title || "").toLowerCase())) || jobs.find((j: any) => cvText.toLowerCase().includes(String(j.title || "").toLowerCase()));
      const score = job ? calculateATSScore(cvText, `${job.title}\n${job.description}`).score : null;

      let user = (await context.supabase.from("User").select("id").eq("email", senderEmail).limit(1)).data?.[0];
      if (!user) {
        user = { id: newId() };
        const { error: userError } = await context.supabase.from("User").insert({ id: user.id, email: senderEmail, displayName: candidateName, role: "TALENT", updatedAt: new Date().toISOString() });
        if (userError) { skipped++; continue; }
      }

      const now = new Date().toISOString();
      const { data: application, error: appError } = await context.supabase.from("Application").insert({
        id: newId(), userId: user.id, recruiterJobId: job?.id || null, status: "SUBMITTED", language: "fr",
        letterText: null, atsScore: score, submittedAt: now, statusSource: "GMAIL", createdAt: now, updatedAt: now,
        sourceType: "GMAIL", sourceMessageId: messageId, sourceThreadId: message.threadId || null, sourceEmail: senderEmail, sourceCandidateName: candidateName,
        sourceAttachmentId: pdf.body.attachmentId || null, sourceFilename: pdf.filename || "CV.pdf",
        cvUrl: `/api/recruiter/gmail/attachment?applicationId=${encodeURIComponent(String(application?.id || ""))}`,
      }).select("id").single();
      if (appError) { skipped++; continue; }
      imported++;
      items.push({ id: application.id, jobTitle: job?.title || "À affecter", candidateName, candidateEmail: senderEmail, atsScore: score, source: "Gmail" });
    }

    return NextResponse.json({ ok: true, imported, skipped, scanned: (listed.messages || []).length, applications: items });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Import Gmail impossible." }, { status: 500 });
  }
}
