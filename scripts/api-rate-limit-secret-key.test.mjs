import test from "node:test";
import assert from "node:assert/strict";
import { enforceApiRateLimit } from "../lib/apiRateLimit.ts";

const request = (headers = {}) => new Request("https://jobly.example/api/recruiter/talents", { headers });

test("recruiter limiter accepts modern Supabase secret key without legacy service_role env", async () => {
  const calls = [];
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: [{ allowed: true, retry_after_seconds: 1 }], error: null };
    },
  };
  const previous = {
    modern: process.env.SUPABASE_SECRET_KEY,
    legacy: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_e2e_test_key_for_recruiter_limiter_123456";
  try {
    const result = await enforceApiRateLimit(supabase, request({ "x-forwarded-for": "203.0.113.18" }), {
      scope: "recruiter-talents",
      identity: "e2e-recruiter-fixture",
      accountWindows: [{ windowSeconds: 60, maxRequests: 60 }],
      ipWindows: [{ windowSeconds: 60, maxRequests: 120 }],
      requireIp: true,
    });
    assert.equal(result, null);
    assert.equal(calls.length, 2);
    assert.equal(calls.every((call) => call.name === "consume_api_rate_limit"), true);
    assert.match(calls[0].args.p_identity_hash, /^[0-9a-f]{64}$/);
    assert.equal(calls[0].args.p_identity_hash.includes("e2e-recruiter-fixture"), false);
  } finally {
    if (previous.modern === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previous.modern;
    if (previous.legacy === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.legacy;
  }
});
