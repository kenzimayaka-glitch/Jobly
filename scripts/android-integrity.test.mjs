import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

test("release APKs require a private keystore and pinned signing certificate", () => {
  const gradle = read("apps/android/app/build.gradle.kts");

  for (const key of [
    "JOBLY_ANDROID_KEYSTORE_PATH",
    "JOBLY_ANDROID_KEYSTORE_PASSWORD",
    "JOBLY_ANDROID_KEY_ALIAS",
    "JOBLY_ANDROID_KEY_PASSWORD",
    "JOBLY_ANDROID_RELEASE_CERT_SHA256",
  ]) {
    assert.ok(gradle.includes(key), "Missing release-signing input " + key);
  }

  assert.match(gradle, /releaseBuildRequested/);
  assert.match(gradle, /matches\(Regex\("\^\[A-F0-9\]\{64\}\$"\)\)/);
  assert.match(gradle, /signingConfigs\s*\{/);
  assert.match(gradle, /signingConfig\s*=\s*signingConfigs\.getByName\("joblyRelease"\)/);
  assert.match(gradle, /isDebuggable\s*=\s*false/);
  assert.match(gradle, /isMinifyEnabled\s*=\s*true/);
  assert.match(gradle, /isShrinkResources\s*=\s*true/);
  assert.match(gradle, /JOBLY_RELEASE_CERT_SHA256/);
});

test("runtime integrity guard compares the installed APK signer with the configured SHA-256 pin", () => {
  const guard = read("apps/android/app/src/main/java/com/jobly/android/AndroidIntegrityGuard.kt");
  const activity = read("apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");

  assert.match(guard, /EXPECTED_PACKAGE_NAME\s*=\s*"com\.jobly\.android"/);
  assert.match(guard, /PackageManager\.GET_SIGNING_CERTIFICATES/);
  assert.match(guard, /PackageManager\.GET_SIGNATURES/);
  assert.match(guard, /MessageDigest\.getInstance\("SHA-256"\)/);
  assert.match(guard, /BuildConfig\.JOBLY_RELEASE_CERT_SHA256/);
  assert.match(guard, /SIGNING_CERTIFICATE_MISMATCH/);
  assert.match(guard, /RELEASE_CERTIFICATE_PIN_NOT_CONFIGURED/);
  assert.match(activity, /AndroidIntegrityGuard\.inspect\(this\)/);
  assert.match(activity, /if \(!integrity\.allowedToStart\)/);
  assert.ok(
    activity.indexOf("AndroidIntegrityGuard.inspect(this)") < activity.indexOf("webView = createWebView()"),
    "The APK must be verified before its WebView is created"
  );
});

test("the Android manifest keeps backups and cleartext traffic disabled", () => {
  const manifest = read("apps/android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android:exported="true"/);
  assert.match(manifest, /android:permission="android\.permission\.BROADCAST_SMS"/);
});

test("the WebView keeps its native bridge scoped to the Jobly HTTPS origin and top frame", () => {
  const activity = read("apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  assert.match(activity, /mixedContentMode\s*=\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW/);
  assert.match(activity, /allowFileAccess\s*=\s*false/);
  assert.match(activity, /allowContentAccess\s*=\s*false/);
  assert.match(activity, /WebView\.setWebContentsDebuggingEnabled\(BuildConfig\.DEBUG\)/);
  assert.match(activity, /if \(!isMainFrame \|\| !isTrustedJoblyOrigin\(sourceOrigin\)\) return/);
  assert.match(activity, /WebViewCompat\.addWebMessageListener/);
});

test("Android CI runs the integrity checks before assembling the APK", () => {
  const workflow = read(".github/workflows/android-jia.yml");
  assert.match(workflow, /scripts\/android-integrity\.test\.mjs/);
  assert.match(workflow, /android-debug-build:/);
  assert.match(workflow, /Assert unsigned release APKs are rejected/);
  assert.match(workflow, /android-emulator-smoke:/);
});
