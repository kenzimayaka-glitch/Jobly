import { resolveEffectivePublicationDate as resolveSharedPublicationDate } from "../_shared/job-freshness.ts";

export type PublicationExtraction = {
  value: string | null;
  method: "jsonld" | "meta" | "text" | "none";
};

type DateFormat = "dmy" | "mdy" | "french" | "english";
type DateAdapter = { pattern: RegExp; format: DateFormat };

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, février: 2, fevrier: 2, févr: 2, fevr: 2, mars: 3,
  avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7, août: 8, aout: 8,
  septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11,
  décembre: 12, decembre: 12, déc: 12, dec: 12,
};

function toIso(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function toDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function cleanHtml(html: string): string {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string, format: DateFormat): string | null {
  const raw = value.trim();
  if (format === "dmy" || format === "mdy") {
    const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](20\d{2})$/);
    if (!match) return null;
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    return format === "dmy" ? toIso(year, second, first) : toIso(year, first, second);
  }
  if (format === "french") {
    const match = raw.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(20\d{2})$/i);
    if (!match) return null;
    const month = FRENCH_MONTHS[match[2].replace(/\.$/, "").toLocaleLowerCase("fr").normalize("NFC")];
    return month ? toIso(Number(match[3]), month, Number(match[1])) : null;
  }
  const monthFirst = raw.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})$/i);
  const dayFirst = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(20\d{2})$/i);
  const monthName = monthFirst?.[1] || dayFirst?.[2];
  const day = Number(monthFirst?.[2] || dayFirst?.[1]);
  const year = Number(monthFirst?.[3] || dayFirst?.[3]);
  if (!monthName || !Number.isInteger(day) || !Number.isInteger(year)) return null;
  const monthDate = new Date(monthName + " 1, " + year);
  if (!Number.isFinite(monthDate.getTime())) return null;
  return toIso(year, monthDate.getMonth() + 1, day);
}

function findJsonLdPublicationDate(html: string): string | null {
  const scriptPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptPattern.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      const visit = (value: unknown): string | null => {
        if (!value || typeof value !== "object") return null;
        const node = value as Record<string, unknown>;
        const type = node["@type"];
        const isJobPosting = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
        if (isJobPosting) {
          const date = toDate(String(node.datePosted || node.datePublished || ""));
          if (date) return date;
        }
        if (Array.isArray(node["@graph"])) {
          for (const child of node["@graph"]) {
            const date = visit(child);
            if (date) return date;
          }
        }
        return null;
      };
      for (const root of roots) {
        const date = visit(root);
        if (date) return date;
      }
    } catch {
      // Continue with meta and source-specific extraction.
    }
  }
  return null;
}

function findMetaPublicationDate(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const accepted = new Set(["article:published_time", "datepublished", "date", "dc.date", "publishdate", "dateposted"]);
  for (const tag of tags) {
    const name = tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (name && content && accepted.has(name)) {
      const date = toDate(content);
      if (date) return date;
    }
  }
  return null;
}

const SOURCE_ADAPTERS: Record<string, DateAdapter[]> = {
  infosconcourseducation: [
    { pattern: /publication\s*[:\-]\s*(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+20\d{2})/i, format: "french" },
    { pattern: /publi[ée]\s+le\s*[:\-]?\s*(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+20\d{2})/i, format: "french" },
  ],
  jobinfocamer: [
    { pattern: /date\s+(?:de\s+)?publication\s*[:\-]?\s*(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+20\d{2})/i, format: "french" },
    { pattern: /(\d{1,2}\s+(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+20\d{2})\s+[^\n]{0,100}(?:Nouveau|CDD|CDI|STAGE)/i, format: "french" },
  ],
  emplois_cameroun: [
    { pattern: /(\d{1,2}\/\d{1,2}\/20\d{2})/i, format: "dmy" },
  ],
  jobincamer: [
    { pattern: /(?:publi[ée]|post[ée]|date(?:\s+de)?\s+publication)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
  ],
  jobivoire_ci: [
    { pattern: /(?:date(?:\s+de)?\s+publication|publi[ée]|post[ée])\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
  ],
  ajirika_east: [
    { pattern: /(?:date\s+posted|posted\s+on|date\s+published)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+20\d{2})/i, format: "english" },
  ],
  brightermonday_ke: [
    { pattern: /(?:posted\s+on|date\s+opened|date\s+posted)\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/20\d{2})/i, format: "mdy" },
  ],
  unjobnet: [
    { pattern: /(?:date\s+posted|posted)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
  ],
  goafricajobs: [
    { pattern: /(?:date\s+posted|published|publi[ée])\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
  ],
  ajar_cd: [
    { pattern: /(?:date\s+publication|publi[ée]|posted)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
  ],
  educarriere_ci: [
    { pattern: /(?:publi[ée]\s+le|publication)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" }
  ],
  nelex_ng: [
    { pattern: /(?:date\s+posted|posted\s+on)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+20\d{2})/i, format: "english" },
  ],
  beta_mauritania: [
    { pattern: /offre\s+en\s+ligne\s+depuis\s*[:\-]?\s*(\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+20\d{2})/i, format: "french" },
  ],
  anpetogo: [
    { pattern: /publi[ée]e?\s+le\s*[:\-]?\s*(\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+20\d{2})/i, format: "french" },
  ],
};

export function extractSourcePublishedAt(html: string, _url: string, sourceKey: string): string | null {
  const jsonLdDate = findJsonLdPublicationDate(html);
  if (jsonLdDate) return jsonLdDate;
  const metaDate = findMetaPublicationDate(html);
  if (metaDate) return metaDate;
  const text = cleanHtml(html);
  for (const adapter of SOURCE_ADAPTERS[sourceKey] || []) {
    const date = parseDate(text.match(adapter.pattern)?.[1] || "", adapter.format);
    if (date) return date;
  }
  return null;
}


const SOURCE_DEADLINE_ADAPTERS: Record<string, DateAdapter[]> = {
  nelex_ng: [
    { pattern: /(?:application\s+(?:closing\s+)?deadline|application\s+closing\s+date|closing\s+date|deadline)\s*[:\-]?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+20\d{2})/i, format: "english" },
    { pattern: /(?:application\s+(?:closing\s+)?deadline|application\s+closing\s+date|closing\s+date|deadline)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+20\d{2})/i, format: "english" },
  ],
  anpetogo: [
    { pattern: /date limite (?:de dépôt(?: des| de)? dossiers?(?: de candidature)?|de candidature)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+20\d{2})/i, format: "french" },
    { pattern: /date limite\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
  ],
  anpe_ne: [
    { pattern: /date de clôture\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
    { pattern: /date limite de candidature\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})/i, format: "dmy" },
  ],
  south_africa_gov_jobs: [
    { pattern: /closing date\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i, format: "english" },
  ],
  hrjobs_liberia: [
    { pattern: /(?:apply by|deadline)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+20\d{2})/i, format: "english" },
  ],
};

function findJsonLdDeadline(html: string): string | null {
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      const visit = (value: unknown): string | null => {
        if (!value || typeof value !== "object") return null;
        const node = value as Record<string, unknown>;
        const date = toDate(String(node.validThrough || node.expirationDate || ""));
        if (date) return date;
        if (Array.isArray(node["@graph"])) {
          for (const child of node["@graph"]) {
            const nested = visit(child);
            if (nested) return nested;
          }
        }
        return null;
      };
      for (const root of roots) {
        const date = visit(root);
        if (date) return date;
      }
    } catch {
      // Continue with metadata and source-specific text.
    }
  }
  return null;
}

function findMetaDeadline(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const accepted = new Set(["validthrough", "expirationdate", "deadline", "datedeadline", "article:expiration_time"]);
  for (const tag of tags) {
    const name = tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const value = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (name && value && accepted.has(name)) {
      const date = toDate(value);
      if (date) return date;
    }
  }
  return null;
}

export function extractSourceDeadline(html: string, _url: string, sourceKey: string): string | null {
  const jsonLdDate = findJsonLdDeadline(html);
  if (jsonLdDate) return jsonLdDate;
  const metaDate = findMetaDeadline(html);
  if (metaDate) return metaDate;
  const text = cleanHtml(html);
  for (const adapter of SOURCE_DEADLINE_ADAPTERS[sourceKey] || []) {
    const date = parseDate(text.match(adapter.pattern)?.[1] || "", adapter.format);
    if (date) return date;
  }
  return null;
}

export function resolveEffectivePublicationDate(input: {
  sourcePublishedAt: string | null;
  firstHarvestAt: string | null;
  createdAt: string;
  deadline: string | null;
  now?: string;
}) {
  return resolveSharedPublicationDate(input);
}
