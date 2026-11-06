import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Jobly APK receives SMS only with the declared restricted permission", () => {
  const manifest = read("../apps/android/app/src/main/AndroidManifest.xml");
  const receiver = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsReceiver.kt");
  assert.match(manifest, /android\.permission\.RECEIVE_SMS/);
  assert.match(manifest, /\.PaymentSmsReceiver/);
  assert.match(receiver, /SMS_RECEIVED_ACTION/);
  assert.match(receiver, /isAllowedSender\(context, senderId\)/);
  assert.ok(receiver.indexOf("isAllowedSender(context, senderId)") < receiver.indexOf("enqueueUniqueWork"));
});

test("the merchant token and sender allowlist are encrypted with Android Keystore", () => {
  const credentials = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsDeviceCredentials.kt");
  assert.match(credentials, /AndroidKeyStore/);
  assert.match(credentials, /AES\/GCM\/NoPadding/);
  assert.match(credentials, /TOKEN_CIPHERTEXT/);
  assert.match(credentials, /SENDER_IDS_CIPHERTEXT/);
  assert.match(credentials, /setRandomizedEncryptionRequired\(true\)/);
  assert.doesNotMatch(credentials, /putString\(TOKEN_CIPHERTEXT, token\)/);
  assert.doesNotMatch(credentials, /putString\(SENDER_IDS_CIPHERTEXT, JSONArray\(allowlist\)\.toString\(\)\)/);
});

test("WorkManager queues ciphertext and posts only to the Jobly SMS endpoint", () => {
  const receiver = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsReceiver.kt");
  const worker = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsUploadWorker.kt");
  const gradle = read("../apps/android/app/build.gradle.kts");
  assert.match(gradle, /androidx\.work:work-runtime/);
  assert.match(receiver, /PaymentSmsDeviceCredentials\.encrypt\(context, smsBody\)/);
  assert.match(receiver, /KEY_ENCRYPTED_SMS_BODY to encryptedBody/);
  assert.match(worker, /\/api\/payments\/sms\/ingest/);
  assert.match(worker, /x-jobly-sms-device/);
  assert.match(worker, /Authorization/);
  assert.match(worker, /Result\.retry\(\)/);
  assert.doesNotMatch(worker, /Log\./);
});

test("pairing and SMS permission requests use the existing origin-restricted Jobly bridge", () => {
  const activity = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  const bridge = read("../lib/paymentSms/android-bridge.ts");
  const page = read("../app/admin/payments/sms/page.tsx");
  const admin = read("../app/admin/page.tsx");
  assert.match(activity, /isTrustedJoblyOrigin\(sourceOrigin\)/);
  assert.match(activity, /PAIR_PAYMENT_SMS_DEVICE/);
  assert.match(activity, /REQUEST_PAYMENT_SMS_PERMISSION/);
  assert.match(activity, /requestPermissions\(arrayOf\(Manifest\.permission\.RECEIVE_SMS\)/);
  assert.match(bridge, /PAIR_PAYMENT_SMS_DEVICE/);
  assert.match(page, /pairJoblyPaymentSmsDevice/);
  assert.match(page, /isJoblyAndroidPaymentSmsAvailable/);
  assert.match(page, /senderIds/);
  assert.match(admin, /\/admin\/payments\/sms/);
});

test("the native receiver remains inside the existing Jobly Android package", () => {
  const receiver = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsReceiver.kt");
  const manifest = read("../apps/android/app/src/main/AndroidManifest.xml");
  assert.match(receiver, /^package com\.jobly\.android/m);
  assert.match(manifest, /android:name="\.MainActivity"/);
  assert.doesNotMatch(manifest, /<application[^>]*android:process=/);
});
