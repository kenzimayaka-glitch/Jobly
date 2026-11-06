import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { normalizeMerchantAccount, validateMerchantCode } from "../../../../../lib/paymentSms/config";
import type { PaymentSmsProvider } from "../../../../../lib/paymentSms/parser";

const err = (message: string, status: number, code = message) =>
  NextResponse.json({ error: code, message }, { status });

const PROVIDERS: PaymentSmsProvider[] = ["SMS_MTN", "SMS_ORANGE"];

function maskMerchantCode(value: string): string {
  return value.length <= 4 ? "••••" : "••••" + value.slice(-4);
}

async function getAdmin(request: NextRequest, allowFinance = false) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: err("Session requise.", 401, "UNAUTHENTICATED") };
  const supabase = adminClient();
  const actor = await ensureUser(supabase, auth);
  if (String(actor.role) !== "ADMIN" && !(allowFinance && String(actor.role) === "FINANCE")) {
    return { error: err("Seul un administrateur Jobly peut modifier la configuration Mobile Money.", 403, "ADMIN_REQUIRED") };
  }
  return { supabase, actor };
}

export async function GET(request: NextRequest) {
  try {
    const access = await getAdmin(request, true);
    if ("error" in access) return access.error;
    const { data, error } = await access.supabase
      .from("PaymentSmsProviderConfig")
      .select("provider,merchantAccount,merchantCode,isActive,updatedAt")
      .order("provider");
    if (error) throw new Error("PAYMENT_SMS_CONFIG_READ_FAILED");

    const configs = (data || []).map((item: any) => ({
      provider: item.provider,
      merchantAccount: item.merchantAccount,
      configured: Boolean(item.isActive && item.merchantCode),
      active: Boolean(item.isActive),
      merchantCodeHint: item.merchantCode ? maskMerchantCode(String(item.merchantCode)) : null,
      updatedAt: item.updatedAt || null,
    }));
    return NextResponse.json({ configs });
  } catch {
    return err("Configuration Mobile Money indisponible.", 500, "PAYMENT_SMS_CONFIG_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await getAdmin(request);
    if ("error" in access) return access.error;
    const body = await request.json().catch(() => ({}));
    const provider = String(body.provider || "").toUpperCase() as PaymentSmsProvider;
    if (!PROVIDERS.includes(provider)) return err("Opérateur Mobile Money invalide.", 400, "INVALID_PROVIDER");

    let merchantAccount: string;
    try {
      merchantAccount = normalizeMerchantAccount(String(body.merchantAccount || ""));
    } catch {
      return err("Numéro du compte marchand invalide.", 400, "INVALID_MERCHANT_ACCOUNT");
    }

    const { data: existing, error: readError } = await access.supabase
      .from("PaymentSmsProviderConfig")
      .select("merchantCode")
      .eq("provider", provider)
      .maybeSingle();
    if (readError) throw new Error("PAYMENT_SMS_CONFIG_READ_FAILED");

    const submittedCode = String(body.merchantCode || "").trim();
    let merchantCode = String(existing?.merchantCode || "");
    const merchantCodeChanged = submittedCode.length > 0;
    if (merchantCodeChanged) {
      try {
        merchantCode = validateMerchantCode(provider, submittedCode);
      } catch {
        return err("Le code marchand doit contenir de 1 à 40 caractères alphanumériques, tirets ou underscores.", 400, "INVALID_MERCHANT_CODE");
      }
    }
    if (!merchantCode) {
      return err("Saisis le code marchand pour configurer cet opérateur.", 400, "MERCHANT_CODE_REQUIRED");
    }

    const now = new Date().toISOString();
    const { data: saved, error: saveError } = await access.supabase
      .from("PaymentSmsProviderConfig")
      .upsert({
        provider,
        merchantAccount,
        merchantCode,
        isActive: true,
        updatedByUserId: access.actor.id,
        updatedAt: now,
      }, { onConflict: "provider" })
      .select("provider,merchantAccount,isActive,updatedAt")
      .single();
    if (saveError) throw new Error("PAYMENT_SMS_CONFIG_SAVE_FAILED");

    const { error: auditError } = await access.supabase.from("CEOAuditLog").insert({
      adminUserId: access.actor.id,
      action: "PAYMENT_SMS_PROVIDER_CONFIG_UPDATED",
      endpoint: "/api/payments/sms/config",
      metadata: {
        provider,
        merchantAccount,
        merchantCodeChanged,
        updatedAt: now,
      },
    });
    if (auditError) throw new Error("PAYMENT_SMS_CONFIG_AUDIT_FAILED");

    return NextResponse.json({
      config: {
        provider: saved.provider,
        merchantAccount: saved.merchantAccount,
        configured: true,
        active: Boolean(saved.isActive),
        updatedAt: saved.updatedAt,
      },
      message: "Configuration enregistrée. Les prochaines commandes Mobile Money utiliseront ces paramètres.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PAYMENT_SMS_CONFIG_SAVE_FAILED";
    return err("Enregistrement de la configuration Mobile Money impossible.", 500, code);
  }
}
