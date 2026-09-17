import { NextRequest, NextResponse } from "next/server";
import { getGmailAccessToken } from "../../../../../../lib/gmailServer";

function b64urlToBuffer(data: string) { return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64"); }

export async function GET(req: NextRequest) {
  try {
    const applicationId = new URL(req.url).searchParams.get("applicationId");
    if (!applicationId) return NextResponse.json({ message: "Candidature manquante." }, { status: 400 });
    const { token, context } = await getGmailAccessToken(req);
    const { data: application, error } = await context.supabase.from("Application").select("id,recruiterJobId,sourceMessageId,sourceAttachmentId,sourceFilename").eq("id", applicationId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!application?.sourceMessageId || !application.sourceAttachmentId) return NextResponse.json({ message: "Pièce jointe Gmail indisponible." }, { status: 404 });
    if (application.recruiterJobId) {
      const { data: job } = await context.supabase.from("RecruiterJob").select("id").eq("id", application.recruiterJobId).eq("recruiterUserId", context.user.id).maybeSingle();
      if (!job) return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
    } else {
      const { data: owned } = await context.supabase.from("RecruiterJob").select("id").eq("recruiterUserId", context.user.id).limit(1);
      if (!owned?.length) return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
    }
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(application.sourceMessageId)}/attachments/${encodeURIComponent(application.sourceAttachmentId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok || !result.data) return NextResponse.json({ message: "Impossible de récupérer le CV Gmail." }, { status: response.status || 502 });
    return new NextResponse(b64urlToBuffer(result.data), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${String(application.sourceFilename || "CV.pdf").replace(/[^a-zA-Z0-9._-]/g, "_")}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "CV Gmail indisponible." }, { status: 500 }); }
}
