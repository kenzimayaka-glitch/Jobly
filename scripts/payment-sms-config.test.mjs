import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaymentSmsUssd,
  getPaymentSmsCheckoutConfig,
  normalizeMobileMoneyPhone,
} from "../lib/paymentSms/config.ts";

function config(provider, merchantCode, merchantAccount = "699123456") {
  return {
    provider,
    providerLabel: provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money",
    merchantAccount,
    merchantCode,
  };
}

test("builds the exact MTN shortcode from runtime administrator configuration", () => {
  const code = buildPaymentSmsUssd("SMS_MTN", 1000, config("SMS_MTN", "123456"));
  assert.equal(code.ussdCode, "*126*16*123456*1000#");
  assert.equal(code.paymentCode, code.ussdCode);
  assert.equal(code.merchantAccount, "237699123456");
});

test("builds the exact Orange shortcode from runtime administrator configuration", () => {
  const code = buildPaymentSmsUssd("SMS_ORANGE", 2500, config("SMS_ORANGE", "654321"));
  assert.equal(code.ussdCode, "#150*47*654321*2500#");
  assert.equal(code.paymentCode, code.ussdCode);
});

test("loads only the active provider configuration from the database", async () => {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      const query = {
        select(fields) { calls.push(["select", fields]); return query; },
        eq(field, value) { calls.push(["eq", field, value]); return query; },
        maybeSingle: async () => ({
          data: { provider: "SMS_MTN", merchantAccount: "699123456", merchantCode: "123456", isActive: true },
          error: null,
        }),
      };
      return query;
    },
  };
  const loaded = await getPaymentSmsCheckoutConfig(supabase, "SMS_MTN");
  assert.equal(loaded.merchantAccount, "237699123456");
  assert.equal(loaded.merchantCode, "123456");
  assert.deepEqual(calls.slice(0, 3), [
    ["from", "PaymentSmsProviderConfig"],
    ["select", "provider,merchantAccount,merchantCode,isActive"],
    ["eq", "provider", "SMS_MTN"],
  ]);
});

test("rejects absent, inactive, invalid merchant configuration and unsafe amounts", async () => {
  const noConfig = {
    from() {
      const query = {
        select() { return query; },
        eq() { return query; },
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return query;
    },
  };
  await assert.rejects(
    () => getPaymentSmsCheckoutConfig(noConfig, "SMS_ORANGE"),
    /JOBLY_ORANGE_NOT_CONFIGURED/,
  );
  assert.throws(
    () => buildPaymentSmsUssd("SMS_MTN", 1000, config("SMS_MTN", "bad code")),
    /JOBLY_MTN_MERCHANT_CODE_INVALID/,
  );
  assert.throws(
    () => buildPaymentSmsUssd("SMS_MTN", 0, config("SMS_MTN", "123456")),
    /PAYMENT_AMOUNT_INVALID/,
  );
  assert.throws(
    () => buildPaymentSmsUssd("SMS_MTN", 100.5, config("SMS_MTN", "123456")),
    /PAYMENT_AMOUNT_INVALID/,
  );
  assert.throws(
    () => buildPaymentSmsUssd("SMS_ORANGE", 1000, config("SMS_MTN", "123456")),
    /PAYMENT_PROVIDER_CONFIG_MISMATCH/,
  );
});

test("normalizes local Cameroonian Mobile Money numbers consistently", () => {
  assert.equal(normalizeMobileMoneyPhone("658174722"), "237658174722");
  assert.equal(normalizeMobileMoneyPhone("+237 658 174 722"), "237658174722");
});
