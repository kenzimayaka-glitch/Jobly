import type { PaymentSmsProvider } from "./parser";

export type PaymentSmsCheckoutConfig = {
  provider: PaymentSmsProvider;
  providerLabel: string;
  merchantAccount: string;
  paymentCode: string;
  ussdCode: string;
};

function required(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function normalizeAccount(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) throw new Error("PAYMENT_MERCHANT_ACCOUNT_INVALID");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function getPaymentSmsCheckoutConfig(provider: PaymentSmsProvider): PaymentSmsCheckoutConfig {
  const prefix = provider === "SMS_MTN" ? "JOBLY_MTN" : "JOBLY_ORANGE";
  const providerLabel = provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money";
  const merchantAccount = normalizeAccount(required(`${prefix}_MERCHANT_ACCOUNT`));
  const paymentCode = required(`${prefix}_PAYMENT_CODE`);
  const ussdCode = required(`${prefix}_USSD_CODE`);
  if (!/^[*#][0-9*#]{1,40}#$/.test(ussdCode)) throw new Error(`${prefix}_USSD_CODE_INVALID`);
  if (paymentCode.length > 80 || /[\r\n]/.test(paymentCode)) throw new Error(`${prefix}_PAYMENT_CODE_INVALID`);
  return { provider, providerLabel, merchantAccount, paymentCode, ussdCode };
}

export function normalizeMobileMoneyPhone(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return raw.startsWith("+") ? `+${digits}` : digits;
}
