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
  | { outcome: "MATCHED"; payment: PaymentSmsCandidate; reason: "TRANSACTION_ID" | "UNIQUE_ORDER" }
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
  candidateLimitReached?: boolean;
  now?: Date;
  maxAgeMs?: number;
}): PaymentSmsMatchResult {
  const { parsed } = input;
  const now = input.now || new Date();
  const maxAgeMs = input.maxAgeMs ?? 24 * 60 * 60 * 1000;

  if (!parsed.senderTrusted || !parsed.provider) return { outcome: "UNMATCHED", reason: "SENDER_NOT_ALLOWLISTED", candidateCount: 0 };
  if (parsed.status !== "SUCCESSFUL") return { outcome: "UNMATCHED", reason: "SMS_NOT_SUCCESSFUL", candidateCount: 0 };
  if (parsed.direction !== "INBOUND") return { outcome: "UNMATCHED", reason: "SMS_NOT_MERCHANT_RECEIPT", candidateCount: 0 };
  if (!parsed.transactionId) return { outcome: "UNMATCHED", reason: "TRANSACTION_ID_MISSING", candidateCount: 0 };
  if (!parsed.amountXaf || parsed.currency !== "XAF") return { outcome: "UNMATCHED", reason: "AMOUNT_OR_CURRENCY_INVALID", candidateCount: 0 };
  if (parsed.fraudFlags.length > 0) return { outcome: "UNMATCHED", reason: "FRAUD_FLAGS_PRESENT", candidateCount: 0 };

  const merchant = normalizePhone(input.merchantAccount);
  if (!merchant) return { outcome: "UNMATCHED", reason: "MERCHANT_ACCOUNT_NOT_CONFIGURED", candidateCount: 0 };
  if (parsed.merchantAccount && normalizePhone(parsed.merchantAccount) !== merchant) {
    return { outcome: "UNMATCHED", reason: "SMS_MERCHANT_MISMATCH", candidateCount: 0 };
  }

  const occurredAt = parsed.occurredAt ? Date.parse(parsed.occurredAt) : now.getTime();
  if (!Number.isFinite(occurredAt) || occurredAt > now.getTime() + 5 * 60 * 1000) {
    return { outcome: "UNMATCHED", reason: "SMS_TRANSACTION_TIME_INVALID", candidateCount: 0 };
  }

  const eligible = input.candidates.filter((candidate) => {
    if (candidate.provider !== parsed.provider || !candidate.userId) return false;
    if (!["CREATED", "PENDING"].includes(candidate.status)) return false;
    if (Number(candidate.amount) !== parsed.amountXaf || candidate.currency.toUpperCase() !== "XAF") return false;
    if (normalizePhone(candidate.smsMerchantAccount) !== merchant) return false;
    const createdAt = Date.parse(candidate.createdAt);
    if (!Number.isFinite(createdAt) || createdAt > now.getTime()) return false;
    // Prefer the operator's transaction timestamp when it is present. Never
    // allow a receipt that predates the Jobly checkout beyond a small clock skew.
    if (occurredAt < createdAt - 2 * 60 * 1000 || occurredAt - createdAt > maxAgeMs) return false;
    // An explicitly entered but different reference is a hard conflict, not
    // a reason to fall back to amount-based matching.
    const submittedReference = normalizeId(candidate.reportedTransactionId);
    if (submittedReference && submittedReference !== normalizeId(parsed.transactionId)) return false;
    // A known payer mismatch removes the candidate. Missing payer numbers are
    // not fabricated; uniqueness is still required below.
    if (parsed.payerPhone && (!candidate.payerPhone ||
        normalizePhone(parsed.payerPhone) !== normalizePhone(candidate.payerPhone))) return false;
    return true;
  });

  const transactionId = normalizeId(parsed.transactionId);
  const exactReference = eligible.filter((candidate) => normalizeId(candidate.reportedTransactionId) === transactionId);
  if (exactReference.length === 1) return { outcome: "MATCHED", payment: exactReference[0], reason: "TRANSACTION_ID" };
  if (exactReference.length > 1) return { outcome: "AMBIGUOUS", reason: "TRANSACTION_ID_NOT_UNIQUE", candidateCount: exactReference.length };

  // A unique transaction reference is protected by a database unique index.
  // Without that exact reference, never claim uniqueness from a truncated query.
  if (input.candidateLimitReached) {
    return { outcome: "AMBIGUOUS", reason: "CANDIDATE_SEARCH_LIMIT_REACHED", candidateCount: input.candidates.length };
  }

  const unclaimedOrders = eligible.filter((candidate) => !candidate.reportedTransactionId);
  if (unclaimedOrders.length === 1) return { outcome: "MATCHED", payment: unclaimedOrders[0], reason: "UNIQUE_ORDER" };
  if (unclaimedOrders.length > 1) {
    return { outcome: "AMBIGUOUS", reason: "MULTIPLE_ORDERS_SHARE_PAYMENT_SIGNATURE", candidateCount: unclaimedOrders.length };
  }
  return { outcome: "UNMATCHED", reason: "NO_UNIQUE_PAYMENT_ORDER", candidateCount: eligible.length };
}
