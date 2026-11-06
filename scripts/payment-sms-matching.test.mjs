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
const run = (overrides = {}, parsedOverrides = {}) => matchPaymentSmsToOrder({
  parsed: { ...parsed, ...parsedOverrides }, merchantAccount: "237699123456",
  candidates: [{ ...base, ...overrides }], now,
});

test("matches only the exact customer-submitted transaction ID", () => {
  assert.equal(run({ reportedTransactionId: "mtnabc123456" }).outcome, "MATCHED");
  assert.equal(run().outcome, "UNMATCHED");
});

test("never matches on amount or payer alone", () => {
  assert.equal(run({}, { payerPhone: null }).outcome, "UNMATCHED");
  assert.equal(run().outcome, "UNMATCHED");
});

test("rejects a payer mismatch even when the transaction ID matches", () => {
  assert.equal(run({ reportedTransactionId: "MTNABC123456", payerPhone: "237699000000" }).reason, "PAYER_PHONE_MISMATCH");
});

test("does not fall back when the submitted reference is different", () => {
  assert.equal(run({ reportedTransactionId: "WRONGREF123" }).reason, "CUSTOMER_TRANSACTION_REFERENCE_NOT_FOUND");
});

test("does not match a different merchant account", () => {
  assert.equal(run({ smsMerchantAccount: "237688123456", reportedTransactionId: "MTNABC123456" }).outcome, "UNMATCHED");
});

test("does not resolve a transaction reference associated with multiple orders", () => {
  const candidates = [{ ...base, reportedTransactionId: "MTNABC123456" }, { ...base, id: "payment-2", reportedTransactionId: "MTNABC123456" }];
  const result = matchPaymentSmsToOrder({ parsed, merchantAccount: "237699123456", candidates, now });
  assert.equal(result.outcome, "AMBIGUOUS");
});

test("rejects a spoofed sender and parser fraud flags", () => {
  assert.equal(run({ reportedTransactionId: "MTNABC123456" }, { senderTrusted: false, provider: null }).outcome, "UNMATCHED");
  assert.equal(run({ reportedTransactionId: "MTNABC123456" }, { fraudFlags: ["SMS_CONTAINS_URL"] }).reason, "FRAUD_FLAGS_PRESENT");
});

test("refuses outgoing SMS even when status, amount and transaction ID look valid", () => {
  const result = run(
    { reportedTransactionId: "MTNABC123456" },
    { direction: "OUTBOUND" }
  );
  assert.equal(result.outcome, "UNMATCHED");
  assert.equal(result.reason, "SMS_NOT_MERCHANT_RECEIPT");
});

test("requires positive incoming direction, not an unknown direction", () => {
  const result = run(
    { reportedTransactionId: "MTNABC123456" },
    { direction: "UNKNOWN" }
  );
  assert.equal(result.outcome, "UNMATCHED");
  assert.equal(result.reason, "SMS_NOT_MERCHANT_RECEIPT");
});

test("matches dotted Orange transaction IDs only to the exact Orange order", () => {
  const orangeParsed = {
    ...parsed,
    provider: "SMS_ORANGE",
    transactionId: "MP240417.1311.B48838",
    amountXaf: 1000,
    merchantAccount: "237699095589",
    payerPhone: "237658174722",
  };
  const orangeOrder = {
    ...base,
    provider: "SMS_ORANGE",
    amount: 1000,
    payerPhone: "237658174722",
    reportedTransactionId: "MP240417.1311.B48838",
    smsMerchantAccount: "237699095589",
  };
  const result = matchPaymentSmsToOrder({
    parsed: orangeParsed,
    merchantAccount: "237699095589",
    candidates: [orangeOrder],
    now,
  });
  assert.equal(result.outcome, "MATCHED");
});

test("does not match if the beneficiary inside the SMS differs from the paired SIM", () => {
  const result = run(
    { reportedTransactionId: "MTNABC123456" },
    { merchantAccount: "237688888888" }
  );
  assert.equal(result.outcome, "UNMATCHED");
  assert.equal(result.reason, "SMS_MERCHANT_MISMATCH");
});
