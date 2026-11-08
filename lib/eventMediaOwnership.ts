const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_MEDIA_EXTENSIONS = new Set(["jpg", "png", "webp", "gif", "pdf", "mp4"]);

/**
 * Event upload paths are generated server-side as <Supabase Auth UID>/<UUID>.<ext>.
 * Requiring that exact shape prevents one user from attaching or deleting another
 * user's object, and rejects traversal or nested paths.
 */
export function isOwnedEventMediaPath(path: unknown, authUserId: string): path is string {
  if (typeof path !== "string" || !authUserId || path.includes("\\") || path.includes("\0")) return false;
  const parts = path.split("/");
  if (parts.length !== 2 || parts[0] !== authUserId) return false;
  const filename = parts[1];
  const separator = filename.lastIndexOf(".");
  if (separator <= 0) return false;
  const id = filename.slice(0, separator);
  const extension = filename.slice(separator + 1).toLowerCase();
  return UUID_PATTERN.test(id) && EVENT_MEDIA_EXTENSIONS.has(extension);
}
