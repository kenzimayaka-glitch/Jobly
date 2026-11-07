import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("customer-shared SMS is authenticated, sender-allowlisted, and matched to the pending order", () => {
  const route = read("../app/api/payments/sms/customer-share/route.ts");
  assert.match(route, /getAuthUser\(request\)/);
  assert.match(route, /eq\("userId", user\.id\)/);
  assert.match(route, /eq\("status", "ACTIVE"\)/);
  assert.match(route, /senderIds\.some/);
  assert.match(route, /parsed\.transactionId/);
  assert.match(route, /parsed\.amountXaf/);
  assert.match(route, /CUSTOMER_SMS_AMOUNT_MISMATCH/);
  assert.match(route, /TRANSACTION_REFERENCE_ALREADY_USED/);
});

test("the customer SMS content is never persisted and only a hash enters the audit log", () => {
  const route = read("../app/api/payments/sms/customer-share/route.ts");
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /rawMessageHash/);
  assert.match(route, /rawMessageStored: false/);
  assert.doesNotMatch(route, /smsBody:\s*smsBody/);
  assert.doesNotMatch(route, /\.insert\(\{[^}]*smsBody/s);
});

test("customer-side review cannot be confused with merchant credit review", () => {
  const core = read("../lib/paymentSms/ai-review-core.ts");
  const ai = read("../lib/paymentSms/ai-review.ts");
  assert.match(core, /rawKind !== "CUSTOMER_DEBIT"/);
  assert.match(core, /input\.parsed\.direction === "OUTBOUND"/);
  assert.match(ai, /redactPaymentSmsForAi\(input\.body\)/);
  assert.match(ai, /allowDeterministic: false/);
});

test("an unverified customer-entered transaction reference is lookup-only and cannot pin a pending order", () => {
  const route = read("../app/api/payments/[id]/verify/route.ts");
  const smsBranch = route.slice(
    route.indexOf('if (["SMS_MTN", "SMS_ORANGE"].includes(String(payment.provider)))'),
    route.indexOf('if (!payment.externalId)'),
  );
  assert.match(smsBranch, /\.from\("PaymentSmsReceipt"\)/);
  assert.match(smsBranch, /\.eq\("transactionId", transactionId\)/);
  assert.doesNotMatch(smsBranch, /\.update\(\{\s*reportedTransactionId:\s*transactionId/);
  assert.match(smsBranch, /Never persist it before a matching trusted merchant receipt exists/);
});
