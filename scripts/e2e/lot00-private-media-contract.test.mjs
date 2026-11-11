import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../../" + path, import.meta.url), "utf8");

test("photo uploads are private by default and publication requires explicit consent", async () => {
  const source = await read("app/api/auth/profile-photo/route.ts");
  assert.match(source, /getAuthUser\(request\)/);
  assert.match(source, /form\.get\("visibility"\) === "PUBLIC"/);
  assert.match(source, /form\.get\("publicPhotoConsent"\) !== "true"/);
  assert.match(source, /PRIVATE_PROFILE_PHOTO_BUCKET/);
  assert.match(source, /profilePhotoVisibility: visibility/);
  assert.match(source, /profilePhotoConsentAt: visibility === "PUBLIC" \? now : null/);
});

test("own profile photos are signed while recruiter reads require recorded consent", async () => {
  const owner = await read("app/api/profile/route.ts");
  const listing = await read("app/api/recruiter/talents/route.ts");
  const detail = await read("app/api/recruiter/talents/profile/route.ts");
  const helper = await read("lib/profilePhotoStorage.ts");
  assert.match(owner, /resolveOwnProfilePhotoUrls/);
  assert.match(helper, /createSignedUrl\(path, expiresIn\)/);
  // The generic talent directory is closed; detailed profile reads are
  // offer-scoped and enforce the active top-five matching entitlement.
  assert.match(listing, /OFFER_CONTEXT_REQUIRED/);
  assert.match(listing, /talents: \[\]/);
  assert.doesNotMatch(listing, /profilePhotoUrl/);
  assert.match(detail, /getRecruiterEntitlements\(active\.planCode\)\.topFiveMatchingProfiles/);
  assert.match(detail, /isProfilePhotoPublic\(user\)/);
});

test("changing photo visibility requires explicit consent and moves the photo plus Hero", async () => {
  const source = await read("app/api/auth/profile-photo/visibility/route.ts");
  assert.match(source, /body\?\.explicitConsent !== true/);
  assert.match(source, /sourceBucket !== targetBucket/);
  assert.match(source, /sourceHero/);
  assert.match(source, /profilePhotoConsentAt: visibility === "PUBLIC" \? now : null/);
});

test("event uploads land in a private bucket and return a storage path, never a public URL", async () => {
  const source = await read("app/api/events/media/route.ts");
  assert.match(source, /getBucket\(bucket\)/);
  assert.match(source, /bucketConfig\.public/);
  assert.match(source, /storagePath:path/);
  assert.doesNotMatch(source, /getPublicUrl/);
});

test("event media is only signed by the published-event read routes", async () => {
  const list = await read("app/api/events/route.ts");
  const detail = await read("app/api/events/[id]/route.ts");
  const helper = await read("lib/eventStorage.ts");
  assert.match(list, /eq\("status","PUBLISHED"\)/);
  assert.match(list, /exposePublishedEventMedia/);
  assert.match(detail, /eq\("status","PUBLISHED"\)/);
  assert.match(detail, /exposePublishedEventMedia/);
  assert.match(helper, /createSignedUrl\(storagePath, 60 \* 60 \* 24 \* 7\)/);
});

test("event media ownership is checked and stored on the event row", async () => {
  const source = await read("app/api/events/route.ts");
  assert.match(source, /mediaStoragePath\.startsWith\(auth\.id\s*\+\s*"\/"\)/);
  assert.match(source, /storage\.from\(JOBLY_EVENTS_BUCKET\)\.download\(mediaStoragePath\)/);
  assert.match(source, /mediaType,mediaUrl,mediaStoragePath,mediaSizeBytes/);
});

test("abandoned event files are cleaned by a CRON_SECRET-protected job without exposing private media", async () => {
  const source = await read("app/api/cron/event-media-cleanup/route.ts");
  const config = await read("vercel.json");
  assert.match(source, /CRON_SECRET/);
  assert.match(source, /config\.public/);
  assert.match(source, /MAX_AGE_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(source, /bucket\.remove/);
  assert.match(config, /\/api\/cron\/event-media-cleanup/);
});

test("storage hardening includes private event and private profile-photo buckets", async () => {
  const source = await read("scripts/e2e/lot00-storage-bucket-hardening.mjs");
  assert.match(source, /id: "jobly-events"[\s\S]*?public: false/);
  assert.match(source, /id: "profile-photos-private"[\s\S]*?public: false/);
  assert.match(source, /EXPECTED_REF = "ofqqrryamslxoqkklraw"/);
  assert.match(source, /SUPABASE_E2E_SECRET_KEY/);
  assert.doesNotMatch(source, /console\.log\(key\)|console\.log\(.*secretKey/);
});

test("all recruiter and CV-share surfaces hide photos without consent", async () => {
  const applications = await read("app/api/recruiter/applications/route.ts");
  const discovery = await read("app/api/recruiter/discover/[token]/route.ts");
  const cvShare = await read("app/api/cv-share/[token]/route.ts");
  assert.match(applications, /isProfilePhotoPublic/);
  assert.match(discovery, /isProfilePhotoPublic/);
  assert.match(cvShare, /isProfilePhotoPublic/);
});

test("database schema defaults profile photos to private and requires timestamped public consent", async () => {
  const migration = await read("supabase/migrations/20261108190000_lot00_private_media_consent.sql");
  const hardening = await read("scripts/e2e/lot00-storage-bucket-hardening.mjs");
  assert.match(migration, /profilePhotoVisibility" TEXT NOT NULL DEFAULT 'PRIVATE'/);
  assert.match(migration, /profilePhotoVisibility" <> 'PUBLIC' OR "profilePhotoConsentAt" IS NOT NULL/);
  assert.match(migration, /mediaStoragePath/);
  assert.match(hardening, /cleanupLegacyPublicPhotos/);
  assert.match(hardening, /retainedWithConsent/);
});

test("Storage runner loads local env files without requiring Next runtime packages", async () => {
  const source = await read("scripts/e2e/lot00-storage-bucket-hardening.mjs");
  assert.doesNotMatch(source, /from ["']@next\/env["']/);
  assert.match(source, /function loadLocalEnvFiles\(\)/);
  assert.match(source, /readFileSync\(file, "utf8"\)/);
  assert.match(source, /source\.split\(/);
});


test("Storage runner accepts current Supabase private-key aliases without disclosing values", async () => {
  const runner = await read("scripts/e2e/lot00-storage-bucket-hardening.mjs");
  const diagnostic = await read("scripts/e2e/lot00-storage-credential-diagnostic.mjs");
  assert.match(runner, /process\.env\.SUPABASE_SECRET_KEY/);
  assert.match(runner, /process\.env\.SUPABASE_SERVICE_KEY/);
  assert.match(diagnostic, /SUPABASE_SECRET_KEY/);
  assert.match(diagnostic, /SUPABASE_SERVICE_KEY/);
  assert.match(diagnostic, /acceptedFormat: selectedKey\.startsWith\("sb_secret_"\)/);
  assert.match(diagnostic, /credentials: "not included"/);
});


test("Storage hardening applies a real signed-read and anonymous-denial smoke with guaranteed cleanup", async () => {
  const hardening = await read("scripts/e2e/lot00-storage-bucket-hardening.mjs");
  const smoke = await read("scripts/e2e/lot00-storage-access-smoke.mjs");
  assert.match(hardening, /verifyPrivateStorageAccess\(\{ admin, supabaseUrl: url, anonKey \}\)/);
  assert.match(hardening, /storageAccessSmoke: \[\]/);
  assert.match(smoke, /bucket\.createSignedUrl/);
  assert.match(smoke, /anonymousPublicRead/);
  assert.match(smoke, /finally/);
  assert.match(smoke, /bucket\.remove\(\[objectPath\]\)/);
});


test("Storage access smoke can use the known non-secret JOBLY-E2E publishable key when no local alias is set", async () => {
  const hardening = await read("scripts/e2e/lot00-storage-bucket-hardening.mjs");
  assert.match(hardening, /sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y/);
  assert.match(hardening, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});
