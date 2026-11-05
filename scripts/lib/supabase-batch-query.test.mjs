import assert from "node:assert/strict";
import test from "node:test";
import { fetchRowsByIdInBatches, SUPABASE_ID_BATCH_SIZE } from "./supabase-batch-query.mjs";

test("splits a large ID list into bounded batches and preserves all rows", async () => {
  const ids = Array.from({ length: 160 }, (_, index) => `id-${index + 1}`);
  const observed = [];
  const rows = await fetchRowsByIdInBatches(ids, async (batch) => {
    observed.push(batch);
    return { data: batch.map((id) => ({ id })), error: null };
  });

  assert.deepEqual(observed.map((batch) => batch.length), [75, 75, 10]);
  assert.ok(observed.every((batch) => batch.length <= SUPABASE_ID_BATCH_SIZE));
  assert.deepEqual(rows.map((row) => row.id), ids);
});

test("deduplicates IDs and skips empty input values", async () => {
  const observed = [];
  const rows = await fetchRowsByIdInBatches(["a", "b", "a", null, "", "c"], async (batch) => {
    observed.push(batch);
    return { data: batch.map((id) => ({ id })), error: null };
  });

  assert.deepEqual(observed, [["a", "b", "c"]]);
  assert.deepEqual(rows.map((row) => row.id), ["a", "b", "c"]);
});

test("returns an empty result without querying when there are no IDs", async () => {
  let calls = 0;
  const rows = await fetchRowsByIdInBatches([], async () => {
    calls += 1;
    return { data: [], error: null };
  });
  assert.deepEqual(rows, []);
  assert.equal(calls, 0);
});

test("propagates Supabase errors and rejects unsafe batch sizes", async () => {
  const expected = new Error("query failed");
  await assert.rejects(
    () => fetchRowsByIdInBatches(["a"], async () => ({ data: null, error: expected })),
    (error) => error === expected,
  );
  await assert.rejects(
    () => fetchRowsByIdInBatches(["a"], async () => ({ data: [] }), SUPABASE_ID_BATCH_SIZE + 1),
    RangeError,
  );
});
