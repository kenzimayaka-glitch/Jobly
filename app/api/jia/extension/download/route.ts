import JSZip from "jszip";
import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXTENSION_ROOT = join(process.cwd(), "apps", "jia-chrome-extension");
const EXCLUDED = new Set([".DS_Store", "Thumbs.db"]);

async function addDirectory(zip: JSZip, absolutePath: string, relativePath = ""): Promise<void> {
  const entries = await readdir(absolutePath, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name) || entry.name.startsWith(".")) continue;
    const childAbsolute = join(absolutePath, entry.name);
    const childRelative = relativePath ? relativePath + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      await addDirectory(zip, childAbsolute, childRelative);
    } else if (entry.isFile()) {
      zip.file(childRelative.split(sep).join("/"), await readFile(childAbsolute));
    }
  }
}

export async function GET() {
  try {
    const zip = new JSZip();
    await addDirectory(zip, EXTENSION_ROOT);
    const archive = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return new NextResponse(archive, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="jobly-jia-chrome-extension-0.2.0-beta.zip"',
        "Content-Length": String(archive.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Jobly J'IA extension archive generation failed", error);
    return NextResponse.json(
      { message: "Le paquet de l’extension est momentanément indisponible." },
      { status: 500 },
    );
  }
}
