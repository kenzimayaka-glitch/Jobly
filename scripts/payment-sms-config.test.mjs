import assert from "node:assert/strict";
import test from "node:test";
import { buildPaymentSmsUssd, normalizeMobileMoneyPhone } from "../lib/paymentSms/config.ts";

const keys = [
  "JOBLY_MTN_MERCHANT_ACCOUNT", "JOBLY_MTN_MERCHANT_CODE",
  "JOBLY_ORANGE_MERCHANT_ACCOUNT", "JOBLY_ORANGE_MERCHANT_CODE",
];
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function configure(prefix, merchantCode, account = "699123456") {
  process.env[prefix + "_MERCHANT_ACCOUNT"] = account;
  process.env[prefix + "_MERCHANT_CODE"] = merchantCode;
}

test("builds the exact MTN merchant shortcode with amount", () => {
  configure("JOBLY_MTN", "123456");
  const code = buildPaymentSmsUssd("SMS_MTN", 1000);
  assert.equal(code.ussdCode, "*126*16*123456*1000#");
  assert.equal(code.paymentCode, code.ussdCode);
  assert.equal(code.merchantAccount, "237699123456");
});

test("builds the exact Orange merchant shortcode with amount", () => {
  configure("JOBLY_ORANGE", "654321");
  const code = buildPaymentSmsUssd("SMS_ORANGE", 2500);
  assert.equal(code.ussdCode, "#150*47*654321*2500#");
  assert.equal(code.paymentCode, code.ussdCode);
});

test("rejects missing/invalid merchant codes and unsafe amounts", () => {
  configure("JOBLY_MTN", "bad code");
  assert.throws(() => buildPaymentSmsUssd("SMS_MTN", 1000), /JOBLY_MTN_MERCHANT_CODE_INVALID/);
  delete process.env.JOBLY_ORANGE_MERCHANT_CODE;
  process.env.JOBLY_ORANGE_MERCHANT_ACCOUNT = "699123456";
  assert.throws(() => buildPaymentSmsUssd("SMS_ORANGE", 1000), /JOBLY_ORANGE_MERCHANT_CODE_NOT_CONFIGURED/);
  configure("JOBLY_MTN", "123456");
  assert.throws(() => buildPaymentSmsUssd("SMS_MTN", 0), /PAYMENT_AMOUNT_INVALID/);
  assert.throws(() => buildPaymentSmsUssd("SMS_MTN", 100.5), /PAYMENT_AMOUNT_INVALID/);
});

test("normalizes local Cameroonian Mobile Money numbers consistently", () => {
  assert.equal(normalizeMobileMoneyPhone("658174722"), "237658174722");
  assert.equal(normalizeMobileMoneyPhone("+237 658 174 722"), "237658174722");
});

test.after(() => {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});
