/**
 * Fetch Supabase rows by ID without building oversized PostgREST "in" URLs.
 * Keep each ID list small enough to stay comfortably below proxy/header limits.
 */
export const SUPABASE_ID_BATCH_SIZE = 75;

export async function fetchRowsByIdInBatches(ids, loadBatch, batchSize = SUPABASE_ID_BATCH_SIZE) {
  if (!Array.isArray(ids)) throw new TypeError("ids must be an array");
  if (typeof loadBatch !== "function") throw new TypeError("loadBatch must be a function");
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > SUPABASE_ID_BATCH_SIZE) {
    throw new RangeError(`batchSize must be an integer between 1 and ${SUPABASE_ID_BATCH_SIZE}`);
  }

  const uniqueIds = [...new Set(ids.filter((id) => id !== null && id !== undefined && String(id).trim() !== ""))];
  const rows = [];

  for (let offset = 0; offset < uniqueIds.length; offset += batchSize) {
    const batch = uniqueIds.slice(offset, offset + batchSize);
    const result = await loadBatch(batch);
    if (result?.error) throw result.error;
    if (Array.isArray(result?.data)) rows.push(...result.data);
  }

  return rows;
}
