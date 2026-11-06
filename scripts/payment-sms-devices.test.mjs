import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("device listing is restricted to ADMIN and FINANCE and never returns the token hash", () => {
  const route = read("../app/api/payments/sms/devices/route.ts");
  const getStart = route.indexOf("export async function GET");
  const postStart = route.indexOf("export async function POST");
  const get = route.slice(getStart, postStart);
  assert.ok(getStart >= 0 && postStart > getStart);
  assert.match(get, /getAuthUser\(request\)/);
  assert.match(get, /ensureUser\(supabase, auth\)/);
  assert.match(get, /\["ADMIN", "FINANCE"\]/);
  assert.match(get, /select\("id,label,provider,merchantAccount,senderIds,status,lastSeenAt,createdAt,revokedAt"\)/);
  assert.doesNotMatch(get, /tokenHash|deviceToken/);
});

test("device provisioning stores only a hash and returns the token once", () => {
  const route = read("../app/api/payments/sms/devices/route.ts");
  assert.match(route, /randomBytes\(32\)/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /tokenHash, status: "ACTIVE"/);
  assert.match(route, /return NextResponse\.json\(\{ device, deviceToken \}/);
  assert.match(route, /PAYMENT_SMS_DEVICE_PROVISIONED/);
});

test("device revocation is role-gated and audited", () => {
  const route = read("../app/api/payments/sms/devices/[id]/route.ts");
  assert.match(route, /\["ADMIN", "FINANCE"\]/);
  assert.match(route, /status: "REVOKED"/);
  assert.match(route, /PAYMENT_SMS_DEVICE_REVOKED/);
});

test("customer verification accepts dotted Orange transaction references", () => {
  const route = read("../app/api/payments/[id]/verify/route.ts");
  assert.ok(route.includes("A-Z0-9._-"));
});
