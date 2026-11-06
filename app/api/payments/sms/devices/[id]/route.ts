import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../lib/server-auth";

const err = (message: string, status: number, code = message) => NextResponse.json({ error: code, message }, { status });

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");
    const { id } = await params;
    const supabase = adminClient();
    const actor = await ensureUser(supabase, auth);
    if (String(actor.role).toUpperCase() !== "ADMIN") return err("Accès réservé au compte ADMIN maître.", 403, "FORBIDDEN");
    const { data: identity, error: identityError } = await supabase.from("AdminIdentity").select("active")
      .eq("authUserId", auth.id).eq("ownerUserId", actor.id).maybeSingle();
    if (identityError) throw new Error(identityError.message);
    if (!identity?.active) return err("Identité ADMIN maître inactive.", 403, "ADMIN_IDENTITY_INACTIVE");

    const now = new Date().toISOString();
    const { data: device, error } = await supabase.from("PaymentSmsDevice")
      .update({ status: "REVOKED", revokedAt: now, updatedAt: now })
      .eq("id", id).eq("status", "ACTIVE")
      .select("id,provider,merchantAccount,status,revokedAt").maybeSingle();
    if (error) throw new Error(error.message);
    if (!device) return err("Téléphone marchand introuvable ou déjà révoqué.", 404, "DEVICE_NOT_FOUND");

    const { error: auditError } = await supabase.from("CEOAuditLog").insert({
      adminUserId: actor.id,
      action: "PAYMENT_SMS_DEVICE_REVOKED",
      endpoint: "/api/payments/sms/devices/[id]",
      metadata: { deviceId: device.id, provider: device.provider, merchantAccount: device.merchantAccount },
    });
    if (auditError) throw new Error("DEVICE_REVOKED_BUT_AUDIT_FAILED: " + auditError.message);
    return NextResponse.json({ device });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Révocation du téléphone impossible.", 500);
  }
}
