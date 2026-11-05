import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Android module is an isolated native application with HTTPS only", () => {
  const manifest = read("../apps/android/app/src/main/AndroidManifest.xml");
  const gradle = read("../apps/android/app/build.gradle.kts");
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android.permission.INTERNET/);
  assert.match(gradle, /androidx\.webkit:webkit:1\.18\.0/);
  assert.match(gradle, /minSdk = 24/);
});

test("native bridge is origin-restricted and rejects iframe messages", () => {
  const source = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  assert.match(source, /addWebMessageListener/);
  assert.match(source, /allowedJoblyOrigins/);
  assert.match(source, /if \(!isMainFrame \|\| !isTrustedJoblyOrigin\(sourceOrigin\)\) return/);
  assert.match(source, /safeHttpsUrl/);
  assert.equal((source.match(/WebView\(this\)/g) || []).length, 1);
});

test("form inspection is click-to-run and never reads entered values", () => {
  const source = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  assert.match(source, /private fun openJiaAssistant\(\)/);
  assert.match(source, /input, textarea, select/);
  assert.match(source, /'password', 'file', 'submit'/);
  assert.doesNotMatch(source, /element\.value|\.checked\s*[,}]/);
  assert.match(source, /FORM_METADATA_SCRIPT/);
});

test("Android assistant hands metadata to the existing J'IA flow", () => {
  const page = read("../app/jia/android-assist/page.tsx");
  const bridge = read("../lib/jia/android-bridge.ts");
  assert.match(page, /announceExternalApplicationToJia/);
  assert.match(page, /formFields: fields/);
  assert.match(bridge, /window\.joblyAndroid/);
  assert.match(bridge, /targetUrl\.protocol !== "https:"/);
});

test("Android CI builds a debug APK and runs static privacy tests", () => {
  const workflow = read("../.github/workflows/android-jia.yml");
  assert.match(workflow, /packages: "platform-tools"/);
  assert.doesNotMatch(workflow, /sdkmanager tools/);
  assert.match(workflow, /:app:assembleDebug/);
  assert.match(workflow, /android-jia-bridge\.test\.mjs/);
  assert.ok(existsSync(new URL("../apps/android/README.md", import.meta.url)));
});
