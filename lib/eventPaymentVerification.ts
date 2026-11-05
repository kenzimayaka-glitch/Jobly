export type EventPaymentVerification = {
  externalId?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
};

export function eventPaymentVerificationError(input: {
  expectedExternalId: string;
  expectedAmount: number;
  expectedCurrency: string;
  verification: EventPaymentVerification;
}): string | null {
  const expectedReference = input.expectedExternalId.trim();
  const actualReference = String(input.verification.externalId ?? "").trim();
  if (!expectedReference || actualReference !== expectedReference) return "PAYMENT_REFERENCE_MISMATCH";
  if (String(input.verification.status ?? "").toUpperCase() !== "SUCCESSFUL") return "PAYMENT_NOT_CONFIRMED";

  const amount = Number(input.verification.amount);
  if (!Number.isFinite(amount) || amount !== input.expectedAmount) return "PAYMENT_AMOUNT_MISMATCH";

  const currency = String(input.verification.currency ?? "").trim().toUpperCase();
  if (currency !== input.expectedCurrency.trim().toUpperCase()) return "PAYMENT_CURRENCY_MISMATCH";
  return null;
}
