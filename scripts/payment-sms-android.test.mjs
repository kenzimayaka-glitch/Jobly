import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Jobly APK receives SMS only with the declared restricted permission", () => {
  const manifest = read("../apps/android/app/src/main/AndroidManifest.xml");
  const receiver = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsReceiver.kt");
  assert.match(manifest, /android\.permission\.RECEIVE_SMS/);
  assert.match(manifest, /\.PaymentSmsReceiver/);
  assert.ok(manifest.includes('android:permission="android.permission.BROADCAST_SMS"'));
  assert.match(receiver, /SMS_RECEIVED_ACTION/);
  assert.match(receiver, /findUniqueForSender\(context, senderId\)/);
  assert.ok(receiver.indexOf("findUniqueForSender(context, senderId)") < receiver.indexOf("enqueueUniqueWork"));
  assert.ok(receiver.includes("queuedFile.writeText(encryptedBody"));
  assert.ok(receiver.includes("KEY_ENCRYPTED_SMS_FILE to queuedFile.absolutePath"));
});

test("the merchant token and sender allowlist are encrypted with Android Keystore", () => {
  const credentials = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsDeviceCredentials.kt");
  assert.match(credentials, /AndroidKeyStore/);
  assert.match(credentials, /AES\/GCM\/NoPadding/);
  assert.match(credentials, /RECORDS_CIPHERTEXT/);
  assert.match(credentials, /findUniqueForSender/);
  assert.match(credentials, /return matches\.singleOrNull\(\)/);
  assert.match(credentials, /setRandomizedEncryptionRequired\(true\)/);
  assert.doesNotMatch(credentials, /putString\(RECORDS_CIPHERTEXT, array\.toString\(\)\)/);
});

test("WorkManager queues ciphertext and posts only to the Jobly SMS endpoint", () => {
  const receiver = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsReceiver.kt");
  const worker = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsUploadWorker.kt");
  const gradle = read("../apps/android/app/build.gradle.kts");
  assert.match(gradle, /androidx\.work:work-runtime/);
  assert.match(receiver, /PaymentSmsDeviceCredentials\.encrypt\(context, smsBody\)/);
  assert.ok(receiver.includes("KEY_ENCRYPTED_SMS_FILE to queuedFile.absolutePath"));
  assert.ok(worker.includes("KEY_ENCRYPTED_SMS_FILE"));
  assert.ok(worker.includes("safePath.delete()"));
  assert.match(worker, /\/api\/payments\/sms\/ingest/);
  assert.match(worker, /x-jobly-sms-device/);
  assert.match(worker, /Authorization/);
  assert.ok(worker.includes('configuredBase.protocol != "https"'));
  assert.ok(worker.includes("PaymentSmsDeviceCredentials.read(applicationContext, queuedDeviceId)"));
  assert.ok(worker.includes("credentials.senderIds.contains"));
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
  assert.match(activity, /cancelAllWorkByTag\(PaymentSmsReceiver\.deviceTag\(deviceId\)\)/);
  assert.match(activity, /requestPermissions\(arrayOf\(Manifest\.permission\.RECEIVE_SMS\)/);
  assert.match(bridge, /PAIR_PAYMENT_SMS_DEVICE/);
  assert.ok(bridge.includes("revokeJoblyPaymentSmsDeviceLocally(deviceId: string)"));
  assert.ok(bridge.includes("payload: { deviceId }"));
  assert.match(bridge, /requestJoblyPaymentSmsPermission/);
  assert.match(page, /pairJoblyPaymentSmsDevice/);
  assert.match(page, /Réessayer l’autorisation SMS/);
  assert.match(page, /devices\.map\(\(device\)/);
  assert.match(page, /revokeJoblyPaymentSmsDeviceLocally\(device\.id\)/);
  assert.match(page, /sender ID doit être unique/i);
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

test("one APK can hold distinct MTN and Orange merchant profiles safely", () => {
  const credentials = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsDeviceCredentials.kt");
  const receiver = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsReceiver.kt");
  const activity = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  const page = read("../app/admin/payments/sms/page.tsx");
  assert.match(credentials, /records\.add\(Credentials\(deviceId, token, allowlist\.toSet\(\)\)\)/);
  assert.match(credentials, /return matches\.singleOrNull\(\)/);
  assert.match(receiver, /deviceTag\(credentials\.deviceId\)/);
  assert.match(activity, /PaymentSmsDeviceCredentials\.clear\(this@MainActivity, deviceId\)/);
  assert.match(activity, /PaymentSmsReceiver\.deleteQueuedFiles\(this@MainActivity, deviceId\)/);
  assert.match(page, /devices\.map\(\(device\)/);
});

test("administrator manages central MTN and Orange settings from Web, PWA and the same APK", () => {
  const page = read("../app/admin/payments/sms/page.tsx");
  assert.match(page, /Configuration marchande centralisée/);
  assert.match(page, /api\/payments\/sms\/config/);
  assert.match(page, /Enregistrer et synchroniser/);
  assert.match(page, /loadProviderConfigs/);
  assert.match(page, /SMS_MTN/);
  assert.match(page, /SMS_ORANGE/);
  assert.match(page, /merchantCodeHint/);
  assert.match(page, /merchantCode: draft\.merchantCode\.trim\(\)/);
  assert.match(page, /Numéro du compte marchand central/);
  assert.match(page, /readOnly/);
  assert.match(page, /merchantAccountLast4|Ce téléphone écoute encore l’ancien compte marchand/);
  assert.match(page, /Le changement de numéro de réception doit être suivi de l’appairage/);
});
