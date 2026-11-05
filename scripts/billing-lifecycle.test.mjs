import test from "node:test";
import assert from "node:assert/strict";
import {
  isEligibleSubscription,
  isProductionRuntime,
  isDefinitiveProviderFailure,
  assertPaymentProviderReady,
} from "../lib/billingLifecycleCore.ts";

const now = Date.parse("2026-11-05T12:00:00.000Z");

test("ACTIVE rights require a known plan and a future period end", () => {
  assert.equal(isEligibleSubscription({
    planCode: "PREMIUM",
    status: "ACTIVE",
    currentPeriodEnd: "2026-11-06T12:00:00.000Z",
  }, now), true);
  assert.equal(isEligibleSubscription({
    planCode: "PREMIUM",
    status: "ACTIVE",
    currentPeriodEnd: "2026-11-05T11:59:59.000Z",
  }, now), false);
  assert.equal(isEligibleSubscription({
    planCode: "PREMIUM",
    status: "ACTIVE",
    currentPeriodEnd: null,
  }, now), false);
  assert.equal(isEligibleSubscription({
    planCode: "UNKNOWN",
    status: "ACTIVE",
    currentPeriodEnd: "2026-11-06T12:00:00.000Z",
  }, now), false);
});

test("TRIAL rights require a future trial end and pending/canceled rights are denied", () => {
  assert.equal(isEligibleSubscription({
    planCode: "START",
    status: "TRIAL",
    trialEndsAt: "2026-11-06T12:00:00.000Z",
  }, now), true);
  assert.equal(isEligibleSubscription({
    planCode: "START",
    status: "TRIAL",
    trialEndsAt: "2026-11-04T12:00:00.000Z",
  }, now), false);
  assert.equal(isEligibleSubscription({
    planCode: "PRO",
    status: "PENDING",
    currentPeriodEnd: "2026-12-05T12:00:00.000Z",
  }, now), false);
  assert.equal(isEligibleSubscription({
    planCode: "PRO",
    status: "CANCELED",
    currentPeriodEnd: "2026-12-05T12:00:00.000Z",
  }, now), false);
});

test("production runtime detection respects Vercel preview vs production", () => {
  const oldNode = process.env.NODE_ENV;
  const oldVercel = process.env.VERCEL_ENV;
  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    assert.equal(isProductionRuntime(), false);
    process.env.VERCEL_ENV = "production";
    assert.equal(isProductionRuntime(), true);
  } finally {
    if (oldNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNode;
    if (oldVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = oldVercel;
  }
});

test("production blocks MOCK and missing iClan production endpoints", () => {
  const keys = [
    "NODE_ENV", "VERCEL_ENV", "ICLAN_USERNAME", "ICLAN_PASSWORD",
    "ICLAN_API_URL", "ICLAN_TOKEN_PATH", "ICLAN_MAKE_PAYMENT_PATH", "ICLAN_VERIFY_PAYMENT_PATH",
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.ICLAN_USERNAME = "uat-user";
    process.env.ICLAN_PASSWORD = "not-a-real-secret";
    delete process.env.ICLAN_API_URL;
    delete process.env.ICLAN_TOKEN_PATH;
    delete process.env.ICLAN_MAKE_PAYMENT_PATH;
    delete process.env.ICLAN_VERIFY_PAYMENT_PATH;

    assert.throws(() => assertPaymentProviderReady("MOCK"), /MOCK_PROVIDER_DISABLED_IN_PRODUCTION/);
    assert.throws(() => assertPaymentProviderReady("ICLAN"), /ICLAN_API_URL_NOT_CONFIGURED/);

    process.env.ICLAN_API_URL = "https://test.api.eduklan.com";
    process.env.ICLAN_TOKEN_PATH = "/api/client/token";
    process.env.ICLAN_MAKE_PAYMENT_PATH = "/api/test/make_payment";
    process.env.ICLAN_VERIFY_PAYMENT_PATH = "/api/test/verify_payment";
    assert.throws(() => assertPaymentProviderReady("ICLAN"), /ICLAN_SANDBOX_ENDPOINT_BLOCKED_IN_PRODUCTION/);

    process.env.ICLAN_API_URL = "https://billing.example.invalid";
    process.env.ICLAN_TOKEN_PATH = "/oauth/token";
    process.env.ICLAN_MAKE_PAYMENT_PATH = "/payments";
    process.env.ICLAN_VERIFY_PAYMENT_PATH = "/payments/status";
    assert.doesNotThrow(() => assertPaymentProviderReady("ICLAN"));
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test("preview can use the known sandbox defaults, but credentials remain required", () => {
  const keys = ["NODE_ENV", "VERCEL_ENV", "ICLAN_USERNAME", "ICLAN_PASSWORD"];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.ICLAN_USERNAME = "uat-user";
    process.env.ICLAN_PASSWORD = "not-a-real-secret";
    assert.doesNotThrow(() => assertPaymentProviderReady("ICLAN"));
    assert.doesNotThrow(() => assertPaymentProviderReady("MOCK"));
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test("provider failures are classified conservatively", () => {
  assert.equal(isDefinitiveProviderFailure("ICLAN_API_ERROR_400"), true);
  assert.equal(isDefinitiveProviderFailure("ICLAN_TOKEN_ERROR_401"), true);
  assert.equal(isDefinitiveProviderFailure("PHONE_REQUIRED_FOR_ICLAN"), true);
  assert.equal(isDefinitiveProviderFailure("ICLAN_API_ERROR_500"), false);
  assert.equal(isDefinitiveProviderFailure("fetch failed"), false);
});
