/**
 * Pure preflight rules for Jobly SMS payment matching.
 *
 * The SQL match_payment_sms_receipt function is authoritative and performs
 * row locks plus finalize_payment atomically. This helper mirrors its checks
 * for fast feedback and tests; it never grants entitlements.
 */
export type SmsProvider = "SMS_MTN" | "SMS_ORANGE";
export type SmsReceiptStatus = "SUCCESSFUL" | "FAILED" | "PENDING" | "UNKNOWN";

export type SmsPaymentReceipt = {
  provider: SmsProvider | null;
  senderTrusted: boolean;
  status: SmsReceiptStatus;
  transactionId: string | null;
  amountXaf: number | null;
  currency: string | null;
  payerPhone: string | null;
  merchantAccount: string | null;
  occurredAt: string | null;
  receivedAt: string;
};

export type SmsPaymentCandidate = {
  paymentId: string;
  provider: SmsProvider;
  paymentStatus: "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED";
  subscriptionStatus: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELED" | "TRIAL";
  amountXaf: number;
  currency: string;
  payerPhone: string;
  merchantAccount: string;
  createdAt: string;
  declaredTransactionId?: string | null;
};

export type SmsMatchDecision =
  | { decision: "MATCH"; paymentId: string }
  | { decision: "NO_MATCH"; reason: string }
  | { decision: "AMBIGUOUS"; reason: string }
  | { decision: "REJECT"; reason: string };

const MAX_ORDER_AGE_MS = 6 * 60 * 60 * 1000;
const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function phoneDigits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function validTransactionId(value: string | null): boolean {
  return Boolean(value && /^[A-Z0-9][A-Z0-9_-]{4,63}$/i.test(value));
}

export function decideSmsPaymentMatch(
  receipt: SmsPaymentReceipt,
  candidates: SmsPaymentCandidate[],
): SmsMatchDecision {
  if (!receipt.senderTrusted) return { decision: "REJECT", reason: "UNTRUSTED_SENDER" };
  if (receipt.status !== "SUCCESSFUL") return { decision: "REJECT", reason: "MESSAGE_NOT_SUCCESSFUL" };
  if (!receipt.provider || !validTransactionId(receipt.transactionId)) {
    return { decision: "REJECT", reason: "PROVIDER_OR_TRANSACTION_ID_INVALID" };
  }
  if (
    !Number.isSafeInteger(receipt.amountXaf) ||
    (receipt.amountXaf ?? 0) <= 0 ||
    receipt.currency?.toUpperCase() !== "XAF" ||
    !phoneDigits(receipt.payerPhone) ||
    !phoneDigits(receipt.merchantAccount)
  ) {
    return { decision: "REJECT", reason: "RECEIPT_FIELDS_INCOMPLETE" };
  }

  const eventTime = Date.parse(receipt.occurredAt || receipt.receivedAt);
  if (!Number.isFinite(eventTime)) return { decision: "REJECT", reason: "RECEIPT_TIME_INVALID" };

  const matches = candidates.filter((candidate) => {
    const createdAt = Date.parse(candidate.createdAt);
    if (!Number.isFinite(createdAt)) return false;
    const age = eventTime - createdAt;
    return (
      (candidate.paymentStatus === "CREATED" || candidate.paymentStatus === "PENDING") &&
      candidate.subscriptionStatus === "PENDING" &&
      candidate.provider === receipt.provider &&
      candidate.amountXaf === receipt.amountXaf &&
      candidate.currency.toUpperCase() === "XAF" &&
      phoneDigits(candidate.payerPhone) === phoneDigits(receipt.payerPhone) &&
      phoneDigits(candidate.merchantAccount) === phoneDigits(receipt.merchantAccount) &&
      age >= -FUTURE_CLOCK_SKEW_MS &&
      age <= MAX_ORDER_AGE_MS &&
      (!candidate.declaredTransactionId ||
        candidate.declaredTransactionId.toUpperCase() === receipt.transactionId!.toUpperCase())
    );
  });

  if (matches.length === 0) return { decision: "NO_MATCH", reason: "NO_UNIQUE_PAYMENT_ORDER" };
  if (matches.length > 1) return { decision: "AMBIGUOUS", reason: "MULTIPLE_PAYMENT_ORDERS_MATCH" };
  return { decision: "MATCH", paymentId: matches[0].paymentId };
}
