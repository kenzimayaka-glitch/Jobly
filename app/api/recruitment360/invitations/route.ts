import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

function auth(req: NextRequest) {
  return getAuthUser(req);
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await auth(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const body = await req.json().catch(() => ({}));
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!applicationId || !email) {
      return NextResponse.json({ message: "applicationId et email sont requis." }, { status: 400 });
    }

    const { data: application, error: appError } = await supabase
      .from("Application")
      .select("id,userId,recruiterJobId")
      .eq("id", applicationId)
      .maybeSingle();
    if (appError) throw new Error(appError.message);
    if (!application?.recruiterJobId) return NextResponse.json({ message: "Candidature Recrutement 360° introuvable." }, { status: 404 });

    const { data: recruitment } = await supabase
      .from("Recruitment360")
      .select("id")
      .eq("recruiterJobId", application.recruiterJobId)
      .maybeSingle();
    if (!recruitment) return NextResponse.json({ message: "Recrutement 360° introuvable." }, { status: 404 });

    const { data: role } = await supabase
      .from("RecruitmentRole")
      .select("role")
      .eq("recruitmentId", recruitment.id)
      .eq("userId", user.id)
      .in("role", ["OWNER", "HR", "MANAGER", "DELEGATE"])
      .maybeSingle();
    if (!role) return NextResponse.json({ message: "Accès recruteur refusé." }, { status: 403 });

    const rawCode = crypto.randomBytes(5).toString("hex").toUpperCase();
    const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { data: code, error } = await supabase
      .from("RecruitmentInvitationCode")
      .insert({
        applicationId,
        email,
        code_hash: codeHash,
        expiresAt,
      })
      .select("id,expiresAt")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("RecruitmentAuditLog").insert({
      recruitmentId: recruitment.id,
      applicationId,
      actorUserId: user.id,
      action: "INVITATION_CODE_CREATED",
      metadata: { email, expiresAt },
    });

    return NextResponse.json({ code: rawCode, expiresAt: code.expiresAt });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de générer le code." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { message: "Les codes sont à usage unique et expirent automatiquement ; ils ne peuvent pas être révoqués depuis ce point d'entrée." },
    { status: 405 }
  );
}
