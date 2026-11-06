import type { PaymentSmsProvider } from "./parser";

export type PaymentSmsCheckoutConfig = {
  provider: PaymentSmsProvider;
  providerLabel: string;
  merchantAccount: string;
  merchantCode: string;
};

export function normalizeMerchantAccount(value: string): string {
  const digits = value.trim().replace(/\D/g, "");
  if (digits.length === 9) return "237" + digits;
  if (digits.length === 12 && digits.startsWith("237")) return digits;
  if (digits.length < 9 || digits.length > 15) throw new Error("PAYMENT_MERCHANT_ACCOUNT_INVALID");
  return digits;
}

export function validateMerchantCode(provider: PaymentSmsProvider, value: string): string {
  const merchantCode = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(merchantCode)) {
    throw new Error(provider === "SMS_MTN" ? "JOBLY_MTN_MERCHANT_CODE_INVALID" : "JOBLY_ORANGE_MERCHANT_CODE_INVALID");
  }
  return merchantCode;
}

/**
 * Loads the active operator configuration from the restricted server-only table.
 * No merchant code is stored in application source or public environment variables.
 */
export async function getPaymentSmsCheckoutConfig(
  supabase: any,
  provider: PaymentSmsProvider,
): Promise<PaymentSmsCheckoutConfig> {
  const { data, error } = await supabase
    .from("PaymentSmsProviderConfig")
    .select("provider,merchantAccount,merchantCode,isActive")
    .eq("provider", provider)
    .eq("isActive", true)
    .maybeSingle();
  if (error) throw new Error("PAYMENT_SMS_CONFIG_READ_FAILED");
  if (!data) throw new Error(provider === "SMS_MTN" ? "JOBLY_MTN_NOT_CONFIGURED" : "JOBLY_ORANGE_NOT_CONFIGURED");
  return {
    provider,
    providerLabel: provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money",
    merchantAccount: normalizeMerchantAccount(String(data.merchantAccount || "")),
    merchantCode: validateMerchantCode(provider, String(data.merchantCode || "")),
  };
}

/**
 * Builds the exact operator shortcode for this order amount.
 * MTN:    *126*16*merchantCode*amount#
 * Orange: #150*47*merchantCode*amount#
 */
export function buildPaymentSmsUssd(
  provider: PaymentSmsProvider,
  amount: number,
  config: PaymentSmsCheckoutConfig,
): {
  provider: PaymentSmsProvider;
  providerLabel: string;
  merchantAccount: string;
  merchantCode: string;
  paymentCode: string;
  ussdCode: string;
} {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100_000_000) {
    throw new Error("PAYMENT_AMOUNT_INVALID");
  }
  if (config.provider !== provider) throw new Error("PAYMENT_PROVIDER_CONFIG_MISMATCH");
  const merchantAccount = normalizeMerchantAccount(config.merchantAccount);
  const merchantCode = validateMerchantCode(provider, config.merchantCode);
  const ussdCode = provider === "SMS_MTN"
    ? `*126*16*${merchantCode}*${amount}#`
    : `#150*47*${merchantCode}*${amount}#`;
  return {
    provider,
    providerLabel: provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money",
    merchantAccount,
    merchantCode,
    paymentCode: ussdCode,
    ussdCode,
  };
}

export function normalizeMobileMoneyPhone(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return "237" + digits;
  if (digits.length === 12 && digits.startsWith("237")) return digits;
  if (digits.length < 9 || digits.length > 15) return null;
  return raw.startsWith("+") ? "+" + digits : digits;
}
