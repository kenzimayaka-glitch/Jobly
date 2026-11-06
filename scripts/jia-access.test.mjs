import assert from "node:assert/strict";
import test from "node:test";
import { getJiaAvailableEcosystems } from "../lib/jia/access.ts";

function mockDb(records = {}) {
  return {
    from(table) {
      let column = null;
      let value = null;
      const query = {
        select() { return query; },
        eq(key, current) { column = key; value = current; return query; },
        limit() { return query; },
        maybeSingle() {
          const rows = records[table] || [];
          const row = rows.find((item) => !column || item[column] === value) || null;
          return Promise.resolve({ data: row, error: null });
        },
      };
      return query;
    },
  };
}

test("Talent receives only Talent unless another server-side membership exists", async () => {
  assert.deepEqual(
    await getJiaAvailableEcosystems(mockDb(), { id: "internal-talent", role: "TALENT" }, "auth-talent"),
    ["TALENT"],
  );
});

test("Recruiter membership is matched by Supabase auth identity or owned recruiter jobs", async () => {
  const profileAccess = await getJiaAvailableEcosystems(
    mockDb({ RecruiterProfile: [{ id: "rp-1", userId: "auth-recruiter" }] }),
    { id: "internal-recruiter", role: "TALENT" },
    "auth-recruiter",
  );
  assert.deepEqual(profileAccess, ["TALENT", "RECRUITER"]);

  const jobAccess = await getJiaAvailableEcosystems(
    mockDb({ RecruiterJob: [{ id: "job-1", recruiterUserId: "internal-recruiter" }] }),
    { id: "internal-recruiter", role: "TALENT" },
    "auth-recruiter",
  );
  assert.deepEqual(jobAccess, ["TALENT", "RECRUITER"]);
});

test("Partner membership is matched against internal Jobly user identity", async () => {
  const allowed = await getJiaAvailableEcosystems(
    mockDb({ MobilityServiceProvider: [{ id: "provider-1", userId: "internal-partner" }] }),
    { id: "internal-partner", role: "TALENT" },
    "auth-partner",
  );
  assert.deepEqual(allowed, ["TALENT", "PARTNER"]);
});

test("Admin membership is isolated and does not query or inherit operational role scopes", async () => {
  const calls = [];
  const db = { from(table) { calls.push(table); throw new Error("Admin access must not query role tables."); } };
  assert.deepEqual(await getJiaAvailableEcosystems(db, { id: "admin-1", role: "ADMIN" }, "auth-admin"), ["ADMIN"]);
  assert.deepEqual(calls, []);
});
