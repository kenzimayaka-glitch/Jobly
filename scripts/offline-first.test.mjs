import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("device session guard verifies Supabase tokens before enforcing three-device cap", async () => {
  const auth = await read("lib/server-auth.ts");
  assert.match(auth, /auth\.getUser\(token\)/);
  assert.match(auth, /register_jobly_device_session/);
  assert.match(auth, /allowed\?\s*===\s*false/);
  assert.match(auth, /x-jobly-device-id/);
});

test("production session migrations restrict registry tables and functions to service_role", async () => {
  const base = await read("supabase/migrations/20261106074143_jobly_offline_first_device_sessions.sql");
  const guard = await read("supabase/migrations/20261106075217_jobly_device_session_reuse_guard.sql");
  const throttle = await read("supabase/migrations/20261106083307_jobly_device_session_activity_throttle.sql");
  assert.match(base, /enable row level security/i);
  assert.match(base, /revoke all on table public\."UserDeviceSession" from public, anon, authenticated/i);
  assert.match(base, /grant all on table public\."UserDeviceSession" to service_role/i);
  assert.match(base, /ranked\.position > 3/);
  assert.match(base, /order by "createdAt" desc/);
  assert.match(guard, /auth\.sessions/);
  assert.match(throttle, /interval '5 minutes'/);
});

test("service worker never caches API/auth data or private page HTML as the homepage", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /url\.pathname\.startsWith\("\/auth\/"\)/);
  assert.match(sw, /url\.pathname === "\/" && response\.ok/);
  assert.match(sw, /Response\.redirect\(new URL\("\/offline"/);
  assert.match(sw, /precacheOfflineWorkspace/);
  assert.doesNotMatch(sw, /cache\.put\("\/", copy\);\s*\}\s*return response;\s*\}\)\s*\.catch/);
});

test("offline snapshots are encrypted, expire, and are bound to the authenticated account", async () => {
  const store = await read("lib/offline-store.ts");
  assert.match(store, /AES-GCM/);
  assert.match(store, /generateKey\(\{ name: "AES-GCM", length: 256 \}, false/);
  assert.match(store, /MAX_OFFLINE_DAYS = 7/);
  assert.match(store, /expectedAuthUserId && snapshot\.authUserId !== expectedAuthUserId/);
  assert.match(store, /saveOfflineDocument/);
});

test("offline bootstrap requires an explicit request and returns a seven-day private snapshot", async () => {
  const route = await read("app/api/offline/bootstrap/route.ts");
  assert.match(route, /x-jobly-offline-bootstrap/);
  assert.match(route, /OFFLINE_DAYS = 7/);
  assert.match(route, /authUserId: authUser\.id/);
  assert.match(route, /Cache-Control.*no-store, private/);
  assert.match(route, /RecruiterProfile/);
  assert.match(route, /Partner/);
});

test("offline sync is account-bound, deduplicated, and limited to safe operations", async () => {
  const route = await read("app/api/offline/sync/route.ts");
  assert.match(route, /body\.userId !== user\.id/);
  assert.match(route, /OfflineSyncReceipt/);
  assert.match(route, /profile\.update/);
  assert.match(route, /application\.prepare/);
  assert.match(route, /recruiter\.job-draft/);
  assert.match(route, /status: "draft"/);
  assert.doesNotMatch(route, /status:\s*"published"/);
});

test("backup archive encrypts exports and validates integrity on restore", async () => {
  const settings = await read("app/settings/page.tsx");
  const backup = await read("app/api/account/backup/route.ts");
  assert.match(settings, /PBKDF2-SHA256/);
  assert.match(settings, /AES-256-GCM/);
  assert.match(settings, /KDF_ITERATIONS = 310_000/);
  assert.match(backup, /timingSafeEqual/);
  assert.match(backup, /applicationHistory: "preserved-without-replay"/);
});

test("CV backup export and restore are bounded and use the private talent-cvs bucket", async () => {
  const route = await read("app/api/account/backup/files/cv/route.ts");
  assert.match(route, /talent-cvs/);
  assert.match(route, /12 \* 1024 \* 1024/);
  assert.match(route, /authUser = await getAuthUser\(request\)/);
});

test("shared profile API uses the same device-session enforcement as other APIs", async () => {
  const route = await read("app/api/profile/route.ts");
  assert.match(route, /from "@\/lib\/server-auth"/);
  assert.doesNotMatch(route, /async function getAuthUser/);
});
