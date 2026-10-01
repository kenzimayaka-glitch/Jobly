import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { sendFallbackDelivery } from "@/lib/recruitment360/notification-providers";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const s = adminClient();
    const u = await ensureUser(s, auth);
    const body = await req.json();
    if (!body.applicationId || !body.channel || !["SMS", "CALL"].includes(body.channel)) {
      throw new Error("EMERGENCY_FIELDS_REQUIRED");
    }
    const { data: application, error } = await s.from("Application").select("id,userId").eq("id", body.applicationId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!application || String(application.userId) !== String(u.id)) throw new Error("FORBIDDEN");

    const result = await sendFallbackDelivery({
      applicationId: application.id,
      recipientUserId: u.id,
      recipient: String(body.recipient || ""),
      message: String(body.message || "Jobly : alerte critique liée à votre parcours de recrutement."),
      channel: body.channel,
    });

    return NextResponse.json({
      ...result,
      honestMessage: result.sent
        ? "Alerte transmise par le fournisseur configuré."
        : "Aucune alerte SMS/appel n'a été prétendue comme envoyée. L'intention a été journalisée côté serveur.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}
