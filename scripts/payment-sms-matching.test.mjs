import assert from "node:assert/strict";
import test from "node:test";
import { matchPaymentSmsToOrder } from "../lib/paymentSms/matching.ts";

const now = new Date("2026-11-06T12:00:00.000Z");
const parsed = {
  parserVersion: "0.2.0", provider: "SMS_MTN", senderId: "JOBLY-MTN-TEST", senderTrusted: true,
  status: "SUCCESSFUL", direction: "INBOUND", transactionId: "MTNABC123456", amountXaf: 10000, currency: "XAF",
  payerPhone: "237677123456", merchantAccount: "237699123456", occurredAt: now.toISOString(), fraudFlags: [],
};
const base = {
  id: "payment-1", userId: "user-1", provider: "SMS_MTN", status: "PENDING", amount: 10000, currency: "XAF",
  payerPhone: "237677123456", reportedTransactionId: null, smsMerchantAccount: "237699123456",
  createdAt: "2026-11-06T11:00:00.000Z",
};
const run = (overrides = {}, parsedOverrides = {}, candidates = null) => matchPaymentSmsToOrder({
  parsed: { ...parsed, ...parsedOverrides }, merchantAccount: "237699123456",
  candidates: candidates || [{ ...base, ...overrides }], now,
});

test("automatically matches a single eligible order from the merchant SMS transaction ID", () => {
  const result = run();
  assert.equal(result.outcome, "MATCHED");
  assert.equal(result.reason, "UNIQUE_ORDER");
  if (result.outcome === "MATCHED") assert.equal(result.payment.id, "payment-1");
});

test("prefers an exact customer-submitted transaction reference when present", () => {
  assert.equal(run({ reportedTransactionId: "mtnabc123456" }).outcome, "MATCHED");
});

test("never matches by amount alone when multiple orders are compatible", () => {
  const result = run({}, {}, [base, { ...base, id: "payment-2" }]);
  assert.equal(result.outcome, "AMBIGUOUS");
});

test("a known payer mismatch cannot be rescued by amount and merchant equality", () => {
  assert.equal(run({ payerPhone: "237699000000" }).outcome, "UNMATCHED");
});

test("rejects a conflicting reference entered by the customer", () => {
  assert.equal(run({ reportedTransactionId: "WRONGREF123" }).outcome, "UNMATCHED");
});

test("does not match a different merchant account", () => {
  assert.equal(run({ smsMerchantAccount: "237688123456" }).outcome, "UNMATCHED");
});

test("does not resolve a transaction reference associated with multiple orders", () => {
  const candidates = [
    { ...base, reportedTransactionId: "MTNABC123456" },
    { ...base, id: "payment-2", reportedTransactionId: "MTNABC123456" },
  ];
  const result = run({}, {}, candidates);
  assert.equal(result.outcome, "AMBIGUOUS");
});

test("rejects a spoofed sender and parser fraud flags", () => {
  assert.equal(run({}, { senderTrusted: false, provider: null }).outcome, "UNMATCHED");
  assert.equal(run({}, { fraudFlags: ["SMS_CONTAINS_URL"] }).reason, "FRAUD_FLAGS_PRESENT");
});

test("refuses outgoing SMS even when status, amount and transaction ID look valid", () => {
  const result = run({}, { direction: "OUTBOUND" });
  assert.equal(result.outcome, "UNMATCHED");
  assert.equal(result.reason, "SMS_NOT_MERCHANT_RECEIPT");
});

test("requires positive incoming direction, not an unknown direction", () => {
  const result = run({}, { direction: "UNKNOWN" });
  assert.equal(result.outcome, "UNMATCHED");
  assert.equal(result.reason, "SMS_NOT_MERCHANT_RECEIPT");
});

test("matches dotted Orange transaction IDs to their unique matching order", () => {
  const orangeParsed = {
    ...parsed, provider: "SMS_ORANGE", transactionId: "MP240417.1311.B48838",
    amountXaf: 1000, merchantAccount: "237699095589", payerPhone: "237658174722",
  };
  const orangeOrder = {
    ...base, provider: "SMS_ORANGE", amount: 1000, payerPhone: "237658174722",
    smsMerchantAccount: "237699095589",
  };
  const result = matchPaymentSmsToOrder({
    parsed: orangeParsed, merchantAccount: "237699095589", candidates: [orangeOrder], now,
  });
  assert.equal(result.outcome, "MATCHED");
  if (result.outcome === "MATCHED") assert.equal(result.reason, "UNIQUE_ORDER");
});

test("rejects receipt times that predate the Jobly payment order", () => {
  const result = run({}, { occurredAt: "2026-11-06T10:00:00.000Z" });
  assert.equal(result.outcome, "UNMATCHED");
  assert.equal(result.reason, "NO_UNIQUE_PAYMENT_ORDER");
});

test("does not match if the beneficiary inside the SMS differs from the paired SIM", () => {
  const result = run({}, { merchantAccount: "237688888888" });
  assert.equal(result.outcome, "UNMATCHED");
  assert.equal(result.reason, "SMS_MERCHANT_MISMATCH");
});
