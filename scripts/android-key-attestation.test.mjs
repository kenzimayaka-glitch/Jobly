import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateKeyPairSync, sign as signBytes } from "node:crypto";
import { verifyAndroidKeyAttestation, verifyAndroidRequestSignature } from "../lib/android-key-attestation.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

test("attestation verifier rejects incomplete or malformed certificate chains before network trust lookups", async () => {
  await assert.rejects(
    verifyAndroidKeyAttestation({ certificateChain: ["MA=="], challengeHash: "0".repeat(64) }),
    /ATTESTATION_CERTIFICATE_CHAIN_INVALID/
  );
  await assert.rejects(
    verifyAndroidKeyAttestation({ certificateChain: ["MA==", "MA=="], challengeHash: "0".repeat(64) })
  );
});

test("per-request proof verifier accepts a valid P-256 ECDSA signature and rejects invalid signatures", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const payload = "GET\\n/api/me\\n1793974624109\\n123e4567-e89b-12d3-a456-426614174000";
  const signature = signBytes("sha256", Buffer.from(payload), privateKey).toString("base64");
  assert.equal(verifyAndroidRequestSignature({
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    payload,
    signature,
  }), true);
  assert.equal(verifyAndroidRequestSignature({
    publicKeyPem: "invalid",
    payload,
    signature: "!",
  }), false);
});

test("server verifier pins Google roots, checks revocation, nonce, TEE, locked verified boot and app identity", () => {
  const verifier = read("lib/android-key-attestation.ts");
  assert.match(verifier, /https:\/\/android\.googleapis\.com\/attestation\/root/);
  assert.match(verifier, /https:\/\/android\.googleapis\.com\/attestation\/status/);
  assert.match(verifier, /ATTESTATION_CERTIFICATE_CHAIN_UNTRUSTED/);
  assert.match(verifier, /ATTESTATION_CERTIFICATE_REVOKED/);
  assert.match(verifier, /status !== "GOOD"/);
  assert.match(verifier, /legacyFactoryChain/);
  assert.match(verifier, /findAttestationExtension\(certificate\.raw\)/);
  assert.match(verifier, /ATTESTATION_CHALLENGE_MISMATCH/);
  assert.match(verifier, /ATTESTATION_NOT_HARDWARE_BACKED/);
  assert.match(verifier, /DEVICE_BOOT_STATE_UNTRUSTED/);
  assert.match(verifier, /ATTESTATION_APPLICATION_ID_MISMATCH/);
  assert.match(verifier, /ATTESTATION_KEY_AUTHORIZATION_PROFILE_INVALID/);
  assert.match(verifier, /ATTESTATION_LEAF_KEY_PROFILE_INVALID/);
  assert.match(verifier, /JOBLY_ANDROID_RELEASE_CERT_SHA256/);
  assert.match(verifier, /com\.jobly\.android/);
});

test("Android challenge endpoint is authenticated, rate-limited, short-lived and one-use", () => {
  const route = read("app/api/android/attestation/challenge/route.ts");
  assert.match(route, /getAuthUser/);
  assert.match(route, /enforceApiRateLimit/);
  assert.match(route, /randomBytes\(32\)/);
  assert.match(route, /expiresAt/);
  assert.match(route, /challengeHash/);
  assert.match(route, /purpose: "REGISTER"/);
});

test("per-request assertion challenge binds method, path, timestamp and a one-use nonce", () => {
  const route = read("app/api/android/attestation/assertion/route.ts");
  assert.match(route, /getAuthUser/);
  assert.match(route, /enforceApiRateLimit/);
  assert.match(route, /method/);
  assert.match(route, /timestamp/);
  assert.match(route, /path/);
  assert.match(route, /purpose: "REQUEST"/);
  assert.match(route, /canonical/);
  assert.match(route, /expiresInSeconds: 30/);
});

test("attestation verification consumes a one-use challenge before persisting the verified device", () => {
  const route = read("app/api/android/attestation/verify/route.ts");
  assert.match(route, /getAuthUser/);
  assert.match(route, /\.is\("usedAt", null\)/);
  assert.match(route, /\.gt\("expiresAt", now\)/);
  assert.match(route, /verifyAndroidKeyAttestation/);
  assert.match(route, /AndroidDeviceAttestation/);
  assert.match(route, /expiresAt/);
});

test("native Android creates an Android Keystore key bound to the server nonce and exports certificates only", () => {
  const native = read("apps/android/app/src/main/java/com/jobly/android/AndroidKeyAttestation.kt");
  const activity = read("apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  assert.match(native, /AndroidKeyStore/);
  assert.match(native, /setAttestationChallenge\(challenge\)/);
  assert.match(native, /getCertificateChain/);
  assert.match(native, /Base64\.encodeToString/);
  assert.match(activity, /CREATE_ANDROID_KEY_ATTESTATION/);
  assert.match(activity, /ANDROID_KEY_ATTESTATION_RESULT/);
});

test("native Android signs every request with the attested Android Keystore private key", () => {
  const native = read("apps/android/app/src/main/java/com/jobly/android/AndroidKeyAttestation.kt");
  const activity = read("apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  assert.match(native, /AndroidKeyStore/);
  assert.match(native, /getKey\(KEY_ALIAS, null\)/);
  assert.match(native, /SHA256withECDSA/);
  assert.match(activity, /SIGN_ANDROID_API_REQUEST/);
  assert.match(activity, /ANDROID_API_REQUEST_SIGNATURE/);
});

test("Android bootstrap enrolls with the authenticated session and native attestation bridge", () => {
  const component = read("components/AndroidAttestationBootstrap.tsx");
  const layout = read("app/layout.tsx");
  assert.match(component, /getSupabaseClient/);
  assert.match(component, /Authorization: "Bearer " \+ accessToken/);
  assert.match(component, /x-jobly-device-id/);
  assert.match(component, /CREATE_ANDROID_KEY_ATTESTATION/);
  assert.match(component, /SIGN_ANDROID_API_REQUEST/);
  assert.match(component, /window\.fetch = async/);
  assert.match(component, /x-jobly-attestation-signature/);
  assert.match(component, /\/api\/android\/attestation\/assertion/);
  assert.match(component, /\/api\/android\/attestation\/verify/);
  assert.match(layout, /AndroidAttestationBootstrap/);
  assert.ok(layout.indexOf("<AndroidAttestationBootstrap />") < layout.indexOf("<OfflineCoordinator />"));
});

test("native Android WebView API access fails closed without a fresh verified attestation", () => {
  const auth = read("lib/server-auth.ts");
  assert.match(auth, /isNativeAndroidWebView/);
  assert.match(auth, /isAttestationBootstrap/);
  assert.match(auth, /AndroidDeviceAttestation/);
  assert.match(auth, /x-jobly-attestation-signature/);
  assert.match(auth, /verifyAndroidRequestSignature/);
  assert.match(auth, /purpose", "REQUEST"/);
  assert.match(auth, /const canonical = \[/);
  assert.match(auth, /x-jobly-attestation-challenge/);
  assert.match(auth, /expiresAt/);
  assert.match(auth, /if \(!attestation\?\.publicKeyPem\) return null/);
});

test("attestation storage is private to service_role and RLS has no client policies", () => {
  const migration = read("supabase/migrations/20261106160000_android_hardware_key_attestation.sql");
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\."AndroidAttestationChallenge" from public, anon, authenticated/i);
  assert.match(migration, /revoke all on table public\."AndroidDeviceAttestation" from public, anon, authenticated/i);
  assert.match(migration, /grant all on table public\."AndroidAttestationChallenge" to service_role/i);
  assert.match(migration, /grant all on table public\."AndroidDeviceAttestation" to service_role/i);
  assert.match(migration, /purpose" in \('REGISTER', 'REQUEST'\)/);
});
