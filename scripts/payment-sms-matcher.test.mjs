import assert from "node:assert/strict";
import test from "node:test";
import { decideSmsPaymentMatch } from "../lib/paymentSms/matcher.ts";

const receipt = {
  provider: "SMS_MTN",
  senderTrusted: true,
  status: "SUCCESSFUL",
  transactionId: "MTNABC123456",
  amountXaf: 10000,
  currency: "XAF",
  payerPhone: "237677123456",
  merchantAccount: "237699123456",
  occurredAt: "2026-11-06T10:15:00.000Z",
  receivedAt: "2026-11-06T10:15:03.000Z",
};

const candidate = {
  paymentId: "pay-1",
  provider: "SMS_MTN",
  paymentStatus: "PENDING",
  subscriptionStatus: "PENDING",
  amountXaf: 10000,
  currency: "XAF",
  payerPhone: "+237 677 123 456",
  merchantAccount: "237699123456",
  createdAt: "2026-11-06T10:10:00.000Z",
};

test("matches only one exact successful pending order", () => {
  assert.deepEqual(decideSmsPaymentMatch(receipt, [candidate]), {
    decision: "MATCH",
    paymentId: "pay-1",
  });
});

test("rejects an untrusted sender even if other fields match", () => {
  assert.deepEqual(decideSmsPaymentMatch({ ...receipt, senderTrusted: false }, [candidate]), {
    decision: "REJECT",
    reason: "UNTRUSTED_SENDER",
  });
});

test("rejects pending and failed SMS messages", () => {
  assert.equal(decideSmsPaymentMatch({ ...receipt, status: "PENDING" }, [candidate]).decision, "REJECT");
  assert.equal(decideSmsPaymentMatch({ ...receipt, status: "FAILED" }, [candidate]).decision, "REJECT");
});

test("rejects incomplete or invalid transaction evidence", () => {
  assert.equal(decideSmsPaymentMatch({ ...receipt, transactionId: null }, [candidate]).decision, "REJECT");
  assert.equal(decideSmsPaymentMatch({ ...receipt, amountXaf: null }, [candidate]).decision, "REJECT");
  assert.equal(decideSmsPaymentMatch({ ...receipt, payerPhone: null }, [candidate]).decision, "REJECT");
  assert.equal(decideSmsPaymentMatch({ ...receipt, merchantAccount: null }, [candidate]).decision, "REJECT");
});

test("does not match a different operator, payer, merchant or amount", () => {
  assert.equal(decideSmsPaymentMatch(receipt, [{ ...candidate, provider: "SMS_ORANGE" }]).decision, "NO_MATCH");
  assert.equal(decideSmsPaymentMatch(receipt, [{ ...candidate, payerPhone: "237699000000" }]).decision, "NO_MATCH");
  assert.equal(decideSmsPaymentMatch(receipt, [{ ...candidate, merchantAccount: "237600000000" }]).decision, "NO_MATCH");
  assert.equal(decideSmsPaymentMatch(receipt, [{ ...candidate, amountXaf: 2500 }]).decision, "NO_MATCH");
});

test("does not match duplicated payment candidates", () => {
  assert.deepEqual(decideSmsPaymentMatch(receipt, [candidate, { ...candidate, paymentId: "pay-2" }]), {
    decision: "AMBIGUOUS",
    reason: "MULTIPLE_PAYMENT_ORDERS_MATCH",
  });
});

test("honors a transaction reference explicitly declared by the customer", () => {
  assert.equal(
    decideSmsPaymentMatch(receipt, [{ ...candidate, declaredTransactionId: "OTHER12345" }]).decision,
    "NO_MATCH",
  );
});

test("does not match an order older than six hours", () => {
  assert.equal(
    decideSmsPaymentMatch(receipt, [{ ...candidate, createdAt: "2026-11-06T00:00:00.000Z" }]).decision,
    "NO_MATCH",
  );
});

test("allows five minutes of device clock skew but not more", () => {
  const slightSkew = { ...candidate, createdAt: "2026-11-06T10:18:00.000Z" };
  const excessSkew = { ...candidate, createdAt: "2026-11-06T10:30:00.000Z" };
  assert.equal(decideSmsPaymentMatch(receipt, [slightSkew]).decision, "MATCH");
  assert.equal(decideSmsPaymentMatch(receipt, [excessSkew]).decision, "NO_MATCH");
});

test("rejects a non-XAF currency even when the numeric amount matches", () => {
  assert.deepEqual(decideSmsPaymentMatch({ ...receipt, currency: "USD" }, [candidate]), {
    decision: "REJECT",
    reason: "RECEIPT_FIELDS_INCOMPLETE",
  });
});

test("does not match an order whose payment or subscription is already settled", () => {
  assert.equal(
    decideSmsPaymentMatch(receipt, [{ ...candidate, paymentStatus: "SUCCESSFUL" }]).decision,
    "NO_MATCH",
  );
  assert.equal(
    decideSmsPaymentMatch(receipt, [{ ...candidate, subscriptionStatus: "ACTIVE" }]).decision,
    "NO_MATCH",
  );
});

test("rejects an invalid receipt timestamp", () => {
  assert.deepEqual(decideSmsPaymentMatch({ ...receipt, occurredAt: "not-a-date" }, [candidate]), {
    decision: "REJECT",
    reason: "RECEIPT_TIME_INVALID",
  });
});
