import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("only the internal merchant APK declares the restricted SMS receiver", () => {
  const playManifest = read("../apps/android/app/src/main/AndroidManifest.xml");
  const internalManifest = read("../apps/android/app/src/internal/AndroidManifest.xml");
  const receiver = read("../apps/android/app/src/main/java/com/jobly/android/PaymentSmsReceiver.kt");
  assert.doesNotMatch(playManifest, /android\.permission\.RECEIVE_SMS/);
  assert.doesNotMatch(playManifest, /\.PaymentSmsReceiver/);
  assert.match(internalManifest, /android\.permission\.RECEIVE_SMS/);
  assert.match(internalManifest, /\.PaymentSmsReceiver/);
  assert.ok(internalManifest.includes('android:permission="android.permission.BROADCAST_SMS"'));
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
  assert.match(worker, /READ_TIMEOUT_MS = (?:[5-9][0-9]{4}|[1-9][0-9]{5})/);
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
  assert.match(activity, /if \(!BuildConfig\.PAYMENT_SMS_AUTORECEIVE_ENABLED\)/);
  assert.match(bridge, /isJoblyAndroidPaymentSmsAutoReceiveAvailable/);
  assert.match(page, /autoSmsReceiveAvailable/);
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
  const internalManifest = read("../apps/android/app/src/internal/AndroidManifest.xml");
  assert.match(receiver, /^package com\.jobly\.android/m);
  assert.match(manifest, /android:name="\.MainActivity"/);
  assert.match(internalManifest, /android:name="\.PaymentSmsReceiver"/);
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


test("Android receives only one explicitly shared SMS without inbox-read permission", () => {
  const manifest = read("../apps/android/app/src/main/AndroidManifest.xml");
  const activity = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  assert.doesNotMatch(manifest, /android\.permission\.RECEIVE_SMS/);
  assert.doesNotMatch(manifest, /\.PaymentSmsReceiver/);
  assert.match(manifest, /android\.intent\.action\.SEND/);
  assert.match(manifest, /android\.intent\.category\.DEFAULT/);
  assert.match(manifest, /android:mimeType="text\/plain"/);
  assert.doesNotMatch(manifest, /android\.permission\.READ_SMS/);
  assert.match(activity, /Intent\.ACTION_SEND/);
  assert.match(activity, /Intent\.EXTRA_TEXT/);
  assert.match(activity, /MAX_SHARED_PAYMENT_SMS_LENGTH/);
  assert.match(activity, /pendingSharedPaymentSms/);
  assert.match(activity, /isTrustedJoblyOrigin\(uri\)/);
  assert.match(activity, /jobly:payment-sms-shared/);
  assert.match(activity, /pendingSharedPaymentSms = null/);
  assert.doesNotMatch(activity, /READ_SMS/);
});

test("Google Play and internal Android variants keep SMS permission scopes separate", () => {
  const gradle = read("../apps/android/app/build.gradle.kts");
  const playManifest = read("../apps/android/app/src/main/AndroidManifest.xml");
  const internalManifest = read("../apps/android/app/src/internal/AndroidManifest.xml");
  const readme = read("../apps/android/README.md");
  assert.match(gradle, /create\("play"\)[\s\S]*?PAYMENT_SMS_AUTORECEIVE_ENABLED", "false"/);
  assert.match(gradle, /create\("internal"\)[\s\S]*?applicationIdSuffix = "\.internal"/);
  assert.match(gradle, /PAYMENT_SMS_AUTORECEIVE_ENABLED", "true"/);
  assert.doesNotMatch(playManifest, /RECEIVE_SMS|PaymentSmsReceiver/);
  assert.match(internalManifest, /RECEIVE_SMS/);
  assert.match(internalManifest, /PaymentSmsReceiver/);
  assert.match(readme, /bundlePlayRelease/);
  assert.match(readme, /Partager.*Jobly/);
});

test("customer SMS analysis is corroborative and cannot finalize an entitlement by itself", () => {
  const route = read("../app/api/payments/sms/customer-share/route.ts");
  const ai = read("../lib/paymentSms/ai-review.ts");
  const page = read("../app/abonnement/page.tsx");
  assert.match(route, /analyzeCustomerPaymentSmsWithAi/);
  assert.match(route, /direction !== "OUTBOUND"/);
  assert.match(route, /status !== "SUCCESSFUL"/);
  assert.match(route, /SMS_SENDER_NOT_ALLOWLISTED/);
  assert.match(route, /rawMessageStored: false/);
  assert.match(route, /entitlementChanged: false/);
  assert.doesNotMatch(route, /finalize_payment/);
  assert.match(ai, /CLASSIFY_CUSTOMER_SHARED_PAYMENT_SMS/);
  assert.match(ai, /ne peut jamais activer un abonnement/);
  assert.match(page, /Analyser ce SMS avec J’IA/);
  assert.match(page, /aucun abonnement n'a été activé par le SMS client seul/i);
});
