import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import sharp from "sharp";
import crypto from "node:crypto";

export type ListingTheme = "OFFICIAL_CONCOURS" | "MODERNE" | "SOBRE";
export type ListingStage = "CV" | "TEST" | "INTERVIEW" | "DECISION";

export type OfficialListingCandidate = {
  applicationId: string;
  dossierNumber: string;
  firstName: string | null;
  lastName: string | null;
  displayNameOverride?: string | null;
  consented: boolean;
};

export type OfficialListingPost = {
  title: string;
  candidates: OfficialListingCandidate[];
};

export type OfficialListingData = {
  recruitmentId: string;
  versionId: string;
  versionNumber: number;
  companyName: string;
  companyLogoUrl?: string | null;
  city?: string | null;
  stage: ListingStage;
  language: "fr" | "en";
  introduction?: string | null;
  signerTitle?: string | null;
  signatureDataUrl?: string | null;
  theme: ListingTheme;
  publicUrl: string;
  qrPayload: string;
  posts: OfficialListingPost[];
  generatedAt: string;
  errata?: { number: number; summary: string; details: string }[];
};

export type JpegSize = { width: 640; height: 1280 } | { width: 2160; height: 4320 } | { width: 4320; height: 8640 };

const THEMES: Record<ListingTheme, { bg: string; ink: string; accent: string; line: string }> = {
  OFFICIAL_CONCOURS: { bg: "#FFFFFF", ink: "#172033", accent: "#22448B", line: "#D8DEE9" },
  MODERNE: { bg: "#F8FAFC", ink: "#172033", accent: "#22448B", line: "#CBD5E1" },
  SOBRE: { bg: "#FFFFFF", ink: "#202124", accent: "#374151", line: "#D1D5DB" },
};

const DEFAULT_INTRO: Record<ListingStage, { fr: string; en: string }> = {
  CV: {
    fr: "Les candidats dont les noms suivent sont retenus pour l’étape suivante, dans le cadre du recrutement au poste de :",
    en: "The candidates listed below have been selected for the next stage of the recruitment process for:",
  },
  TEST: {
    fr: "Les candidats dont les noms suivent sont retenus pour passer le test, dans le cadre du recrutement au poste de :",
    en: "The candidates listed below have been selected to take the test for:",
  },
  INTERVIEW: {
    fr: "Les candidats dont les noms suivent sont retenus pour l’entretien, dans le cadre du recrutement au poste de :",
    en: "The candidates listed below have been selected for interview for:",
  },
  DECISION: {
    fr: "Les candidats dont les noms suivent sont retenus pour l’étape finale de décision, dans le cadre du recrutement au poste de :",
    en: "The candidates listed below have reached the final decision stage for:",
  },
};

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeName(candidate: OfficialListingCandidate): string {
  if (candidate.consented) {
    const override = candidate.displayNameOverride?.trim();
    if (override) return override;
    return [candidate.firstName, candidate.lastName].filter(Boolean).join(" ").trim() || candidate.dossierNumber;
  }
  return candidate.dossierNumber;
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 70) || "listing";
}

export function immutableBlockChecksum(publicUrl: string, qrPayload: string): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    defaultText: "Propulsé par Jobly",
    publicUrl,
    qrPayload,
    logoKey: "jobly",
  })).digest("hex");
}

function namesForPost(post: OfficialListingPost): string[] {
  return [...post.candidates].sort((a, b) => safeName(a).localeCompare(safeName(b), "fr", { sensitivity: "base" })).map(safeName);
}

function flattenNames(data: OfficialListingData): string[] {
  return data.posts.flatMap(namesForPost);
}

function splitNames(names: string[], capacity: number): string[][] {
  if (names.length <= capacity) return [names];
  const pages: string[][] = [];
  for (let i = 0; i < names.length; i += capacity) pages.push(names.slice(i, i + capacity));
  return pages;
}

function svgText(x: number, y: number, text: string, size: number, weight = 400, anchor = "start", fill = "#172033"): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${size}px" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;
}

async function qrDataUrl(payload: string, width: number): Promise<string> {
  const buffer = await QRCode.toBuffer(payload, {
    type: "png",
    width,
    margin: 4,
    errorCorrectionLevel: "M",
  });
  return "data:image/png;base64," + buffer.toString("base64");
}

function fixedLayout(width: number, height: number) {
  const scale = width / 640;
  const pad = Math.round(42 * scale);
  const headerH = Math.round(180 * scale);
  const introH = Math.round(135 * scale);
  const joblyH = Math.round(210 * scale);
  const footerH = Math.round(120 * scale);
  const gap = Math.round(24 * scale);
  const namesTop = pad + headerH + introH + gap;
  const namesBottom = height - pad - footerH - joblyH - gap;
  return { scale, pad, headerH, introH, joblyH, footerH, gap, namesTop, namesBottom, namesH: Math.max(1, namesBottom - namesTop) };
}

function renderPageSvg(
  data: OfficialListingData,
  names: string[],
  width: number,
  height: number,
  pageIndex: number,
  pageCount: number,
  qr: string,
): string {
  const t = THEMES[data.theme];
  const l = fixedLayout(width, height);
  const s = l.scale;
  const titleSize = Math.round(30 * s);
  const bodySize = Math.max(13, Math.round(18 * s));
  const nameSize = Math.max(11, Math.round(22 * s));
  const lineH = Math.round(nameSize * 1.55);
  const cols = names.length > 55 ? 2 : 1;
  const colWidth = (width - 2 * l.pad) / cols;
  const rows = Math.ceil(names.length / cols);
  const minReadable = Math.max(11, Math.round(width * 0.017));
  const finalNameSize = Math.max(minReadable, Math.min(nameSize, Math.floor(l.namesH / Math.max(rows, 1) * 0.82)));
  const finalLineH = Math.round(finalNameSize * 1.45);
  const headerTitle = data.posts.length === 1 ? data.posts[0].title : "Recrutement";
  const intro = data.introduction?.trim() || DEFAULT_INTRO[data.stage][data.language];
  const city = data.city?.trim() || "Jobly";
  const dateText = new Intl.DateTimeFormat(data.language === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(data.generatedAt));
  const pageLabel = pageCount > 1 ? `${pageIndex + 1}/${pageCount}` : "";

  let namesSvg = "";
  const chunks = cols === 1 ? [names] : [names.slice(0, Math.ceil(names.length / 2)), names.slice(Math.ceil(names.length / 2))];
  chunks.forEach((chunk, c) => {
    const x = l.pad + c * colWidth;
    chunk.forEach((name, i) => {
      const y = l.namesTop + finalNameSize + i * finalLineH;
      namesSvg += svgText(x, y, `${i + 1 + (c ? chunks[0].length : 0)}. ${name}`, finalNameSize, 500, "start", t.ink);
    });
  });

  const logoText = "Jobly";
  const joblyLink = data.publicUrl.replace(/^https?:\\/\\//, "").slice(0, 52);
  const qrSize = Math.round(120 * s);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${t.bg}"/>
  <rect x="${l.pad}" y="${l.pad}" width="${width - 2*l.pad}" height="${l.headerH}" rx="${18*s}" fill="${t.accent}"/>
  ${svgText(l.pad + 24*s, l.pad + 54*s, logoText, 26*s, 700, "start", "#FFFFFF")}
  ${svgText(l.pad + 24*s, l.pad + 94*s, data.companyName, 26*s, 700, "start", "#FFFFFF")}
  ${svgText(l.pad + 24*s, l.pad + 135*s, headerTitle, 22*s, 500, "start", "#FFFFFF")}
  <rect x="${l.pad}" y="${l.pad + l.headerH + 18*s}" width="${width - 2*l.pad}" height="${l.introH - 20*s}" rx="${14*s}" fill="#FFFFFF" stroke="${t.line}"/>
  ${svgText(l.pad + 22*s, l.pad + l.headerH + 48*s, intro, bodySize, 400, "start", t.ink)}
  ${svgText(l.pad + 22*s, l.pad + l.headerH + 78*s, headerTitle, Math.max(18, 23*s), 700, "start", t.accent)}
  <line x1="${l.pad}" y1="${l.namesTop - 14*s}" x2="${width-l.pad}" y2="${l.namesTop - 14*s}" stroke="${t.line}"/>
  ${namesSvg}
  <rect x="${l.pad}" y="${height - l.pad - l.footerH - l.joblyH}" width="${width - 2*l.pad}" height="${l.joblyH}" rx="${18*s}" fill="#F8FAFC" stroke="${t.accent}" stroke-width="${2*s}"/>
  <image href="${qr}" x="${width-l.pad-qrSize-12*s}" y="${height-l.pad-l.footerH-l.joblyH+12*s}" width="${qrSize}" height="${qrSize}"/>
  ${svgText(l.pad + 20*s, height-l.pad-l.footerH-l.joblyH+42*s, "Propulsé par Jobly", 22*s, 700, "start", t.accent)}
  ${svgText(l.pad + 20*s, height-l.pad-l.footerH-l.joblyH+76*s, "Les détails de la suite du parcours vous seront", 15*s, 400, "start", t.ink)}
  ${svgText(l.pad + 20*s, height-l.pad-l.footerH-l.joblyH+100*s, "communiqués par mail et accessibles via votre espace Talent.", 15*s, 400, "start", t.ink)}
  ${svgText(l.pad + 20*s, height-l.pad-l.footerH-l.joblyH+132*s, joblyLink, 14*s, 600, "start", t.accent)}
  ${svgText(l.pad, height-l.pad-72*s, `Fait à ${city}, le ${dateText}`, 15*s, 400, "start", t.ink)}
  ${svgText(width-l.pad, height-l.pad-72*s, data.signerTitle || "La Direction Générale", 16*s, 700, "end", t.ink)}
  ${pageLabel ? svgText(width-l.pad, height-l.pad-42*s, pageLabel, 13*s, 500, "end", t.accent) : ""}
  </svg>`;
}

export async function renderJpeg(
  data: OfficialListingData,
  requested: JpegSize,
  namesOverride?: string[],
): Promise<{ files: { buffer: Buffer; filename: string; width: number; height: number }[]; effectiveSize: JpegSize; fallback: boolean; pages: number }> {
  const sizes: JpegSize[] = [
    { width: 640, height: 1280 },
    { width: 2160, height: 4320 },
    { width: 4320, height: 8640 },
  ];
  let effective = requested;
  let fallback = false;
  const profile = process.env.JOBLY_ENV_PROFILE || "FREE_TEST";
  const maxFreePixels = Number(process.env.JOBLY_FREE_JPEG_MAX_PIXELS || "18000000");
  if (profile === "FREE_TEST" && requested.width * requested.height > maxFreePixels) {
    effective = requested.width === 4320 ? sizes[1] : sizes[0];
    fallback = true;
  }
  const qr = await qrDataUrl(data.qrPayload, Math.max(180, Math.round(120 * effective.width / 640)));
  const names = namesOverride || flattenNames(data);
  const l = fixedLayout(effective.width, effective.height);
  const maxRowsOneColumn = Math.max(1, Math.floor(l.namesH / (Math.max(11, Math.round(22*l.scale)) * 1.45)));
  const twoColumn = Math.max(2, maxRowsOneColumn * 2);
  const capacity = names.length <= maxRowsOneColumn ? maxRowsOneColumn : twoColumn;
  const chunks = splitNames(names, capacity);
  const files = [];
  for (let i = 0; i < chunks.length; i++) {
    const svg = renderPageSvg(data, chunks[i], effective.width, effective.height, i, chunks.length, qr);
    try {
      const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toBuffer();
      files.push({
        buffer,
        filename: `${slug(data.companyName)}-${slug(data.posts[0]?.title || "listing")}-${effective.width}x${effective.height}-${i+1}-${chunks.length}.jpg`,
        width: effective.width,
        height: effective.height,
      });
    } catch (error) {
      if (effective.width === 4320) {
        const fallbackSize = sizes[1];
        return renderJpeg(data, fallbackSize, namesOverride).then(result => ({ ...result, fallback: true }));
      }
      throw error;
    }
  }
  return { files, effectiveSize: effective, fallback, pages: files.length };
}

export async function renderPdf(data: OfficialListingData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const t = THEMES[data.theme];
    const names = flattenNames(data);
    const pageCapacity = 42;
    const pages = splitNames(names, pageCapacity);
    const qrPng = await QRCode.toBuffer(data.qrPayload, { width: 110, margin: 4 });
    pages.forEach((pageNames, index) => {
      if (index > 0) doc.addPage();
      doc.fillColor(t.accent).rect(42, 42, 511, 105).fill();
      doc.fillColor("#FFFFFF").fontSize(24).font("Helvetica-Bold").text("Jobly", 62, 60);
      doc.fontSize(20).text(data.companyName, 62, 92, { width: 470 });
      doc.fillColor(t.ink).font("Helvetica").fontSize(12).moveDown(1);
      doc.text(data.introduction?.trim() || DEFAULT_INTRO[data.stage][data.language], 42, 170, { width: 511 });
      doc.font("Helvetica-Bold").fontSize(17).fillColor(t.accent).text(data.posts.length === 1 ? data.posts[0].title : "Recrutement", 42, 215);
      let y = 252;
      pageNames.forEach((name, i) => {
        doc.font("Helvetica").fontSize(12).fillColor(t.ink).text(`${i + 1}. ${name}`, 58, y);
        y += 20;
      });
      const footerY = 650;
      doc.roundedRect(42, footerY, 511, 115, 10).stroke(t.accent);
      doc.image(qrPng, 430, footerY + 10, { width: 95 });
      doc.font("Helvetica-Bold").fontSize(15).fillColor(t.accent).text("Propulsé par Jobly", 58, footerY + 18);
      doc.font("Helvetica").fontSize(9).fillColor(t.ink).text("Les détails de la suite du parcours vous seront communiqués par mail et accessibles via votre espace Talent sur Jobly.", 58, footerY + 43, { width: 350 });
      doc.fontSize(9).fillColor(t.accent).text(data.publicUrl, 58, footerY + 82, { width: 350 });
      doc.fontSize(9).fillColor(t.ink).text(`Fait à ${data.city || "Jobly"}, le ${new Intl.DateTimeFormat("fr-FR").format(new Date(data.generatedAt))}`, 42, 780);
      doc.font("Helvetica-Bold").text(data.signerTitle || "La Direction Générale", 400, 780, { width: 153, align: "right" });
      if (pages.length > 1) doc.font("Helvetica").fontSize(8).text(`${index + 1}/${pages.length}`, 510, 795);
    });
    doc.end();
  });
}

export async function renderXlsx(data: OfficialListingData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Jobly";
  workbook.created = new Date(data.generatedAt);
  const summary = workbook.addWorksheet("Récapitulatif");
  summary.columns = [{ header: "Poste", key: "post", width: 42 }, { header: "Candidats", key: "count", width: 14 }];
  for (const post of data.posts) summary.addRow({ post: post.title, count: post.candidates.length });
  summary.addRow({ post: "Document officiel", count: 1 });
  for (const post of data.posts) {
    const ws = workbook.addWorksheet(post.title.slice(0, 31) || "Poste");
    ws.columns = [{ header: "N°", key: "n", width: 8 }, { header: "Nom et Prénom", key: "name", width: 46 }, { header: "Dossier", key: "dossier", width: 24 }];
    namesForPost(post).forEach((name, i) => ws.addRow({ n: i + 1, name, dossier: post.candidates[i]?.dossierNumber || "" }));
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: "A1", to: "C1" };
    ws.protect("JOBLY_OFFICIAL_LISTING", { selectLockedCells: true, selectUnlockedCells: true });
  }
  for (const ws of workbook.worksheets) {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22448B" } };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function renderWebHtml(data: OfficialListingData): string {
  const t = THEMES[data.theme];
  const sections = data.posts.map(post => {
    const names = namesForPost(post);
    return `<section><h2>${esc(post.title)}</h2><ol>${names.map(n => `<li>${esc(n)}</li>`).join("")}</ol></section>`;
  }).join("");
  return `<!doctype html><html lang="${data.language}"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.companyName)} — Listing officiel Jobly</title><style>:root{--accent:${t.accent};--ink:${t.ink};--line:${t.line}}body{margin:0;background:${t.bg};font-family:Arial,sans-serif;color:var(--ink)}main{max-width:820px;margin:auto;padding:24px}header{background:var(--accent);color:#fff;padding:28px;border-radius:18px}section{margin-top:24px;padding:20px;border:1px solid var(--line);border-radius:14px;background:#fff}li{padding:6px 0}.jobly{margin-top:28px;padding:22px;border:2px solid var(--accent);border-radius:16px}.jobly strong{color:var(--accent)}button,a.btn{display:inline-block;padding:12px 16px;border-radius:10px;border:0;background:var(--accent);color:#fff;text-decoration:none}</style></head><body><main><header><strong>Jobly</strong><h1>${esc(data.companyName)}</h1><p>${esc(data.posts.map(p=>p.title).join(" · "))}</p></header><p>${esc(data.introduction?.trim() || DEFAULT_INTRO[data.stage][data.language])}</p>${sections}<div class="jobly"><strong>Propulsé par Jobly</strong><p>Les détails de la suite du parcours vous seront communiqués par mail et accessibles via votre espace Talent sur Jobly.</p><p><a class="btn" href="${esc(data.publicUrl)}">Ouvrir Jobly</a></p></div><footer><p>Fait à ${esc(data.city || "Jobly")}, le ${esc(new Intl.DateTimeFormat(data.language === "fr" ? "fr-FR" : "en-US").format(new Date(data.generatedAt)))}</p><strong>${esc(data.signerTitle || "La Direction Générale")}</strong></footer></main></body></html>`;
}

export function checksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function exportFilename(data: OfficialListingData, format: string, suffix = ""): string {
  return `${slug(data.companyName)}-${slug(data.posts[0]?.title || "listing")}-v${data.versionNumber}-${data.stage.toLowerCase()}${suffix}.${format.toLowerCase()}`;
}
