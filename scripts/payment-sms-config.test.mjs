import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentSmsCheckoutConfig } from "../lib/paymentSms/config.ts";

const keys = [
  "JOBLY_MTN_MERCHANT_ACCOUNT", "JOBLY_MTN_PAYMENT_CODE", "JOBLY_MTN_USSD_CODE",
  "JOBLY_ORANGE_MERCHANT_ACCOUNT", "JOBLY_ORANGE_PAYMENT_CODE", "JOBLY_ORANGE_USSD_CODE",
];
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function configure(prefix, ussd) {
  process.env[prefix + "_MERCHANT_ACCOUNT"] = "+237699123456";
  process.env[prefix + "_PAYMENT_CODE"] = "PAYMENT-CODE-TEST";
  process.env[prefix + "_USSD_CODE"] = ussd;
}

test("accepts USSD strings beginning with either * or #", () => {
  configure("JOBLY_MTN", "*126*1#");
  configure("JOBLY_ORANGE", "#150*50#");
  assert.equal(getPaymentSmsCheckoutConfig("SMS_MTN").ussdCode, "*126*1#");
  assert.equal(getPaymentSmsCheckoutConfig("SMS_ORANGE").ussdCode, "#150*50#");
});

test("rejects malformed shortcodes and missing merchant configuration", () => {
  configure("JOBLY_MTN", "126#");
  assert.throws(() => getPaymentSmsCheckoutConfig("SMS_MTN"), /USSD_CODE_INVALID/);
  delete process.env.JOBLY_ORANGE_MERCHANT_ACCOUNT;
  configure("JOBLY_ORANGE", "#150#");
  assert.equal(getPaymentSmsCheckoutConfig("SMS_ORANGE").merchantAccount, "+237699123456");
});

test.after(() => {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});
