import { NextRequest, NextResponse } from "next/server";
import { getGmailAccessToken } from "../../../../../lib/gmailServer";

function b64urlToBuffer(data: string) { return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64"); }

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const intakeId = url.searchParams.get("intakeId");
    const applicationId = url.searchParams.get("applicationId");
    const { token, context } = await getGmailAccessToken(req);
    let messageId:string, attachmentId:string|null, filename:string;
    if(intakeId){
      const {data:intake,error}=await context.supabase.from("RecruiterGmailIntake")
        .select("id,recruiterUserId,sourceMessageId,sourceAttachmentId,sourceFilename")
        .eq("id",intakeId).eq("recruiterUserId",context.user.id).maybeSingle();
      if(error)throw new Error(error.message);
      if(!intake)return NextResponse.json({message:"Accès refusé."},{status:403});
      messageId=intake.sourceMessageId;attachmentId=intake.sourceAttachmentId==="inline"?null:intake.sourceAttachmentId;filename=intake.sourceFilename;
    }else{
      if(!applicationId)return NextResponse.json({message:"Candidature manquante."},{status:400});
      const {data:application,error}=await context.supabase.from("Application")
        .select("id,recruiterJobId,sourceMessageId,sourceAttachmentId,sourceFilename")
        .eq("id",applicationId).maybeSingle();
      if(error)throw new Error(error.message);
      if(!application?.sourceMessageId||!application.sourceAttachmentId)return NextResponse.json({message:"Pièce jointe Gmail indisponible."},{status:404});
      const {data:job}=await context.supabase.from("RecruiterJob").select("id")
        .eq("id",application.recruiterJobId).eq("recruiterUserId",context.user.id).maybeSingle();
      if(!job)return NextResponse.json({message:"Accès refusé."},{status:403});
      messageId=application.sourceMessageId;attachmentId=application.sourceAttachmentId;filename=application.sourceFilename||"CV.pdf";
    }
    if(!attachmentId)return NextResponse.json({message:"Cette pièce jointe Gmail est conservée dans le corps du message et doit être récupérée par le connecteur."},{status:422});
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok || !result.data) return NextResponse.json({ message: "Impossible de récupérer le CV Gmail." }, { status: response.status || 502 });
    return new NextResponse(b64urlToBuffer(result.data), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${String(filename || "CV.pdf").replace(/[^a-zA-Z0-9._-]/g, "_")}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "CV Gmail indisponible." }, { status: Number.isInteger((error as any)?.status) ? (error as any).status : 500 }); }
}
