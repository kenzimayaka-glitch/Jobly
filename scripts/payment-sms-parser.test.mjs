import assert from "node:assert/strict";
import test from "node:test";
import { parsePaymentSms } from "../lib/paymentSms/parser.ts";

const config = {
  // These are synthetic test identifiers, not assertions about operator sender IDs.
  senderIds: {
    SMS_MTN: ["JOBLY-MTN-TEST"],
    SMS_ORANGE: ["JOBLY-ORANGE-TEST"],
  },
};

test("parses a fully labelled synthetic successful receipt", () => {
  const result = parsePaymentSms({
    senderId: "jobly-mtn-test",
    body: "Paiement réussi. Transaction ID: MTNABC123456. Montant: 10 000 FCFA. De: 237677123456 vers: 237699123456. Date: 2026-11-06 10:15:00",
  }, config);

  assert.equal(result.provider, "SMS_MTN");
  assert.equal(result.senderTrusted, true);
  assert.equal(result.status, "SUCCESSFUL");
  assert.equal(result.transactionId, "MTNABC123456");
  assert.equal(result.amountXaf, 10000);
  assert.equal(result.currency, "XAF");
  assert.equal(result.payerPhone, "237677123456");
  assert.equal(result.merchantAccount, "237699123456");
  assert.equal(result.occurredAt, null);
  assert.deepEqual(result.fraudFlags, []);
});

test("rejects an unknown sender even when the body claims payment succeeded", () => {
  const result = parsePaymentSms({
    senderId: "MOMO-FAKE",
    body: "Paiement réussi. Transaction ID: FAKEABC123. Montant: 10 000 FCFA. De: 237677123456 vers: 237699123456",
  }, config);

  assert.equal(result.provider, null);
  assert.equal(result.senderTrusted, false);
  assert.ok(result.fraudFlags.includes("UNTRUSTED_OR_AMBIGUOUS_SENDER"));
});

test("does not treat a pending message as a successful payment", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-ORANGE-TEST",
    body: "Transaction en cours. Référence: ORAABC123456. Montant: 2 500 FCFA.",
  }, config);

  assert.equal(result.provider, "SMS_ORANGE");
  assert.equal(result.status, "PENDING");
  assert.ok(result.fraudFlags.includes("MESSAGE_NOT_CONFIRMED_SUCCESS"));
  assert.ok(result.fraudFlags.includes("MERCHANT_ACCOUNT_MISSING_OR_INVALID"));
});

test("does not trust ambiguous sender configuration", () => {
  const result = parsePaymentSms({
    senderId: "COMMON-SENDER",
    body: "Paiement réussi. Transaction ID: ABCDEF12345. Montant: 500 FCFA.",
  }, {
    senderIds: {
      SMS_MTN: ["COMMON-SENDER"],
      SMS_ORANGE: ["COMMON-SENDER"],
    },
  });

  assert.equal(result.provider, null);
  assert.equal(result.senderTrusted, false);
  assert.ok(result.fraudFlags.includes("UNTRUSTED_OR_AMBIGUOUS_SENDER"));
});

test("keeps unknown and incomplete messages non-authoritative", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-MTN-TEST",
    body: "Bienvenue sur votre compte.",
  }, config);

  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.transactionId, null);
  assert.equal(result.amountXaf, null);
  assert.equal(result.currency, null);
  assert.ok(result.fraudFlags.length >= 4);
});

test("accepts an authentic receipt when operator omits the payer phone", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-MTN-TEST",
    body: "Paiement réussi. Transaction ID: MTNABC123456. Montant: 10 000 FCFA.",
  }, {
    senderIds: { SMS_MTN: ["JOBLY-MTN-TEST"] },
    merchantAccount: "237699123456",
  });
  assert.equal(result.senderTrusted, true);
  assert.equal(result.status, "SUCCESSFUL");
  assert.equal(result.payerPhone, null);
  assert.equal(result.merchantAccount, "237699123456");
  assert.deepEqual(result.fraudFlags, []);
});

test("rejects an explicit negative payment confirmation even when it contains a positive word", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-MTN-TEST",
    body: "Paiement non réussi. Transaction ID: MTNABC123456. Montant: 10 000 FCFA.",
  }, { senderIds: { SMS_MTN: ["JOBLY-MTN-TEST"] }, merchantAccount: "237699123456" });
  assert.equal(result.status, "FAILED");
  assert.ok(result.fraudFlags.includes("MESSAGE_NOT_CONFIRMED_SUCCESS"));
});

test("does not guess a timezone for local timestamps", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-MTN-TEST",
    body: "Paiement réussi. Transaction ID: MTNABC123456. Montant: 10 000 FCFA. Date: 06/11/2026 10:15",
  }, { senderIds: { SMS_MTN: ["JOBLY-MTN-TEST"] }, merchantAccount: "237699123456" });
  assert.equal(result.occurredAt, null);
});

test("normalizes an SMS timestamp only when the UTC offset is explicit", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-MTN-TEST",
    body: "Paiement réussi. Transaction ID: MTNABC123456. Montant: 10 000 FCFA. Date: 2026-11-06 10:15:00+01:00",
  }, { senderIds: { SMS_MTN: ["JOBLY-MTN-TEST"] }, merchantAccount: "237699123456" });
  assert.equal(result.occurredAt, "2026-11-06T09:15:00.000Z");
});
