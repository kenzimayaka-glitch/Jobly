import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePaymentSmsAiReview, evaluateCustomerPaymentSmsAiReview, redactPaymentSmsForAi } from "../lib/paymentSms/ai-review-core.ts";
const parsed = { parserVersion:"0.2.0", provider:"SMS_ORANGE", senderId:"ORANGE-SENDER-TEST", senderTrusted:true, status:"SUCCESSFUL", direction:"INBOUND", transactionId:"MP240417.1311.B48838", amountXaf:1000, currency:"XAF", payerPhone:"237658174722", merchantAccount:"237699095589", occurredAt:null, fraudFlags:[] };

test("redacts private values before AI analysis", () => {
  const result = redactPaymentSmsForAi("Paiement de 699095589 MERCHANT BUSINESS par 658174722 CUSTOMER reussi. ID transaction:MP240417.1311.B48838, Montant:1000 FCFA.");
  for (const value of ["MERCHANT BUSINESS","CUSTOMER","699095589","658174722","MP240417.1311.B48838","1000"]) assert.ok(!result.includes(value));
  assert.ok(result.includes("<MONTANT>"));

  const shortOrange = redactPaymentSmsForAi(
    "Paiement de ROYAL MINISTRIES INTL2 reussi par 658174722 CUSTOMER. ID transaction:MP240417.1311.B48838, Montant:1000 FCFA.",
  );
  for (const value of ["ROYAL MINISTRIES INTL2", "CUSTOMER", "658174722", "MP240417.1311.B48838", "1000"]) {
    assert.ok(!shortOrange.includes(value));
  }
});

test("accepts a consistent incoming merchant credit classification", () => {
  const review = evaluatePaymentSmsAiReview({ output:{messageKind:"MERCHANT_CREDIT",status:"SUCCESSFUL",direction:"INBOUND",confidence:0.97,suspiciousSignals:[]}, provider:"GROQ", model:"test-model", parsed });
  assert.equal(review.accepted,true);
});

test("keeps low-confidence or conflicting AI classifications out of auto-matching", () => {
  const review = evaluatePaymentSmsAiReview({ output:{messageKind:"CUSTOMER_DEBIT",status:"SUCCESSFUL",direction:"OUTBOUND",confidence:0.4,suspiciousSignals:[]}, provider:"GROQ", model:"test-model", parsed });
  assert.equal(review.accepted,false);
  assert.ok(review.flags.length > 0);
});


const customerDebit = {
  ...parsed,
  direction: "OUTBOUND",
  fraudFlags: ["OUTGOING_PAYMENT_NOT_MERCHANT_RECEIPT"],
};

test("accepts a high-confidence customer debit only as corroborating evidence", () => {
  const review = evaluateCustomerPaymentSmsAiReview({
    output: { messageKind: "CUSTOMER_DEBIT", status: "SUCCESSFUL", direction: "OUTBOUND", confidence: 0.96, suspiciousSignals: [] },
    provider: "GROQ",
    model: "test-model",
    parsed: customerDebit,
  });
  assert.equal(review.accepted, true);
  assert.equal(review.messageKind, "CUSTOMER_DEBIT");
});

test("never accepts a merchant credit classification as a customer debit", () => {
  const review = evaluateCustomerPaymentSmsAiReview({
    output: { messageKind: "MERCHANT_CREDIT", status: "SUCCESSFUL", direction: "INBOUND", confidence: 0.99, suspiciousSignals: [] },
    provider: "GROQ",
    model: "test-model",
    parsed: customerDebit,
  });
  assert.equal(review.accepted, false);
  assert.ok(review.flags.includes("AI_NOT_CUSTOMER_DEBIT"));
});

test("rejects low-confidence or suspicious customer debit classifications", () => {
  const review = evaluateCustomerPaymentSmsAiReview({
    output: { messageKind: "CUSTOMER_DEBIT", status: "SUCCESSFUL", direction: "OUTBOUND", confidence: 0.5, suspiciousSignals: ["SMS_REPLAY"] },
    provider: "GROQ",
    model: "test-model",
    parsed: customerDebit,
  });
  assert.equal(review.accepted, false);
  assert.ok(review.flags.includes("AI_LOW_CONFIDENCE"));
  assert.ok(review.flags.includes("AI_SUSPICIOUS_SIGNALS"));
});
