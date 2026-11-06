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
  assert.match(gradle, /compilerOptions/);
  assert.doesNotMatch(gradle, /kotlinOptions/);
});

test("native bridge is origin-restricted and rejects iframe messages", () => {
  const source = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  assert.match(source, /addWebMessageListener/);
  assert.ok(source.includes('if (!request.isForMainFrame) return false'));
  assert.ok(source.includes('if (assistantMode) returnToApplicationForm() else returnToJobly()'));
  assert.match(source, /allowedJoblyOrigins/);
  assert.match(source, /if \(!isMainFrame \|\| !isTrustedJoblyOrigin\(sourceOrigin\)\) return/);
  assert.match(source, /safeHttpsUrl/);
  assert.equal((source.match(/WebView\(this\)/g) || []).length, 1);
});

test("form inspection reads labels only and excludes sensitive field classes", () => {
  const source = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  const metadataStart = source.indexOf("private val FORM_METADATA_SCRIPT");
  const metadata = source.slice(metadataStart);
  assert.ok(source.includes("private fun openJiaAssistant()"));
  assert.ok(metadata.includes("input, textarea, select"));
  assert.ok(metadata.includes("sensitiveField"));
  assert.ok(metadata.includes("one-time-code"));
  assert.ok(metadata.includes("credit[-_ ]?card"));
  assert.ok(metadata.includes("captcha|recaptcha|hcaptcha"));
  assert.ok(metadata.includes("consent|terms|agree|accept"));
  assert.ok(metadata.includes("index,"));
  assert.ok(!metadata.includes("element.value") && !metadata.includes(".checked"));
});

test("candidate-approved form answers are matched exactly and never submitted", () => {
  const source = read("../apps/android/app/src/main/java/com/jobly/android/MainActivity.kt");
  const page = read("../app/jia/android-assist/page.tsx");
  const bridge = read("../lib/jia/android-bridge.ts");
  assert.ok(source.includes("APPLY_EXTERNAL_FORM_ANSWERS"));
  assert.ok(source.includes("sanitizeFormAnswers"));
  assert.ok(source.includes("labelFor(element).slice(0, 80) !== entry.label"));
  assert.ok(source.includes("String(element.value || '').trim() !== ''"));
  assert.ok(source.includes("dispatchEvent(new Event('input'"));
  assert.ok(!source.includes("requestSubmit") && !source.includes(".submit("));
  assert.ok(source.includes("MAX_ANSWER_FIELDS = 10"));
  assert.ok(source.includes("pendingFormOrigin"));
  assert.ok(source.includes("currentOrigin != pendingFormOrigin"));
  assert.ok(page.includes("applyExternalFormAnswersInAndroid"));
  assert.ok(page.includes("Appliquer les réponses validées"));
  assert.ok(bridge.includes("APPLY_EXTERNAL_FORM_ANSWERS"));
});

test("offer feed and offer detail use the native Android application bridge", () => {
  const feed = read("../components/JoblyOfferFeed.tsx");
  const detail = read("../app/jobs/[id]/page.tsx");
  assert.ok(feed.includes("openExternalApplicationInAndroid(context)"));
  assert.ok(detail.includes("openExternalApplicationInAndroid(context)"));
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
  assert.match(workflow, /name: Upload debug APK/);
  assert.match(workflow, /jobly-android-debug-apk/);
  assert.ok(workflow.includes("components/JoblyOfferFeed.tsx"));
  assert.match(workflow, /android-jia-bridge\.test\.mjs/);
  assert.ok(existsSync(new URL("../apps/android/README.md", import.meta.url)));
});
