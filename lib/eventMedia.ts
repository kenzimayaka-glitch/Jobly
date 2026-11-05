const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const readU32 = (bytes: Uint8Array, offset: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);

const readU64 = (bytes: Uint8Array, offset: number) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const value = view.getBigUint64(offset, false);
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
};

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};

export function readMp4DurationSeconds(bytes: Uint8Array): number | null {
  const findBox = (start: number, end: number, wanted: string): { payload: number; end: number } | null => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = readU32(bytes, offset);
      const type = ascii(bytes, offset + 4, 4);
      let headerSize = 8;
      if (size === 1) {
        if (offset + 16 > end) return null;
        const extended = readU64(bytes, offset + 8);
        if (extended === null) return null;
        size = extended;
        headerSize = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < headerSize || offset + size > end) return null;
      if (type === wanted) return { payload: offset + headerSize, end: offset + size };
      offset += size;
    }
    return null;
  };

  const moov = findBox(0, bytes.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(moov.payload, moov.end, "mvhd");
  if (!mvhd || mvhd.payload + 20 > mvhd.end) return null;

  const version = bytes[mvhd.payload];
  const timescaleOffset = version === 1 ? mvhd.payload + 20 : mvhd.payload + 12;
  const durationOffset = version === 1 ? mvhd.payload + 24 : mvhd.payload + 16;
  if (version !== 0 && version !== 1) return null;
  if (timescaleOffset + 4 > mvhd.end) return null;

  const timescale = readU32(bytes, timescaleOffset);
  const duration = version === 1
    ? (durationOffset + 8 <= mvhd.end ? readU64(bytes, durationOffset) : null)
    : (durationOffset + 4 <= mvhd.end ? readU32(bytes, durationOffset) : null);
  if (!timescale || duration === null || duration === 0) return null;
  const seconds = duration / timescale;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function inspectEventMedia(bytes: Uint8Array, declaredMimeType: string) {
  let actualMimeType: string | null = null;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) actualMimeType = "image/jpeg";
  else if (bytes.length >= 8 && ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") actualMimeType = "image/png";
  else if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") actualMimeType = "image/webp";
  else if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) actualMimeType = "image/gif";
  else if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") actualMimeType = "application/pdf";
  else if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") actualMimeType = "video/mp4";

  const mimeType = declaredMimeType.trim().toLowerCase();
  if (!actualMimeType || actualMimeType !== mimeType || !MIME_EXTENSIONS[mimeType]) {
    return { ok: false as const, error: "Format média non supporté ou type MIME incohérent." };
  }

  const durationSeconds = mimeType === "video/mp4" ? readMp4DurationSeconds(bytes) : null;
  if (mimeType === "video/mp4" && durationSeconds === null) {
    return { ok: false as const, error: "Durée vidéo MP4 impossible à vérifier." };
  }
  const type = mimeType === "application/pdf" ? "FLYER" : mimeType.startsWith("video/") ? "VIDEO" : "IMAGE";
  return { ok: true as const, mimeType, extension: MIME_EXTENSIONS[mimeType], type, durationSeconds };
}
