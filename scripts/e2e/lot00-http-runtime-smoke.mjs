import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.JOBLY_LOT00_HTTP_PORT || "3197", 10);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("JOBLY_LOT00_HTTP_PORT must be a valid non-privileged TCP port.");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Public Supabase build configuration is required for the HTTP smoke.");
}

const origin = "http://" + host + ":" + port;
const child = spawn(process.execPath, [nextBin, "start", "--hostname", host, "--port", String(port)], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
let spawnError = null;
const collect = (chunk) => {
  output = (output + chunk.toString()).slice(-6000);
};
child.stdout.on("data", collect);
child.stderr.on("data", collect);
child.once("error", (error) => { spawnError = error; });
const closed = new Promise((resolveClose) => {
  child.once("close", (code, signal) => resolveClose({ code, signal }));
});

async function request(path, method) {
  return await fetch(origin + path, {
    method,
    headers: { "accept": "application/json" },
    signal: AbortSignal.timeout(5000),
  });
}

try {
  const deadline = Date.now() + 90_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) {
      throw new Error("Next.js production server exited before readiness. " + output.slice(-2500));
    }
    try {
      const probe = await request("/api/auth/profile-photo", "POST");
      if (probe.status === 401) {
        ready = true;
        break;
      }
      if (probe.status >= 500) {
        throw new Error("Profile photo guard returned HTTP " + probe.status + ". " + output.slice(-2500));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("guard returned HTTP")) throw error;
    }
    await delay(500);
  }
  assert.equal(ready, true, "Next.js production server did not become ready on the local port.");

  const cases = [
    { label: "profile-photo upload requires an authenticated session", method: "POST", path: "/api/auth/profile-photo" },
    { label: "event-media upload requires an authenticated session", method: "POST", path: "/api/events/media" },
    { label: "recruiter talent directory requires an authenticated session", method: "GET", path: "/api/recruiter/talents" },
  ];

  for (const item of cases) {
    const response = await request(item.path, item.method);
    assert.equal(response.status, 401, item.label + " (actual HTTP " + response.status + ")");
    const payload = await response.json().catch(() => null);
    assert.ok(payload && typeof payload === "object", item.label + " must return a JSON error body.");
    console.log("[PASS] " + item.label + " — HTTP 401");
  }
  console.log("LOT00_HTTP_RUNTIME=PASS; checks=" + cases.length + "; environment=local-build-only");
} finally {
  if (child.exitCode === null && !child.killed) {
    child.kill("SIGTERM");
    await Promise.race([
      closed,
      delay(5000).then(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }),
    ]);
  }
}