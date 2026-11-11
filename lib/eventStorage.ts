export const JOBLY_EVENTS_BUCKET = "jobly-events";

export function eventStoragePathFromPublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const marker = `/storage/v1/object/public/${JOBLY_EVENTS_BUCKET}/`;
  const index = value.indexOf(marker);
  if (index < 0) return null;
  const rawPath = value.slice(index + marker.length).split("?")[0];
  if (!rawPath || rawPath.includes("..")) return null;
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

/**
 * Event media stays in a private bucket. Only the API that has already filtered
 * the event to status=PUBLISHED may mint a short-lived read URL.
 */
export async function exposePublishedEventMedia(supabase: any, event: Record<string, any>) {
  const { mediaStoragePath, ...publicEvent } = event;
  const storagePath = typeof mediaStoragePath === "string" && mediaStoragePath
    ? mediaStoragePath
    : eventStoragePathFromPublicUrl(event.mediaUrl);

  if (!storagePath) return publicEvent;

  const { data, error } = await supabase.storage
    .from(JOBLY_EVENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  return {
    ...publicEvent,
    mediaUrl: error ? null : data?.signedUrl ?? null,
  };
}
