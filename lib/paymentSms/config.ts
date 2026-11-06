import type { PaymentSmsProvider } from "./parser";

export type PaymentSmsCheckoutConfig = {
  provider: PaymentSmsProvider;
  providerLabel: string;
  merchantAccount: string;
  merchantCode: string;
};

function required(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function normalizeAccount(value: string): string {
  const digits = value.trim().replace(/\D/g, "");
  if (digits.length === 9) return "237" + digits;
  if (digits.length === 12 && digits.startsWith("237")) return digits;
  if (digits.length < 9 || digits.length > 15) throw new Error("PAYMENT_MERCHANT_ACCOUNT_INVALID");
  return digits;
}

export function getPaymentSmsCheckoutConfig(provider: PaymentSmsProvider): PaymentSmsCheckoutConfig {
  const prefix = provider === "SMS_MTN" ? "JOBLY_MTN" : "JOBLY_ORANGE";
  return {
    provider,
    providerLabel: provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money",
    merchantAccount: normalizeAccount(required(`${prefix}_MERCHANT_ACCOUNT`)),
    merchantCode: required(`${prefix}_MERCHANT_CODE`).replace(/\s+/g, ""),
  };
}

/**
 * Builds the exact operator shortcode for this order amount.
 * MTN:    *126*16*merchantCode*amount#
 * Orange: #150*47*merchantCode*amount#
 */
export function buildPaymentSmsUssd(provider: PaymentSmsProvider, amount: number): {
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
  const config = getPaymentSmsCheckoutConfig(provider);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(config.merchantCode)) {
    throw new Error(provider === "SMS_MTN" ? "JOBLY_MTN_MERCHANT_CODE_INVALID" : "JOBLY_ORANGE_MERCHANT_CODE_INVALID");
  }
  const ussdCode = provider === "SMS_MTN"
    ? `*126*16*${config.merchantCode}*${amount}#`
    : `#150*47*${config.merchantCode}*${amount}#`;
  return { ...config, paymentCode: ussdCode, ussdCode };
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
