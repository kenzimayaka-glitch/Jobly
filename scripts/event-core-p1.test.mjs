import test from "node:test";
import assert from "node:assert/strict";
import { getEventPricing, validateEventMedia } from "../lib/events.ts";
import { EVENT_MANUAL_PAYMENT_METHODS, isEventManualPaymentMethod } from "../lib/eventManualPayments.ts";
import { inspectEventMedia, readMp4DurationSeconds } from "../lib/eventMedia.ts";

test("Event Core pricing matches all published duration tiers", () => {
  assert.deepEqual(getEventPricing(1), { durationDays: 1, pricePerDay: 2000, total: 2000 });
  assert.equal(getEventPricing(9).total, 18000);
  assert.equal(getEventPricing(10).pricePerDay, 1500);
  assert.equal(getEventPricing(29).total, 43500);
  assert.equal(getEventPricing(30).pricePerDay, 1000);
  assert.equal(getEventPricing(59).total, 59000);
  assert.equal(getEventPricing(60).pricePerDay, 800);
  assert.equal(getEventPricing(90).total, 72000);
  assert.equal(getEventPricing(180).durationDays, 90);
  assert.equal(getEventPricing(Number.NaN).durationDays, 1);
});

test("Event media metadata rejects invalid sizes and video durations", () => {
  assert.equal(validateEventMedia({ mediaType: "IMAGE", mediaSizeBytes: 1 }).ok, true);
  assert.equal(validateEventMedia({ mediaType: "IMAGE", mediaSizeBytes: 10 * 1024 * 1024 + 1 }).ok, false);
  assert.equal(validateEventMedia({ mediaType: "VIDEO", mediaSizeBytes: 100, mediaDurationSeconds: 30 }).ok, true);
  assert.equal(validateEventMedia({ mediaType: "VIDEO", mediaSizeBytes: 100, mediaDurationSeconds: 31 }).ok, false);
  assert.equal(validateEventMedia({ mediaType: "VIDEO", mediaSizeBytes: 100, mediaDurationSeconds: Number.NaN }).ok, false);
  assert.equal(validateEventMedia({ mediaType: "UNKNOWN", mediaSizeBytes: 100 }).ok, false);
});

test("Event upload rejects spoofed MIME signatures and mismatched types", () => {
  const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  assert.equal(inspectEventMedia(png, "image/png").ok, true);
  assert.equal(inspectEventMedia(png, "image/jpeg").ok, false);
  assert.equal(inspectEventMedia(new Uint8Array([1,2,3]), "image/png").ok, false);
});

test("Event payment accepts only manual bank and mobile-money channels", () => {
  assert.deepEqual(EVENT_MANUAL_PAYMENT_METHODS, ["MTN_MOMO","ORANGE_MONEY","BANK_TRANSFER","OTHER"]);
  assert.equal(isEventManualPaymentMethod("MTN_MOMO"), true);
  assert.equal(isEventManualPaymentMethod("ORANGE_MONEY"), true);
  assert.equal(isEventManualPaymentMethod("BANK_TRANSFER"), true);
  assert.equal(isEventManualPaymentMethod("ICLAN"), false);
  assert.equal(isEventManualPaymentMethod("MOCK"), false);
  assert.equal(isEventManualPaymentMethod(null), false);
});
