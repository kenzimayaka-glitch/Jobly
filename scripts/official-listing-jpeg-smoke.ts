import sharp from "sharp";
import crypto from "node:crypto";
import { renderJpeg, type OfficialListingData } from "../lib/recruitment360/officialListing";

const counts = [5, 40, 120, 400];

function fixture(count: number): OfficialListingData {
  return {
    recruitmentId: "00000000-0000-0000-0000-000000000001",
    versionId: "00000000-0000-0000-0000-000000000002",
    versionNumber: 1,
    companyName: "JOBLY TEST ORGANISATION",
    city: "Yaoundé",
    stage: "CV",
    language: "fr",
    theme: "OFFICIAL_CONCOURS",
    publicUrl: "https://example.jobly.test/public/recruitment-listing/test-token-abcdefghijklmnopqrstuvwxyz",
    qrPayload: "https://example.jobly.test/public/recruitment-listing/test-token-abcdefghijklmnopqrstuvwxyz",
    generatedAt: "2026-10-02T00:00:00.000Z",
    signerTitle: "La Direction Générale",
    posts: [{
      title: "Business Development Manager",
      candidates: Array.from({ length: count }, (_, i) => ({
        applicationId: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        dossierNumber: `JOB-${String(i + 1).padStart(8, "0")}`,
        firstName: `Candidat${i + 1}`,
        lastName: `Nom${i + 1}`,
        consented: true,
      })),
    }],
  };
}

async function inspect(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) throw new Error("JPEG dimensions missing");
  if (meta.format !== "jpeg") throw new Error("Not a JPEG");
  return { width: meta.width, height: meta.height };
}

function hash(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function cropHash(buffer: Buffer, top: number, bottom: number, width: number) {
  const image = sharp(buffer);
  const h = Math.max(1, bottom - top);
  const raw = await image.extract({ left: 0, top, width, height: h }).raw().toBuffer();
  return hash(raw);
}

async function qrScan(buffer: Buffer) {
  // @ts-ignore — jsqr is installed only for the smoke run.\n  const mod: any = await import("jsqr");
  const jsqr = mod.default || mod;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsqr(new Uint8ClampedArray(data), info.width, info.height);
  if (!decoded?.data?.includes("example.jobly.test/public/recruitment-listing/test-token")) {
    throw new Error("QR code could not be decoded at 640x1280");
  }
}

async function main() {
  process.env.JOBLY_ENV_PROFILE = "PRODUCTION";
  for (const size of [
    { width: 640 as const, height: 1280 as const },
    { width: 2160 as const, height: 4320 as const },
    { width: 4320 as const, height: 8640 as const },
  ]) {
    const result = await renderJpeg(fixture(5), size);
    if (result.effectiveSize.width !== size.width || result.effectiveSize.height !== size.height) {
      throw new Error(`Exact size failed for ${size.width}x${size.height}`);
    }
    const dims = await inspect(result.files[0].buffer);
    if (dims.width !== size.width || dims.height !== size.height) throw new Error("Rendered dimensions differ from target");
    console.log(`PASS exact dimensions ${size.width}x${size.height}`);
    if (size.width === 640) await qrScan(result.files[0].buffer);
  }

  for (const count of counts) {
    const result = await renderJpeg(fixture(count), { width: 640, height: 1280 });
    if (!result.files.length) throw new Error(`No files for ${count} names`);
    for (const file of result.files) {
      const dims = await inspect(file.buffer);
      if (dims.width !== 640 || dims.height !== 1280) throw new Error(`Wrong dimensions for ${count} names`);
    }
    if (count >= 40 && result.files.length < 2) throw new Error(`Expected adaptive split for ${count} names`);
    console.log(`PASS cascade ${count} names -> ${result.files.length} image(s)`);
  }

  const many = await renderJpeg(fixture(400), { width: 640, height: 1280 });
  if (many.files.length > 1) {
    const a = many.files[0].buffer;
    const b = many.files[1].buffer;
    const topA = await cropHash(a, 0, 220, 640);
    const topB = await cropHash(b, 0, 220, 640);
    const bottomA = await cropHash(a, 930, 1170, 640);
    const bottomB = await cropHash(b, 930, 1170, 640);
    if (topA !== topB || bottomA !== bottomB) throw new Error("Fixed blocks differ between split images");
    console.log("PASS fixed blocks identical across split images");
  }

  process.env.JOBLY_ENV_PROFILE = "FREE_TEST";
  process.env.JOBLY_FREE_JPEG_MAX_PIXELS = "1000000";
  const fallback = await renderJpeg(fixture(5), { width: 4320, height: 8640 });
  if (!fallback.fallback || fallback.effectiveSize.width !== 2160 || fallback.effectiveSize.height !== 4320) {
    throw new Error("FREE_TEST 8K fallback failed");
  }
  console.log("PASS FREE_TEST 8K fallback -> 2160x4320");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
