import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import type { PaymentSmsProvider } from "../../../../../lib/paymentSms/parser";

const err = (message: string, status: number, code = message) => NextResponse.json({ error: code, message }, { status });

function normalizeAccount(value: unknown): string | null {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return raw.startsWith("+") ? `+${digits}` : digits;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");
    const supabase = adminClient();
    const actor = await ensureUser(supabase, auth);
    if (!["ADMIN", "FINANCE"].includes(String(actor.role))) return err("Accès administrateur requis.", 403, "FORBIDDEN");

    const body = await request.json().catch(() => ({}));
    const provider = String(body.provider || "").toUpperCase() as PaymentSmsProvider;
    if (provider !== "SMS_MTN" && provider !== "SMS_ORANGE") return err("Opérateur SMS invalide.", 400, "INVALID_PROVIDER");
    const label = String(body.label || "Téléphone marchand Jobly").trim().slice(0, 100);
    const merchantAccount = normalizeAccount(body.merchantAccount);
    const senderIds = Array.isArray(body.senderIds)
      ? [...new Set(body.senderIds.map((value: unknown) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ")).filter((value: string) => value.length > 0 && value.length <= 120))]
      : [];
    if (!merchantAccount) return err("Numéro marchand invalide.", 400, "INVALID_MERCHANT_ACCOUNT");
    if (!label) return err("Nom du téléphone requis.", 400, "DEVICE_LABEL_REQUIRED");
    if (!senderIds.length || senderIds.length > 10) return err("Configurez entre 1 et 10 noms d'expéditeurs exacts.", 400, "SENDER_ALLOWLIST_REQUIRED");

    const deviceToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(deviceToken).digest("hex");
    const { data: device, error } = await supabase.from("PaymentSmsDevice").insert({
      label, provider, merchantAccount, senderIds, tokenHash, status: "ACTIVE", createdByUserId: actor.id,
    }).select("id,label,provider,merchantAccount,senderIds,status,createdAt").single();
    if (error) throw new Error(error.message);

    const { error: auditError } = await supabase.from("CEOAuditLog").insert({
      adminUserId: actor.id,
      action: "PAYMENT_SMS_DEVICE_PROVISIONED",
      endpoint: "/api/payments/sms/devices",
      metadata: { deviceId: device.id, provider, merchantAccount, senderIds },
    });
    if (auditError) {
      await supabase.from("PaymentSmsDevice").update({ status: "REVOKED", revokedAt: new Date().toISOString() }).eq("id", device.id);
      throw new Error("DEVICE_CREATED_BUT_AUDIT_FAILED: " + auditError.message);
    }

    // The raw token is shown once. The Android app must store it in Android Keystore.
    return NextResponse.json({ device, deviceToken }, { status: 201 });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Provisionnement du téléphone impossible.", 500);
  }
}
