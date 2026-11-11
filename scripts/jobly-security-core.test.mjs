import test from "node:test";
import assert from "node:assert/strict";
import { enforceApiRateLimit, hashRateLimitSubject, resolveTrustedClientIp } from "../lib/server-security.ts";

const SECRET = "jobly-security-core-test-secret-32-bytes-minimum";
const request = (headers = {}) => new Request("https://jobly.example/api/jobs", { headers });

test("validates proxy IP headers and ignores invalid values", () => {
  assert.equal(resolveTrustedClientIp(new Headers({ "x-vercel-forwarded-for": "203.0.113.7" })), "203.0.113.7");
  assert.equal(resolveTrustedClientIp(new Headers({ "x-vercel-forwarded-for": "bad", "x-real-ip": "198.51.100.9" })), "198.51.100.9");
  assert.equal(resolveTrustedClientIp(new Headers({ "x-forwarded-for": "192.0.2.1, 203.0.113.11" })), "203.0.113.11");
  assert.equal(resolveTrustedClientIp(new Headers({ "x-forwarded-for": "spoofed" })), null);
});

test("HMAC rate-limit key is deterministic and does not expose raw identifiers", () => {
  const digest = hashRateLimitSubject("ip:203.0.113.7", SECRET);
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(digest, hashRateLimitSubject("ip:203.0.113.7", SECRET));
  assert.equal(digest.includes("203.0.113.7"), false);
  assert.notEqual(digest, hashRateLimitSubject("ip:203.0.113.7", SECRET + "-rotated"));
});

test("successful DB buckets include hashed account and IP keys", async () => {
  const calls = [];
  const client = { async rpc(name, args) { calls.push({ name, args }); return { data: [{ allowed: true, remaining: 9, retry_after_seconds: 10 }], error: null }; } };
  const previous = process.env.JOBLY_RATE_LIMIT_SECRET;
  process.env.JOBLY_RATE_LIMIT_SECRET = SECRET;
  try {
    const result = await enforceApiRateLimit(request({ "x-vercel-forwarded-for": "203.0.113.8" }), client, {
      scope: "job-feed", identity: "user:abc-123",
      accountWindows: [{ limit: 10, windowSeconds: 60 }],
      ipWindows: [{ limit: 50, windowSeconds: 60 }], requireIp: true,
    });
    assert.equal(result, null);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].name, "consume_jobly_rate_limit");
    assert.equal(calls[0].args.p_scope, "job-feed:account:60");
    assert.equal(calls[1].args.p_scope, "job-feed:ip:60");
    assert.equal(calls[0].args.p_key_hash.includes("abc-123"), false);
    assert.equal(calls[1].args.p_key_hash.includes("203.0.113.8"), false);
  } finally {
    if (previous === undefined) delete process.env.JOBLY_RATE_LIMIT_SECRET;
    else process.env.JOBLY_RATE_LIMIT_SECRET = previous;
  }
});

test("modern Supabase secret key is accepted by the server rate-limit guard", async () => {
  const calls = [];
  const client = { async rpc(name, args) { calls.push({ name, args }); return { data: [{ allowed: true, remaining: 8, retry_after_seconds: 10 }], error: null }; } };
  const previous = {
    jobly: process.env.JOBLY_RATE_LIMIT_SECRET,
    modern: process.env.SUPABASE_SECRET_KEY,
    legacy: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  delete process.env.JOBLY_RATE_LIMIT_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_e2e_test_key_for_rate_limiting_only_123456";
  try {
    const result = await enforceApiRateLimit(request({ "x-vercel-forwarded-for": "203.0.113.12" }), client, {
      scope: "job-feed", identity: "user:e2e-fixture",
      accountWindows: [{ limit: 12, windowSeconds: 60 }],
      ipWindows: [{ limit: 90, windowSeconds: 60 }], requireIp: true,
    });
    assert.equal(result, null);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].name, "consume_jobly_rate_limit");
    assert.match(calls[0].args.p_key_hash, /^[0-9a-f]{64}$/);
    assert.equal(calls[0].args.p_key_hash.includes("e2e-fixture"), false);
  } finally {
    if (previous.jobly === undefined) delete process.env.JOBLY_RATE_LIMIT_SECRET;
    else process.env.JOBLY_RATE_LIMIT_SECRET = previous.jobly;
    if (previous.modern === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previous.modern;
    if (previous.legacy === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.legacy;
  }
});

test("exhausted bucket responds 429 and Retry-After", async () => {
  const client = { async rpc() { return { data: [{ allowed: false, remaining: 0, retry_after_seconds: 23 }], error: null }; } };
  const previous = process.env.JOBLY_RATE_LIMIT_SECRET;
  process.env.JOBLY_RATE_LIMIT_SECRET = SECRET;
  try {
    const result = await enforceApiRateLimit(request({ "x-vercel-forwarded-for": "203.0.113.9" }), client, {
      scope: "job-detail", ipWindows: [{ limit: 5, windowSeconds: 60 }], requireIp: true,
    });
    assert.equal(result?.status, 429);
    assert.equal(result?.headers.get("retry-after"), "23");
    assert.equal((await result?.json()).code, "RATE_LIMITED");
  } finally {
    if (previous === undefined) delete process.env.JOBLY_RATE_LIMIT_SECRET;
    else process.env.JOBLY_RATE_LIMIT_SECRET = previous;
  }
});

test("missing RPC fails closed with 503", async () => {
  const client = { async rpc() { return { data: null, error: new Error("missing migration") }; } };
  const previous = process.env.JOBLY_RATE_LIMIT_SECRET;
  process.env.JOBLY_RATE_LIMIT_SECRET = SECRET;
  try {
    const result = await enforceApiRateLimit(request({ "x-vercel-forwarded-for": "203.0.113.10" }), client, {
      scope: "job-detail", ipWindows: [{ limit: 5, windowSeconds: 60 }], requireIp: true,
    });
    assert.equal(result?.status, 503);
    assert.equal((await result?.json()).code, "ANTI_ABUSE_UNAVAILABLE");
  } finally {
    if (previous === undefined) delete process.env.JOBLY_RATE_LIMIT_SECRET;
    else process.env.JOBLY_RATE_LIMIT_SECRET = previous;
  }
});

test("PWA worker bypasses private API and auth responses", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const worker = readFileSync(resolve(root, "public/sw.js"), "utf8");
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)[\s\S]*url\.pathname\.startsWith\("\/auth\/"\)/);
  assert.match(worker, /never cache them/i);
});

test("Android release keeps R8, resource shrinking, no backup and HTTPS-only traffic", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const gradle = readFileSync(resolve(root, "apps/android/app/build.gradle.kts"), "utf8");
  const manifest = readFileSync(resolve(root, "apps/android/app/src/main/AndroidManifest.xml"), "utf8");
  assert.match(gradle, /isMinifyEnabled\s*=\s*true/);
  assert.match(gradle, /isShrinkResources\s*=\s*true/);
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
});

test("job ingestion and merchant SMS entry points use shared anti-abuse limits", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const harvest = readFileSync(resolve(root, "app/api/jobs/harvest/route.ts"), "utf8");
  const ingest = readFileSync(resolve(root, "app/api/jobs/ingest/sources/route.ts"), "utf8");
  const sms = readFileSync(resolve(root, "app/api/payments/sms/ingest/route.ts"), "utf8");
  assert.match(harvest, /scope: "job-harvest"/);
  assert.match(harvest, /return \{ kind: "cron" \}/);
  assert.match(ingest, /scope: "job-source-ingest"/);
  assert.match(ingest, /return \{ kind: "cron" \}/);
  assert.match(sms, /scope: "payment-sms-ingest"/);
  assert.match(sms, /tokenMatches\(token, String\(device\.tokenHash\)\)/);
});


test("pg_net schema and outbound HTTP functions are private to server roles", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const migration = readFileSync(resolve(root, "supabase/migrations/20261106110000_lockdown_pg_net_client_execution.sql"), "utf8");
  const workflow = readFileSync(resolve(root, ".github/workflows/jobly-security-core.yml"), "utf8");
  const smoke = readFileSync(resolve(root, "scripts/jobly-security-core-migration-smoke.sql"), "utf8");
  assert.match(migration, /revoke all privileges on schema net from public, anon, authenticated/i);
  assert.match(migration, /revoke execute on all functions in schema net from public, anon, authenticated/i);
  assert.match(migration, /grant execute on all functions in schema net to service_role/i);
  assert.match(migration, /alter default privileges for role postgres in schema net\s+revoke execute/i);
  assert.match(workflow, /CREATE SCHEMA net/);
  assert.match(workflow, /lockdown_pg_net_client_execution\.sql/);
  assert.match(smoke, /has_schema_privilege\('anon', 'net', 'USAGE'\)/);
  assert.match(smoke, /has_function_privilege\('authenticated', 'net\.http_post\(text\)'/);
  assert.match(smoke, /has_function_privilege\('postgres', 'net\.http_post\(text\)'/);
});
