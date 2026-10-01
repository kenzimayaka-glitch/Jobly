import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!/^[A-F0-9]{10}$/.test(rawCode)) {
      return NextResponse.json({ message: "Code invalide." }, { status: 400 });
    }

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const email = (authUser.email || user.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ message: "Un e-mail est requis pour rattacher ce code." }, { status: 400 });

    const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
    const { data: code, error } = await supabase
      .from("RecruitmentInvitationCode")
      .select("id,applicationId,email,expiresAt,usedAt")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!code) return NextResponse.json({ message: "Code inconnu." }, { status: 404 });
    if (code.usedAt) return NextResponse.json({ message: "Ce code a déjà été utilisé." }, { status: 409 });
    if (new Date(code.expiresAt).getTime() <= Date.now()) return NextResponse.json({ message: "Ce code a expiré." }, { status: 410 });
    if (code.email.toLowerCase() !== email) return NextResponse.json({ message: "Ce code est lié à une autre adresse e-mail." }, { status: 403 });

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("RecruitmentInvitationCode")
      .update({ usedAt: now, usedByUserId: user.id })
      .eq("id", code.id)
      .is("usedAt", null)
      .select("id,applicationId,usedAt")
      .maybeSingle();

    if (updateError) throw new Error(updateError.message);
    if (!updated) return NextResponse.json({ message: "Ce code vient d'être utilisé par une autre session." }, { status: 409 });

    const { data: application, error: applicationError } = await supabase
      .from("Application")
      .select("id,userId")
      .eq("id", code.applicationId)
      .maybeSingle();
    if (applicationError) throw new Error(applicationError.message);
    if (!application) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });

    if (String(application.userId) !== String(user.id)) {
      const { error: attachError } = await supabase
        .from("Application")
        .update({ userId: user.id, updatedAt: now })
        .eq("id", application.id);
      if (attachError) throw new Error(attachError.message);
    }

    await supabase.from("RecruitmentAuditLog").insert({
      applicationId: application.id,
      actorUserId: user.id,
      action: "INVITATION_CODE_REDEEMED",
      metadata: { email },
    });

    return NextResponse.json({ ok: true, applicationId: application.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de rattacher le code." },
      { status: 500 }
    );
  }
}
