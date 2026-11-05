import type { PaymentSmsParseResult } from "./parser";

export type PaymentSmsCandidate = {
  id: string;
  userId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  payerPhone: string | null;
  reportedTransactionId: string | null;
  smsMerchantAccount: string | null;
  createdAt: string;
};

export type PaymentSmsMatchResult =
  | { outcome: "MATCHED"; payment: PaymentSmsCandidate; reason: "TRANSACTION_ID" }
  | { outcome: "UNMATCHED"; reason: string; candidateCount: number }
  | { outcome: "AMBIGUOUS"; reason: string; candidateCount: number };

function normalizeId(value: string | null | undefined): string {
  return String(value || "").trim().toUpperCase();
}

function normalizePhone(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

export function matchPaymentSmsToOrder(input: {
  parsed: PaymentSmsParseResult;
  merchantAccount: string;
  candidates: PaymentSmsCandidate[];
  now?: Date;
  maxAgeMs?: number;
}): PaymentSmsMatchResult {
  const { parsed } = input;
  const now = input.now || new Date();
  const maxAgeMs = input.maxAgeMs ?? 24 * 60 * 60 * 1000;

  if (!parsed.senderTrusted || !parsed.provider) return { outcome: "UNMATCHED", reason: "SENDER_NOT_ALLOWLISTED", candidateCount: 0 };
  if (parsed.status !== "SUCCESSFUL") return { outcome: "UNMATCHED", reason: "SMS_NOT_SUCCESSFUL", candidateCount: 0 };
  if (!parsed.transactionId) return { outcome: "UNMATCHED", reason: "TRANSACTION_ID_MISSING", candidateCount: 0 };
  if (!parsed.amountXaf || parsed.currency !== "XAF") return { outcome: "UNMATCHED", reason: "AMOUNT_OR_CURRENCY_INVALID", candidateCount: 0 };
  if (parsed.fraudFlags.length > 0) return { outcome: "UNMATCHED", reason: "FRAUD_FLAGS_PRESENT", candidateCount: 0 };

  const merchant = normalizePhone(input.merchantAccount);
  if (!merchant) return { outcome: "UNMATCHED", reason: "MERCHANT_ACCOUNT_NOT_CONFIGURED", candidateCount: 0 };

  const eligible = input.candidates.filter((candidate) => {
    if (candidate.provider !== parsed.provider || !candidate.userId) return false;
    if (!["CREATED", "PENDING"].includes(candidate.status)) return false;
    if (Number(candidate.amount) !== parsed.amountXaf || candidate.currency.toUpperCase() !== "XAF") return false;
    if (normalizePhone(candidate.smsMerchantAccount) !== merchant) return false;
    const createdAt = Date.parse(candidate.createdAt);
    return Number.isFinite(createdAt) && createdAt <= now.getTime() && now.getTime() - createdAt <= maxAgeMs;
  });

  const transactionId = normalizeId(parsed.transactionId);
  // A transaction ID must have been submitted by the customer. Never infer a match
  // from amount or payer phone alone, even when a single candidate is found.
  const exactReference = eligible.filter((candidate) => normalizeId(candidate.reportedTransactionId) === transactionId);
  if (exactReference.length === 1) {
    const payment = exactReference[0];
    if (parsed.payerPhone && payment.payerPhone && normalizePhone(parsed.payerPhone) !== normalizePhone(payment.payerPhone)) {
      return { outcome: "UNMATCHED", reason: "PAYER_PHONE_MISMATCH", candidateCount: 1 };
    }
    return { outcome: "MATCHED", payment, reason: "TRANSACTION_ID" };
  }
  if (exactReference.length > 1) return { outcome: "AMBIGUOUS", reason: "TRANSACTION_ID_NOT_UNIQUE", candidateCount: exactReference.length };
  return { outcome: "UNMATCHED", reason: "CUSTOMER_TRANSACTION_REFERENCE_NOT_FOUND", candidateCount: eligible.length };
}
