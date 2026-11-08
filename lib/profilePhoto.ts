export const PROFILE_PHOTO_BUCKET_MAX_BYTES = 5_000_000;
export const PROFILE_PHOTO_MAX_INPUT_BYTES = PROFILE_PHOTO_BUCKET_MAX_BYTES;
export const PROFILE_HERO_MAX_INPUT_BYTES = 10 * 1024 * 1024;

const PHOTO_FORMATS: Record<string, { mimeType: string; extension: string }> = {
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
  gif: { mimeType: "image/gif", extension: "gif" },
  avif: { mimeType: "image/avif", extension: "avif" },
};

export function getProfilePhotoFormat(format: string | undefined, compression?: string) {
  // Sharp identifies the HEIF container separately from the AV1 codec used by AVIF.
  if (format === "heif") return compression === "av1" ? PHOTO_FORMATS.avif : null;
  return format ? PHOTO_FORMATS[format] ?? null : null;
}
