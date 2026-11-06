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
    body: "Payment de 699123456 MERCHANT BUSINESS par 677123456 CUSTOMER reussi. Transaction ID: MTNABC123456. Montant: 10 000 FCFA. Date: 2026-11-06 10:15:00",
  }, config);

  assert.equal(result.provider, "SMS_MTN");
  assert.equal(result.senderTrusted, true);
  assert.equal(result.status, "SUCCESSFUL");
  assert.equal(result.transactionId, "MTNABC123456");
  assert.equal(result.amountXaf, 10000);
  assert.equal(result.currency, "XAF");
  assert.equal(result.direction, "INBOUND");
  assert.equal(result.payerPhone, "237677123456");
  assert.equal(result.merchantAccount, "237699123456");
  assert.equal(result.merchantAccountFromMessage, true);
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
    body: "Vous avez recu 10 000 FCFA sur votre compte Mobile Money. Financial Transaction Id: 18163059064.",
  }, {
    senderIds: { SMS_MTN: ["JOBLY-MTN-TEST"] },
    merchantAccount: "237699123456",
  });
  assert.equal(result.senderTrusted, true);
  assert.equal(result.status, "SUCCESSFUL");
  assert.equal(result.payerPhone, null);
  assert.equal(result.merchantAccount, "237699123456");
  assert.equal(result.merchantAccountFromMessage, false);
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

const liveShapeConfig = {
  senderIds: { SMS_MTN: ["MTN-SENDER-TEST"], SMS_ORANGE: ["ORANGE-SENDER-TEST"] },
  merchantAccount: "699095589",
};

test("parses Orange merchant SMS in both short and detailed wording", () => {
  const short = parsePaymentSms({
    senderId: "ORANGE-SENDER-TEST",
    body: "Paiement de MERCHANT BUSINESS reussi par 658174722 CUSTOMER. ID transaction:MP240417.1311.B48838, Montant:1000 FCFA. Solde: 1190.5 FCFA.",
  }, liveShapeConfig);
  assert.equal(short.provider, "SMS_ORANGE");
  assert.equal(short.status, "SUCCESSFUL");
  assert.equal(short.direction, "INBOUND");
  assert.equal(short.transactionId, "MP240417.1311.B48838");
  assert.equal(short.amountXaf, 1000);
  assert.equal(short.payerPhone, "237658174722");
  assert.equal(short.merchantAccount, "237699095589");
  assert.deepEqual(short.fraudFlags, []);

  const detailed = parsePaymentSms({
    senderId: "ORANGE-SENDER-TEST",
    body: "Payment de 699095589 MERCHANT BUSINESS par 658174722 CUSTOMER reussi. Informations detaillees: ID Transaction: MP240417.1311.B48838, Montant transaction: 1000 FCFA, Frais: 0 FCFA, Commission: 11.9 FCFA, Nouveau Solde: 988.1 FCFA.",
  }, liveShapeConfig);
  assert.equal(detailed.direction, "INBOUND");
  assert.equal(detailed.transactionId, short.transactionId);
  assert.equal(detailed.amountXaf, 1000);
  assert.equal(detailed.merchantAccount, "237699095589");
  assert.equal(detailed.payerPhone, "237658174722");
});

test("parses MTN incoming wallet credits with numeric financial transaction IDs", () => {
  const result = parsePaymentSms({
    senderId: "MTN-SENDER-TEST",
    body: "Vous avez recu 50 XAF de CUSTOMER NAME (237681972237) sur votre compte mobile money a 2026-07-31 20:34:26. Message de l'expediteur : MoMopay payment. Votre nouveau solde : 100 XAF. Le montant du coupon etait . Les frais etaient de 0 XAF. L'identifiant de la transaction financiere : 18163059064. Identifiant de la transaction externe : -.",
  }, liveShapeConfig);
  assert.equal(result.provider, "SMS_MTN");
  assert.equal(result.status, "SUCCESSFUL");
  assert.equal(result.direction, "INBOUND");
  assert.equal(result.transactionId, "18163059064");
  assert.equal(result.amountXaf, 50);
  assert.equal(result.payerPhone, "237681972237");
  assert.equal(result.merchantAccount, "237699095589");
  assert.deepEqual(result.fraudFlags, []);
});

test("rejects outgoing MTN payments even when they are described as finalized", () => {
  const finalized = parsePaymentSms({
    senderId: "MTN-SENDER-TEST",
    body: "Votre paiement de 715 XAF a un bénéficiaire (237653928155) a ete finalise a 2026-07-31 21:55:42. Identifiant de transaction financiere : 18164419116.",
  }, liveShapeConfig);
  assert.equal(finalized.direction, "OUTBOUND");
  assert.ok(finalized.fraudFlags.includes("OUTGOING_PAYMENT_NOT_MERCHANT_RECEIPT"));

  const successIntegral = parsePaymentSms({
    senderId: "MTN-SENDER-TEST",
    body: "Paiement Successintegral de 715 a BENEFICIARY 237653928155. Merci d'utiliser MTN MoMo.",
  }, liveShapeConfig);
  assert.equal(successIntegral.direction, "OUTBOUND");
});

test("keeps Orange failed transaction IDs non-authoritative", () => {
  const result = parsePaymentSms({
    senderId: "ORANGE-SENDER-TEST",
    body: "Transaction Failed. Motif: Le solde du compte du payeur est insuffisant. Transaction ID: PP240418.0010.C02176",
  }, liveShapeConfig);
  assert.equal(result.status, "FAILED");
  assert.equal(result.transactionId, "PP240418.0010.C02176");
  assert.notEqual(result.direction, "INBOUND");
  assert.ok(result.fraudFlags.includes("MESSAGE_NOT_CONFIRMED_SUCCESS"));
});

test("rejects a detailed merchant SMS naming another beneficiary account", () => {
  const result = parsePaymentSms({
    senderId: "ORANGE-SENDER-TEST",
    body: "Payment de 699095589 MERCHANT BUSINESS par 658174722 CUSTOMER reussi. ID Transaction: MP240417.1311.B48838. Montant transaction: 1000 FCFA.",
  }, {
    senderIds: { SMS_ORANGE: ["ORANGE-SENDER-TEST"] },
    merchantAccount: "237699999999",
  });
  assert.equal(result.direction, "INBOUND");
  assert.equal(result.merchantAccount, "237699095589");
  assert.ok(result.fraudFlags.includes("SMS_MERCHANT_ACCOUNT_MISMATCH"));
});


test("converts local operator date and time using the paired merchant timezone", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-MTN-TEST",
    body: "Vous avez recu 10 000 FCFA de 677123456 sur votre compte. Transaction ID: MTNABC123456. Date: 06/11/2026 10:15:00",
  }, {
    senderIds: { SMS_MTN: ["JOBLY-MTN-TEST"] },
    merchantAccount: "237699123456",
    timeZone: "Africa/Douala",
  });
  assert.equal(result.occurredAt, "2026-11-06T09:15:00.000Z");
});

test("does not guess a local timestamp when the merchant timezone is absent", () => {
  const result = parsePaymentSms({
    senderId: "JOBLY-MTN-TEST",
    body: "Paiement réussi. Transaction ID: MTNABC123456. Montant: 10 000 FCFA. Date: 06/11/2026 10:15",
  }, { senderIds: { SMS_MTN: ["JOBLY-MTN-TEST"] }, merchantAccount: "237699123456" });
  assert.equal(result.occurredAt, null);
});


test("distinguishes an explicit customer-side merchant number from a configured fallback", () => {
  const explicit = parsePaymentSms({
    senderId: "MTN-SENDER-TEST",
    body: "Votre paiement de 10 000 FCFA vers 237699095589 est réussi. Transaction ID: 18163059064.",
  }, liveShapeConfig);
  assert.equal(explicit.direction, "OUTBOUND");
  assert.equal(explicit.status, "SUCCESSFUL");
  assert.equal(explicit.merchantAccount, "237699095589");
  assert.equal(explicit.merchantAccountFromMessage, true);
  assert.ok(explicit.fraudFlags.includes("OUTGOING_PAYMENT_NOT_MERCHANT_RECEIPT"));

  const noRecipient = parsePaymentSms({
    senderId: "MTN-SENDER-TEST",
    body: "Votre paiement de 10 000 FCFA est réussi. Transaction ID: 18163059064.",
  }, liveShapeConfig);
  assert.equal(noRecipient.direction, "OUTBOUND");
  assert.equal(noRecipient.merchantAccount, "237699095589");
  assert.equal(noRecipient.merchantAccountFromMessage, false);
});
